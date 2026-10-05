// src/modules/roles/services/role.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Role,
  RoleDocument,
  RoleType,
  RoleLevel,
} from '../schemas/role.schema';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { PermissionCheckResponseDto } from '../dto/permission.dto';

@Injectable()
export class RoleService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  // ========================
  // CRUD
  // ========================

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    // Vérifier si le code ou le nom existe déjà
    const existingRole = await this.roleModel.findOne({
      $or: [{ code: createRoleDto.code }, { name: createRoleDto.name }],
    });

    if (existingRole) {
      throw new ConflictException('Role with this name or code already exists');
    }

    // Créer un nouveau rôle (le middleware pre('save') s'occupera du nettoyage)
    const newRole = new this.roleModel(createRoleDto);
    return newRole.save();
  }

  async findAll(): Promise<Role[]> {
    return this.roleModel.find().sort({ role_level: 1, created_at: -1 }).exec();
  }

  async findActive(): Promise<Role[]> {
    return this.roleModel
      .find({ is_active: true })
      .sort({ role_level: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async findByCode(code: string): Promise<Role> {
    const role = await this.roleModel.findOne({ code }).exec();
    if (!role) {
      throw new NotFoundException(`Role with code ${code} not found`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    // Vérifier si le code est unique si modifié
    if (updateRoleDto.code) {
      const existingRole = await this.roleModel.findOne({
        code: updateRoleDto.code,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existingRole) {
        throw new ConflictException('Role with this code already exists');
      }
    }

    const role = await this.roleModel
      .findByIdAndUpdate(id, updateRoleDto, { new: true, runValidators: true })
      .exec();

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async remove(id: string): Promise<Role> {
    const role = await this.roleModel.findByIdAndDelete(id).exec();

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  // ========================
  // PERMISSIONS
  // ========================

  async addPermission(id: string, permission: string): Promise<Role> {
    const role = await this.findOne(id);

    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
      await role.save();
    }

    return role;
  }

  async removePermission(id: string, permission: string): Promise<Role> {
    const role = await this.findOne(id);
    role.permissions = role.permissions.filter((p) => p !== permission);
    return role.save();
  }

  async checkPermissions(
    id: string,
    permissions: string[],
  ): Promise<PermissionCheckResponseDto> {
    const role = await this.findOne(id);

    const granted = permissions.filter((p) => role.hasPermission(p));
    const missing = permissions.filter((p) => !role.hasPermission(p));

    return {
      has_all: missing.length === 0,
      has_any: granted.length > 0,
      granted,
      missing,
    };
  }

  async getPermissions(id: string): Promise<string[]> {
    const role = await this.findOne(id);
    return role.permissions;
  }

  // ========================
  // RECHERCHE
  // ========================

  async search(searchTerm: string): Promise<Role[]> {
    return this.roleModel
      .find({
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { code: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .exec();
  }

  async findByLevel(level: RoleLevel): Promise<Role[]> {
    return this.roleModel.find({ role_level: level, is_active: true }).exec();
  }

  // ========================
  // STATISTIQUES
  // ========================

  async getStats(): Promise<any> {
    return this.roleModel.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { is_active: true } }, { $count: 'count' }],
          by_level: [
            {
              $group: {
                _id: '$role_level',
                count: { $sum: 1 },
              },
            },
          ],
          system_roles: [{ $match: { is_system: true } }, { $count: 'count' }],
          avg_permissions: [
            {
              $group: {
                _id: null,
                avg: { $avg: { $size: '$permissions' } },
              },
            },
          ],
        },
      },
    ]);
  }
}
