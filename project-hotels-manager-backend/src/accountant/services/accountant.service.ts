import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  Accountant,
  AccountantDocument,
  AccountantStatus,
} from '../schemas/accountant.entity';
import { CreateAccountantDto } from '../dto/create-accountant.dto';
import { UpdateAccountantDto } from '../dto/update-accountant.dto';
import { UpdateAccountantPermissionsDto } from '../dto/accountant-actions.dto';

/** Nombre de tours de sel bcrypt utilisés pour hasher les mots de passe. */
const SALT_ROUNDS = 10;

/** Résultat d'une vérification de plafond d'approbation. */
export interface ApprovalCheckResult {
  allowed: boolean;
  amount: number;
  approval_limit: number;
  reason?: string;
}

/**
 * Service de gestion des comptables.
 *
 * Étend le CRUD générique et ajoute : création avec hash du mot de passe,
 * recherche, rattachement à une propriété, gestion du statut, changement de
 * mot de passe, habilitations financières (factures, remboursements, exports,
 * plafond d'approbation) et certifications.
 *
 * Le hash du mot de passe (`password_hash`, `select: false`) n'est jamais
 * renvoyé par ce service.
 */
@Injectable()
export class AccountantService extends BaseCrudService<
  Accountant,
  CreateAccountantDto,
  UpdateAccountantDto
