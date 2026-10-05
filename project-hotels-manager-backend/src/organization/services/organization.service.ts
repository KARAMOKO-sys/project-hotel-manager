import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  Organization,
  OrganizationDocument,
} from '../schemas/organization.entity';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';

/**
 * Service de gestion des organisations (chaînes hôtelières, groupes).
 *
 * Hérite du CRUD générique et ajoute la gestion des paramètres et des membres.
 */
@Injectable()
export class OrganizationService extends BaseCrudService<
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto
> {
  constructor(
    @InjectModel(Organization.name)
    protected readonly organizationModel: Model<OrganizationDocument>,
  ) {
    super(organizationModel, Organization.name);
  }

  /** Récupère les paramètres de configuration de l'organisation. */
  async getSettings(id: string): Promise<Record<string, any>> {
    const organization = await this.findOne(id);
    return organization.settings ?? {};
  }

  /** Met à jour (fusionne) les paramètres de l'organisation. */
  async updateSettings(
    id: string,
    settings: Record<string, any>,
  ): Promise<Organization> {
    await this.findOne(id);
    return this.update(id, { settings } as UpdateOrganizationDto);
  }

  /** Liste les membres d'une organisation. */
  async getMembers(id: string): Promise<Organization['members']> {
    const organization = await this.findOne(id);
    return organization.members ?? [];
  }

  /**
   * Ajoute un membre à l'organisation.
   * Lève une erreur 400 si le membre est déjà présent.
   */
  async addMember(
    id: string,
    userId: string,
    roleId?: string,
  ): Promise<Organization> {
    const organization = await this.findOne(id);
    const alreadyMember = (organization.members ?? []).some(
      (member) => member.user_id.toString() === userId,
    );
    if (alreadyMember) {
      throw new ConflictException(`L'utilisateur ${userId} est déjà membre`);
    }

    return this.organizationModel
      .findByIdAndUpdate(
        id,
        {
          $push: {
            members: {
              user_id: new Types.ObjectId(userId),
              role_id: roleId ? new Types.ObjectId(roleId) : undefined,
              joined_at: new Date(),
            },
          },
        },
        { new: true, runValidators: true },
      )
      .exec() as unknown as Promise<Organization>;
  }

  /** Retire un membre de l'organisation. */
  async removeMember(id: string, userId: string): Promise<Organization> {
    await this.findOne(id);
    return this.organizationModel
      .findByIdAndUpdate(
        id,
        { $pull: { members: { user_id: new Types.ObjectId(userId) } } },
        { new: true },
      )
      .exec() as unknown as Promise<Organization>;
  }

  /** Calcule quelques statistiques simples de l'organisation. */
  async getStatistics(
    id: string,
  ): Promise<{ member_count: number; status: string; type: string }> {
    const organization = await this.findOne(id);
    return {
      member_count: organization.members?.length ?? 0,
      status: organization.status,
      type: organization.type,
    };
  }
}
