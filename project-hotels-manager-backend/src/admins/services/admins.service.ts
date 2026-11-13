import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isIP } from 'net';
import { Model, QueryFilter, UpdateQuery } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  AdminStatus,
  SuperAdmin,
  SuperAdminDocument,
} from '../schemas/admin.entity';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';

/** Nombre de tours de sel bcrypt utilisés pour hasher les mots de passe. */
const SALT_ROUNDS = 10;

/**
 * Service de gestion des super administrateurs.
 *
 * Étend le CRUD générique et ajoute : création avec hash du mot de passe,
 * recherche, activation/désactivation, suspension/réactivation, changement de
 * mot de passe, gestion du niveau d'accès et de la liste blanche d'IP.
 *
 * Le hash du mot de passe (`password_hash`, `select: false`) n'est jamais
 * renvoyé par ce service.
 */
@Injectable()
export class AdminsService extends BaseCrudService<
  SuperAdmin,
  CreateAdminDto,
  UpdateAdminDto
> {
  constructor(
    @InjectModel(SuperAdmin.name)
    protected readonly adminModel: Model<SuperAdminDocument>,
  ) {
    super(adminModel, SuperAdmin.name);
  }

  /** Crée un super administrateur en hashant son mot de passe. */
  async create(createAdminDto: CreateAdminDto): Promise<SuperAdmin> {
    const { password, ...rest } = createAdminDto;
    const email = rest.email.toLowerCase().trim();
    await this.ensureEmailAvailable(email);

    const admin = new this.adminModel({
      ...rest,
      email,
      alert_email: rest.alert_email ?? email,
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      password_changed_at: new Date(),
    });

    const saved = await admin.save();
    return this.sanitize(saved as unknown as SuperAdmin);
  }

  /** Liste paginée, avec recherche libre optionnelle (`?search=`). */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<SuperAdmin> = {},
  ): Promise<PaginatedResult<SuperAdmin>> {
    const searchFilter = query.search
      ? this.buildSearchFilter(query.search)
      : {};
    return super.findAll(query, {
      ...filter,
      ...searchFilter,
    } as QueryFilter<SuperAdmin>);
  }

  /** Met à jour un administrateur en vérifiant l'unicité de l'email. */
  async update(
    id: string,
    updateAdminDto: UpdateAdminDto,
  ): Promise<SuperAdmin> {
    if (updateAdminDto.email) {
      updateAdminDto.email = updateAdminDto.email.toLowerCase().trim();
      await this.ensureEmailAvailable(updateAdminDto.email, id);
    }
    return super.update(id, updateAdminDto);
  }

  /** Recherche un administrateur par email (insensible à la casse). */
  async findByEmail(email: string): Promise<SuperAdmin> {
    const admin = await this.repository.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: { $ne: true },
    } as QueryFilter<SuperAdmin>);
    if (!admin) {
      throw new NotFoundException(
        `SuperAdmin avec l'email ${email} introuvable`,
      );
    }
    return admin;
  }

  /** Recherche textuelle sur nom, prénom, email, téléphone et matricule. */
  async search(searchTerm: string): Promise<SuperAdmin[]> {
    if (!searchTerm || !searchTerm.trim()) {
      throw new BadRequestException('Le terme de recherche est requis');
    }
    return this.repository.find(
      {
        ...this.buildSearchFilter(searchTerm),
        is_deleted: { $ne: true },
      } as QueryFilter<SuperAdmin>,
      { sort: 'last_name', limit: 50 },
    );
  }

  /** Liste les administrateurs d'un département. */
  findByDepartment(
    department: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<SuperAdmin>> {
    return this.findAll(query, { department } as QueryFilter<SuperAdmin>);
  }

  /** Liste les administrateurs ayant au moins le niveau d'accès donné. */
  findByAccessLevel(
    minLevel: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<SuperAdmin>> {
    this.assertAccessLevel(minLevel);
    return this.findAll(query, {
      access_level: { $gte: minLevel },
    } as QueryFilter<SuperAdmin>);
  }

  /** Active le compte. */
  activate(id: string): Promise<SuperAdmin> {
    return this.updateOrFail(id, {
      is_active: true,
      status: AdminStatus.ACTIVE,
    });
  }

  /** Désactive le compte. */
  deactivate(id: string): Promise<SuperAdmin> {
    return this.updateOrFail(id, {
      is_active: false,
      status: AdminStatus.INACTIVE,
    });
  }

  /** Suspend un administrateur (le compte devient inactif). */
  async suspend(id: string, reason?: string): Promise<SuperAdmin> {
    const admin = await this.findOne(id);
    if (admin.status === AdminStatus.SUSPENDED) {
      throw new BadRequestException('Cet administrateur est déjà suspendu');
    }
    return this.updateOrFail(id, {
      status: AdminStatus.SUSPENDED,
      is_active: false,
      'metadata.suspension_reason': reason ?? null,
      'metadata.suspended_at': new Date(),
    } as UpdateQuery<SuperAdmin>);
  }

  /** Réactive un administrateur suspendu. */
  async reactivate(id: string): Promise<SuperAdmin> {
    const admin = await this.findOne(id);
    if (admin.status !== AdminStatus.SUSPENDED) {
      throw new BadRequestException(
        'Seul un administrateur suspendu peut être réactivé',
      );
    }
    return this.updateOrFail(id, {
      status: AdminStatus.ACTIVE,
      is_active: true,
      'metadata.suspension_reason': null,
      'metadata.reactivated_at': new Date(),
    } as UpdateQuery<SuperAdmin>);
  }

  /**
   * Change le mot de passe après vérification de l'ancien.
   * Réinitialise également le compteur d'échecs et le verrouillage.
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<SuperAdmin> {
    const admin = await this.repository.findOne(
      { _id: id, is_deleted: { $ne: true } } as QueryFilter<SuperAdmin>,
      { select: '+password_hash' },
    );
    if (!admin) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (await bcrypt.compare(newPassword, admin.password_hash)) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }

    return this.updateOrFail(id, {
      password_hash: await bcrypt.hash(newPassword, SALT_ROUNDS),
      password_changed_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
    } as UpdateQuery<SuperAdmin>);
  }

  /** Modifie le niveau d'accès (1 à 5). */
  updateAccessLevel(id: string, accessLevel: number): Promise<SuperAdmin> {
    this.assertAccessLevel(accessLevel);
    return this.updateOrFail(id, { access_level: accessLevel });
  }

  /** Remplace la liste blanche d'adresses IP autorisées (dédoublonnée). */
  updateIpWhitelist(id: string, ips: string[]): Promise<SuperAdmin> {
    const invalid = ips.filter((ip) => isIP(ip) === 0);
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Adresses IP invalides : ${invalid.join(', ')}`,
      );
    }
    return this.updateOrFail(id, { ip_whitelist: [...new Set(ips)] });
  }

  /** Vérifie si une IP est autorisée (liste vide = toutes autorisées). */
  async isIpAllowed(id: string, ip: string): Promise<{ allowed: boolean }> {
    const admin = await this.findOne(id);
    const whitelist = admin.ip_whitelist ?? [];
    return { allowed: whitelist.length === 0 || whitelist.includes(ip) };
  }

  /** Enregistre la date du dernier audit de sécurité du compte. */
  markAudited(id: string): Promise<SuperAdmin> {
    return this.updateOrFail(id, { last_audit_at: new Date() });
  }

  /** Retourne les coordonnées d'alerte (avec repli sur email/téléphone). */
  async getAlertContact(
    id: string,
  ): Promise<{ email?: string; phone?: string }> {
    const admin = await this.findOne(id);
    return {
      email: admin.alert_email || admin.email,
      phone: admin.alert_phone || admin.phone,
    };
  }

  // ========================
  // HELPERS
  // ========================

  /** Lève une 409 si l'email est déjà utilisé par un autre administrateur. */
  private async ensureEmailAvailable(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = { email };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    if (await this.repository.exists(filter as QueryFilter<SuperAdmin>)) {
      throw new ConflictException(`L'email ${email} est déjà utilisé`);
    }
  }

  private assertAccessLevel(level: number): void {
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      throw new BadRequestException(
        "Le niveau d'accès doit être un entier entre 1 et 5",
      );
    }
  }

  private buildSearchFilter(term: string): QueryFilter<SuperAdmin> {
    const regex = { $regex: escapeRegex(term.trim()), $options: 'i' };
    return {
      $or: [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone: regex },
        { employee_id: regex },
      ],
    } as QueryFilter<SuperAdmin>;
  }

  private async updateOrFail(
    id: string,
    data: UpdateQuery<SuperAdmin>,
  ): Promise<SuperAdmin> {
    const doc = await this.repository.update(id, data);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Retire les champs sensibles d'un document avant de le renvoyer. */
  private sanitize(doc: SuperAdmin): SuperAdmin {
    const source = doc as unknown as {
      toObject?: () => Record<string, unknown>;
    } & Record<string, unknown>;
    const plain =
      typeof source.toObject === 'function' ? source.toObject() : { ...source };
    delete plain.password_hash;
    delete plain.two_factor_secret;
    return plain as unknown as SuperAdmin;
  }
}

/** Échappe les caractères spéciaux d'une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