> {
  constructor(
    @InjectModel(Accountant.name)
    protected readonly accountantModel: Model<AccountantDocument>,
  ) {
    super(accountantModel, Accountant.name);
  }

  /** Crée un comptable en hashant son mot de passe. */
  async create(createAccountantDto: CreateAccountantDto): Promise<Accountant> {
    const { password, ...rest } = createAccountantDto;
    const email = rest.email.toLowerCase().trim();
    await this.ensureUnique({ email }, `L'email ${email} est déjà utilisé`);
    await this.ensureUnique(
      { employee_code: rest.employee_code },
      `Le code employé ${rest.employee_code} est déjà utilisé`,
    );

    const accountant = new this.accountantModel({
      ...rest,
      email,
      property_id: this.toObjectId(rest.property_id, 'property_id'),
      password_hash: await bcrypt.hash(password, SALT_ROUNDS),
      password_changed_at: new Date(),
    });

    const saved = await accountant.save();
    return this.sanitize(saved as unknown as Accountant);
  }

  /** Liste paginée, avec recherche libre optionnelle (`?search=`). */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<Accountant> = {},
  ): Promise<PaginatedResult<Accountant>> {
    const searchFilter = query.search
      ? this.buildSearchFilter(query.search)
      : {};
    return super.findAll(query, {
      ...filter,
      ...searchFilter,
    } as QueryFilter<Accountant>);
  }

  /** Met à jour un comptable en vérifiant l'unicité email / code employé. */
  async update(
    id: string,
    updateAccountantDto: UpdateAccountantDto,
  ): Promise<Accountant> {
    if (updateAccountantDto.email) {
      updateAccountantDto.email = updateAccountantDto.email
        .toLowerCase()
        .trim();
      await this.ensureUnique(
        { email: updateAccountantDto.email },
        `L'email ${updateAccountantDto.email} est déjà utilisé`,
        id,
      );
    }
    if (updateAccountantDto.employee_code) {
      await this.ensureUnique(
        { employee_code: updateAccountantDto.employee_code },
        `Le code employé ${updateAccountantDto.employee_code} est déjà utilisé`,
        id,
      );
    }
    return super.update(id, updateAccountantDto);
  }

  /** Recherche un comptable par email (insensible à la casse). */
  async findByEmail(email: string): Promise<Accountant> {
    const accountant = await this.repository.findOne({
      email: email.toLowerCase().trim(),
      is_deleted: { $ne: true },
    } as QueryFilter<Accountant>);
    if (!accountant) {
      throw new NotFoundException(
        `Accountant avec l'email ${email} introuvable`,
      );
    }
    return accountant;
  }

  /** Recherche un comptable par code employé. */
  async findByEmployeeCode(employeeCode: string): Promise<Accountant> {
    const accountant = await this.repository.findOne({
      employee_code: employeeCode,
      is_deleted: { $ne: true },
    } as QueryFilter<Accountant>);
    if (!accountant) {
      throw new NotFoundException(
        `Accountant avec le code ${employeeCode} introuvable`,
      );
    }
    return accountant;
  }

  /** Recherche textuelle sur nom, prénom, email, téléphone et code employé. */
  async search(searchTerm: string): Promise<Accountant[]> {
    if (!searchTerm || !searchTerm.trim()) {
      throw new BadRequestException('Le terme de recherche est requis');
    }
    return this.repository.find(
      {
        ...this.buildSearchFilter(searchTerm),
        is_deleted: { $ne: true },
      } as QueryFilter<Accountant>,
      { sort: 'last_name', limit: 50 },
    );
  }

  /** Liste les comptables d'une propriété (filtrable par statut). */
  findByProperty(
    propertyId: string,
    query: PaginationQueryDto,
    status?: AccountantStatus,
  ): Promise<PaginatedResult<Accountant>> {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'propertyId'),
    };
    if (status) {
      this.assertStatus(status);
      filter.status = status;
    }
    return this.findAll(query, filter as QueryFilter<Accountant>);
  }

  /** Active le compte. */
  activate(id: string): Promise<Accountant> {
    return this.updateOrFail(id, {
      is_active: true,
      status: AccountantStatus.ACTIVE,
    });
  }

  /** Désactive le compte. */
  deactivate(id: string): Promise<Accountant> {
    return this.updateOrFail(id, {
      is_active: false,
      status: AccountantStatus.INACTIVE,
    });
  }

  /** Suspend un comptable (le compte devient inactif). */
  async suspend(id: string, reason?: string): Promise<Accountant> {
    const accountant = await this.findOne(id);
    if (accountant.status === AccountantStatus.SUSPENDED) {
      throw new BadRequestException('Ce comptable est déjà suspendu');
    }
    return this.updateOrFail(id, {
      status: AccountantStatus.SUSPENDED,
      is_active: false,
      'metadata.suspension_reason': reason ?? null,
      'metadata.suspended_at': new Date(),
    } as UpdateQuery<Accountant>);
  }

  /** Réactive un comptable suspendu. */
  async reactivate(id: string): Promise<Accountant> {
    const accountant = await this.findOne(id);
    if (accountant.status !== AccountantStatus.SUSPENDED) {
      throw new BadRequestException(
        'Seul un comptable suspendu peut être réactivé',
      );
    }
    return this.updateOrFail(id, {
      status: AccountantStatus.ACTIVE,
      is_active: true,
      'metadata.suspension_reason': null,
      'metadata.reactivated_at': new Date(),
    } as UpdateQuery<Accountant>);
  }

  /** Change le mot de passe après vérification de l'ancien. */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Accountant> {
    const accountant = await this.repository.findOne(
      { _id: id, is_deleted: { $ne: true } } as QueryFilter<Accountant>,
      { select: '+password_hash' },
    );
    if (!accountant) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    if (!(await bcrypt.compare(currentPassword, accountant.password_hash))) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (await bcrypt.compare(newPassword, accountant.password_hash)) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }
    return this.updateOrFail(id, {
      password_hash: await bcrypt.hash(newPassword, SALT_ROUNDS),
      password_changed_at: new Date(),
      failed_login_attempts: 0,
      locked_until: null,
    } as UpdateQuery<Accountant>);
  }

  /** Met à jour les habilitations financières du comptable. */
  updatePermissions(
    id: string,
    permissions: UpdateAccountantPermissionsDto,
  ): Promise<Accountant> {
    const update = Object.fromEntries(
      Object.entries(permissions).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(update).length === 0) {
      throw new BadRequestException('Aucune habilitation à mettre à jour');
    }
    if (
      update.approval_limit !== undefined &&
      (typeof update.approval_limit !== 'number' || update.approval_limit < 0)
    ) {
      throw new BadRequestException(
        "Le plafond d'approbation doit être positif",
      );
    }
    return this.updateOrFail(id, update as UpdateQuery<Accountant>);
  }

  /**
   * Vérifie si le comptable peut approuver/traiter un montant donné
   * (compte actif et montant inférieur ou égal au plafond).
   */
  async checkApproval(
    id: string,
    amount: number,
  ): Promise<ApprovalCheckResult> {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Le montant doit être un nombre positif');
    }
    const accountant = await this.findOne(id);
    const approvalLimit = accountant.approval_limit ?? 0;

    if (
      accountant.status !== AccountantStatus.ACTIVE ||
      accountant.is_active === false
    ) {
      return {
        allowed: false,
        amount,
        approval_limit: approvalLimit,
        reason: "Le compte du comptable n'est pas actif",
      };
    }
    if (amount > approvalLimit) {
      return {
        allowed: false,
        amount,
        approval_limit: approvalLimit,
        reason: "Montant supérieur au plafond d'approbation",
      };
    }
    return { allowed: true, amount, approval_limit: approvalLimit };
  }

  /** Ajoute une certification (sans doublon). */
  addCertification(id: string, certification: string): Promise<Accountant> {
    const value = this.normalizeCertification(certification);
    return this.updateOrFail(id, {
      $addToSet: { certifications: value },
    } as UpdateQuery<Accountant>);
  }

  /** Retire une certification. */
  removeCertification(id: string, certification: string): Promise<Accountant> {
    const value = this.normalizeCertification(certification);
    return this.updateOrFail(id, {
      $pull: { certifications: value },
    } as UpdateQuery<Accountant>);
  }

  // ========================
  // HELPERS
  // ========================

  /** Lève une 409 si un autre comptable correspond déjà au filtre. */
  private async ensureUnique(
    filter: Record<string, unknown>,
    message: string,
    excludeId?: string,
  ): Promise<void> {
    const query: Record<string, unknown> = { ...filter };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    if (await this.repository.exists(query as QueryFilter<Accountant>)) {
      throw new ConflictException(message);
    }
  }

  private normalizeCertification(certification: string): string {
    const value = (certification ?? '').trim();
    if (!value) {
      throw new BadRequestException('La certification est requise');
    }
    return value;
  }

  private assertStatus(status: string): void {
    if (!Object.values(AccountantStatus).includes(status as AccountantStatus)) {
      throw new BadRequestException(`Statut invalide : ${status}`);
    }
  }

  private toObjectId(value: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${field} invalide`);
    }
    return new Types.ObjectId(value);
  }

  private buildSearchFilter(term: string): QueryFilter<Accountant> {
    const regex = { $regex: escapeRegex(term.trim()), $options: 'i' };
    return {
      $or: [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone: regex },
        { employee_code: regex },
      ],
    } as QueryFilter<Accountant>;
  }

  private async updateOrFail(
    id: string,
    data: UpdateQuery<Accountant>,
  ): Promise<Accountant> {
    const doc = await this.repository.update(id, data);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Retire les champs sensibles d'un document avant de le renvoyer. */
  private sanitize(doc: Accountant): Accountant {
    const source = doc as unknown as {
      toObject?: () => Record<string, unknown>;
    } & Record<string, unknown>;
    const plain =
      typeof source.toObject === 'function' ? source.toObject() : { ...source };
    delete plain.password_hash;
    delete plain.two_factor_secret;
    return plain as unknown as Accountant;
  }
}

/** Échappe les caractères spéciaux d'une expression régulière. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
