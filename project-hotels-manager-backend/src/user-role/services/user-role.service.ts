import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole, UserRoleDocument } from '../schemas/user-role.entity';
import { CreateUserRoleDto } from '../dto/create-user-role.dto';
import { Role, RoleDocument, RoleLevel } from '../../role/schemas/role.schema';
import { UserType } from '../../base-entities/enums/user-type.enum';

/** Options de résolution des rôles d'un utilisateur. */
export interface UserRoleScope {
  userType?: UserType;
  /** Inclut les rôles limités à cet établissement en plus des rôles globaux. */
  propertyId?: string;
}

/** Rôle assigné, avec le rôle résolu. */
export interface ResolvedUserRole {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  user_type: UserType;
  property_id?: Types.ObjectId | null;
  expires_at?: Date | null;
  role: {
    _id: Types.ObjectId;
    name: string;
    code: string;
    permissions: string[];
    role_level?: number;
  };
}

/** Rôles et permissions calculés depuis les assignations actives. */
export interface UserAccess {
  roleCodes: string[];
  permissions: string[];
}

/** Assignation brute (lean) avec le rôle peuplé. */
interface PopulatedAssignment {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  user_type: UserType;
  property_id?: Types.ObjectId | null;
  expires_at?: Date | null;
  role_id: {
    _id: Types.ObjectId;
    name: string;
    code: string;
    permissions?: string[];
    role_level?: number;
    is_active?: boolean;
  } | null;
}

/** Auteur d'une assignation. */
export interface RoleAssigner {
  id: string;
  user_type?: UserType;
  /**
   * Seul un super administrateur peut assigner des rôles de niveau système ou
   * administration (évite l'élévation de privilèges).
   */
  is_super_admin?: boolean;
}

/**
 * Gestion des rôles assignés aux utilisateurs et résolution des permissions.
 *
 * Les permissions sont l'union des permissions des rôles actifs et non
 * expirés de l'utilisateur. Formats supportés : `resource:action`,
 * `resource:*` et `*`.
 */
@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(
    @InjectModel(UserRole.name)
    private readonly userRoleModel: Model<UserRoleDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  /**
   * Assigne un rôle à un utilisateur.
   * Réactive une assignation inactive/expirée existante ; lève une 409 si
   * l'assignation est déjà active.
   */
  async assignRole(
    dto: CreateUserRoleDto,
    assignedBy?: RoleAssigner,
  ): Promise<UserRoleDocument> {
    const role = await this.roleModel.findById(dto.role_id).exec();
    if (!role) {
      throw new NotFoundException(`Rôle introuvable (id: ${dto.role_id})`);
    }
    if (!role.is_active) {
      throw new BadRequestException("Impossible d'assigner un rôle inactif");
    }
    if (
      assignedBy &&
      !assignedBy.is_super_admin &&
      (role.role_level <= RoleLevel.ADMIN || role.code === 'super_admin')
    ) {
      throw new ForbiddenException(
        'Seul un super administrateur peut assigner ce rôle',
      );
    }

    const expiresAt = dto.expires_at ? new Date(dto.expires_at) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("La date d'expiration doit être future");
    }

    const filter = {
      user_id: new Types.ObjectId(dto.user_id),
      user_type: dto.user_type,
      role_id: new Types.ObjectId(dto.role_id),
      property_id: dto.property_id ? new Types.ObjectId(dto.property_id) : null,
    };

    const existing = await this.userRoleModel.findOne(filter).exec();
    if (existing) {
      if (existing.is_active && !this.isExpired(existing.expires_at)) {
        throw new ConflictException(
          'Ce rôle est déjà assigné à cet utilisateur',
        );
      }
      existing.is_active = true;
      existing.expires_at = expiresAt;
      this.applyAssigner(existing, assignedBy);
      return existing.save();
    }

    const assignment = new this.userRoleModel({
      ...filter,
      expires_at: expiresAt,
      is_active: true,
    });
    this.applyAssigner(assignment, assignedBy);
    return assignment.save();
  }

  /**
   * Assigne un rôle par son code (ex. `guest` à l'inscription).
   * Ne lève pas d'erreur si le rôle n'existe pas encore : renvoie `null`.
   */
  async assignRoleByCode(
    userId: string,
    userType: UserType,
    roleCode: string,
  ): Promise<UserRoleDocument | null> {
    const role = await this.roleModel
      .findOne({ code: roleCode, is_active: true })
      .exec();
    if (!role) {
      this.logger.warn(
        `Rôle "${roleCode}" introuvable : aucune assignation pour l'utilisateur ${userId}`,
      );
      return null;
    }
    try {
      return await this.assignRole({
        user_id: userId,
        user_type: userType,
        role_id: role._id.toString(),
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        return null;
      }
      throw error;
    }
  }

  /** Retire un rôle à un utilisateur (optionnellement pour un établissement). */
  async removeRole(
    userId: string,
    roleId: string,
    userType?: UserType,
    propertyId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      user_id: new Types.ObjectId(userId),
      role_id: new Types.ObjectId(roleId),
      property_id: propertyId ? new Types.ObjectId(propertyId) : null,
    };
    if (userType) {
      filter.user_type = userType;
    }
    const result = await this.userRoleModel.deleteOne(filter).exec();
    if (!result.deletedCount) {
      throw new NotFoundException('Assignation de rôle introuvable');
    }
  }

  /** Supprime une assignation par son identifiant. */
  async removeById(id: string): Promise<void> {
    const result = await this.userRoleModel.deleteOne({ _id: id }).exec();
    if (!result.deletedCount) {
      throw new NotFoundException('Assignation de rôle introuvable');
    }
  }

  /**
   * Rôles actifs et non expirés d'un utilisateur (rôles globaux + rôles de
   * l'établissement demandé). Les rôles désactivés sont ignorés.
   */
  async getUserRoles(
    userId: string,
    scope: UserRoleScope = {},
  ): Promise<ResolvedUserRole[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    const filter: Record<string, unknown> = {
      user_id: new Types.ObjectId(userId),
      is_active: true,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    };
    if (scope.userType) {
      filter.user_type = scope.userType;
    }
    filter.property_id = scope.propertyId
      ? { $in: [null, new Types.ObjectId(scope.propertyId)] }
      : null;

    const assignments = await this.userRoleModel
      .find(filter)
      .populate({ path: 'role_id', model: Role.name })
      .lean<PopulatedAssignment[]>()
      .exec();

    const resolved: ResolvedUserRole[] = [];
    for (const assignment of assignments) {
      const role = assignment.role_id;
      if (!role || typeof role !== 'object' || !role.code || !role.is_active) {
        continue;
      }
      resolved.push({
        _id: assignment._id,
        user_id: assignment.user_id,
        user_type: assignment.user_type,
        property_id: assignment.property_id ?? null,
        expires_at: assignment.expires_at ?? null,
        role: {
          _id: role._id,
          name: role.name,
          code: role.code,
          permissions: Array.isArray(role.permissions) ? role.permissions : [],
          role_level: role.role_level,
        },
      });
    }
    return resolved;
  }

  /** Codes des rôles de l'utilisateur (dédoublonnés). */
  async getUserRoleCodes(
    userId: string,
    scope: UserRoleScope = {},
  ): Promise<string[]> {
    const roles = await this.getUserRoles(userId, scope);
    return [...new Set(roles.map((r) => r.role.code))];
  }

  /** Union des permissions de tous les rôles de l'utilisateur. */
  async getUserPermissions(
    userId: string,
    scope: UserRoleScope = {},
  ): Promise<string[]> {
    const roles = await this.getUserRoles(userId, scope);
    const permissions = new Set<string>();
    roles.forEach((r) => r.role.permissions.forEach((p) => permissions.add(p)));
    return [...permissions].sort();
  }

  /** Résout rôles et permissions en une seule lecture pour les gardes. */
  async getUserAccess(
    userId: string,
    scope: UserRoleScope = {},
  ): Promise<UserAccess> {
    const roles = await this.getUserRoles(userId, scope);
    const permissions = new Set<string>();
    roles.forEach((resolved) =>
      resolved.role.permissions.forEach((permission) =>
        permissions.add(permission),
      ),
    );
    return {
      roleCodes: [...new Set(roles.map((resolved) => resolved.role.code))],
      permissions: [...permissions].sort(),
    };
  }

  /** Vérifie si l'utilisateur possède une permission (avec jokers). */
  async hasPermission(
    userId: string,
    permission: string,
    scope: UserRoleScope = {},
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, scope);
    return UserRoleService.matchPermission(permissions, permission);
  }

  /**
   * Teste une permission requise contre une liste de permissions accordées.
   * `*` accorde tout, `resource:*` accorde toutes les actions de la ressource.
   */
  static matchPermission(granted: string[], required: string): boolean {
    if (granted.includes('*') || granted.includes(required)) {
      return true;
    }
    const [resource] = required.split(':');
    return granted.includes(`${resource}:*`);
  }

  private isExpired(expiresAt?: Date | null): boolean {
    return !!expiresAt && expiresAt.getTime() <= Date.now();
  }

  private applyAssigner(
    assignment: UserRoleDocument,
    assignedBy?: RoleAssigner,
  ): void {
    if (assignedBy && Types.ObjectId.isValid(assignedBy.id)) {
      assignment.assigned_by = new Types.ObjectId(assignedBy.id);
      assignment.assigned_by_type = assignedBy.user_type;
    }
  }
}
