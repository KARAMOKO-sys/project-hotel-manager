import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  TaxAppliesTo,
  TaxCalculationType,
  TaxFixedBasis,
  TaxRate,
  TaxRateDocument,
  TaxType,
} from '../schemas/tax-rate.entity';
import { CreateTaxRateDto } from '../dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from '../dto/update-tax-rate.dto';

/** Paramètres du calcul (assiette des taxes fixes, date, catégorie). */
export interface TaxCalculationOptions {
  nights?: number;
  guests?: number;
  date?: Date;
  appliesTo?: TaxAppliesTo;
}

export interface TaxLine {
  tax_rate_id: string;
  name: string;
  code: string;
  tax_type: TaxType;
  calculation_type: TaxCalculationType;
  rate: number;
  is_inclusive: boolean;
  amount: number;
}

export interface TaxCalculationResult {
  /** Montant saisi (TTC pour les taxes incluses, HT pour les autres). */
  base_amount: number;
  /** Montant hors toutes taxes. */
  net_amount: number;
  taxes: TaxLine[];
  total_inclusive_tax: number;
  total_exclusive_tax: number;
  total_tax: number;
  /** Montant final à payer = base_amount + taxes non incluses. */
  total_amount: number;
}

/** Champs soumis aux règles de cohérence d'un taux. */
type TaxRateConstraints = Pick<
  CreateTaxRateDto,
  'calculation_type' | 'rate' | 'valid_from' | 'valid_to'
>;

/**
 * Service de gestion des taux de taxe (TVA, taxe de séjour…) par propriété.
 *
 * Fournit le CRUD, la sélection des taxes applicables à une date et le
 * calcul détaillé des taxes d'un montant (`calculateTaxes`), en gérant les
 * taxes en pourcentage ou fixes, incluses ou ajoutées au prix.
 */
@Injectable()
export class TaxRateService extends BaseCrudService<
  TaxRate,
  CreateTaxRateDto,
  UpdateTaxRateDto
> {
  constructor(
    @InjectModel(TaxRate.name)
    protected readonly taxRateModel: Model<TaxRateDocument>,
  ) {
    super(taxRateModel, TaxRate.name);
  }

  /** Crée un taux de taxe (code unique par propriété). */
  async create(dto: CreateTaxRateDto): Promise<TaxRate> {
    this.validateConstraints(dto);
    const code = dto.code.trim().toUpperCase();
    await this.assertCodeAvailable(dto.property_id, code);
    return super.create({ ...dto, code } as CreateTaxRateDto);
  }

  /** Met à jour un taux en revalidant les contraintes fusionnées. */
  async update(id: string, dto: UpdateTaxRateDto): Promise<TaxRate> {
    const existing = await this.findOne(id);
    this.validateConstraints({
      calculation_type: dto.calculation_type ?? existing.calculation_type,
      rate: dto.rate ?? existing.rate,
      valid_from: dto.valid_from ?? existing.valid_from?.toISOString(),
      valid_to: dto.valid_to ?? existing.valid_to?.toISOString(),
    });

    const data: UpdateTaxRateDto = { ...dto };
    if (dto.code) {
      const code = dto.code.trim().toUpperCase();
      if (code !== existing.code) {
        await this.assertCodeAvailable(
          existing.property_id.toString(),
          code,
          id,
        );
      }
      data.code = code;
    }
    return super.update(id, data);
  }

  /** Liste paginée des taux d'une propriété. */
  findByProperty(
    propertyId: string,
    query: PaginationQueryDto,
    activeOnly = false,
  ) {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
    };
    if (activeOnly) {
      filter.is_active = true;
    }
    return this.findAll(query, filter);
  }

  async activate(id: string): Promise<TaxRate> {
    return super.update(id, { is_active: true });
  }

  async deactivate(id: string): Promise<TaxRate> {
    return super.update(id, { is_active: false });
  }

  /**
   * Taxes actives d'une propriété, valides à la date donnée et applicables
   * à la catégorie de prestation (les taxes `all` s'appliquent toujours).
   */
  async getApplicableTaxes(
    propertyId: string,
    date: Date = new Date(),
    appliesTo?: TaxAppliesTo,
  ): Promise<TaxRate[]> {
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
      is_active: true,
      is_deleted: { $ne: true },
      $and: [
        { $or: [{ valid_from: null }, { valid_from: { $lte: date } }] },
        { $or: [{ valid_to: null }, { valid_to: { $gte: date } }] },
      ],
    };
    if (appliesTo && appliesTo !== TaxAppliesTo.ALL) {
      filter.applies_to = { $in: [TaxAppliesTo.ALL, appliesTo] };
    }
    return this.taxRateModel
      .find(filter)
      .sort({ priority: 1, created_at: 1 })
      .lean()
      .exec() as unknown as Promise<TaxRate[]>;
  }

  /**
   * Calcule toutes les taxes applicables d'une propriété sur un montant
   * (`getApplicableTaxes` + calcul détaillé).
   */
  async calculateTaxes(
    amount: number,
    propertyId: string,
    options: TaxCalculationOptions = {},
  ): Promise<TaxCalculationResult> {
    this.assertAmount(amount);
    const taxes = await this.getApplicableTaxes(
      propertyId,
      options.date ?? new Date(),
      options.appliesTo,
    );
    return this.computeTaxes(amount, taxes, options);
  }

  /** Calcule le montant d'une taxe précise sur un montant (`calculateTax`). */
  async calculateTax(
    taxRateId: string,
    amount: number,
    options: TaxCalculationOptions = {},
  ): Promise<TaxCalculationResult> {
    this.assertAmount(amount);
    const taxRate = await this.findOne(taxRateId);
    if (!taxRate.is_active) {
      throw new BadRequestException('Ce taux de taxe est inactif');
    }
    return this.computeTaxes(amount, [taxRate], options);
  }

  /**
   * Calcul pur des taxes sur un montant.
   *
   * 1. Les taxes fixes incluses sont retirées du montant ;
   * 2. le net HT est extrait des taxes en pourcentage incluses :
   *    net = reste / (1 + Σ taux inclus / 100) ;
   * 3. les taxes en pourcentage (incluses ou non) sont calculées sur ce net,
   *    les taxes fixes selon leur assiette (nuits, personnes).
   */
  computeTaxes(
    amount: number,
    taxRates: TaxRate[],
    options: TaxCalculationOptions = {},
  ): TaxCalculationResult {
    this.assertAmount(amount);
    const nights = Math.max(1, options.nights ?? 1);
    const guests = Math.max(1, options.guests ?? 1);

    const fixedAmount = (tax: TaxRate) => {
      switch (tax.fixed_basis) {
        case TaxFixedBasis.PER_NIGHT:
          return tax.rate * nights;
        case TaxFixedBasis.PER_PERSON:
          return tax.rate * guests;
        case TaxFixedBasis.PER_PERSON_PER_NIGHT:
          return tax.rate * nights * guests;
        default:
          return tax.rate;
      }
    };
    const isPercentage = (tax: TaxRate) =>
      tax.calculation_type !== TaxCalculationType.FIXED;

    const inclusiveFixed = taxRates
      .filter((t) => t.is_inclusive && !isPercentage(t))
      .reduce((sum, t) => sum + fixedAmount(t), 0);
    if (inclusiveFixed > amount) {
      throw new BadRequestException(
        'Les taxes fixes incluses dépassent le montant',
      );
    }
    const inclusivePercent = taxRates
      .filter((t) => t.is_inclusive && isPercentage(t))
      .reduce((sum, t) => sum + t.rate, 0);
    const net = (amount - inclusiveFixed) / (1 + inclusivePercent / 100);

    const lines: TaxLine[] = taxRates.map((tax) => ({
      tax_rate_id: String(tax._id),
      name: tax.name,
      code: tax.code,
      tax_type: tax.tax_type,
      calculation_type: tax.calculation_type,
      rate: tax.rate,
      is_inclusive: !!tax.is_inclusive,
      amount: this.round(
        isPercentage(tax) ? (net * tax.rate) / 100 : fixedAmount(tax),
      ),
    }));

    const totalInclusive = this.round(
      lines.filter((l) => l.is_inclusive).reduce((s, l) => s + l.amount, 0),
    );
    const totalExclusive = this.round(
      lines.filter((l) => !l.is_inclusive).reduce((s, l) => s + l.amount, 0),
    );

    return {
      base_amount: amount,
      net_amount: this.round(amount - totalInclusive),
      taxes: lines,
      total_inclusive_tax: totalInclusive,
      total_exclusive_tax: totalExclusive,
      total_tax: this.round(totalInclusive + totalExclusive),
      total_amount: this.round(amount + totalExclusive),
    };
  }

  protected getDefaultSort(): string {
    return 'priority';
  }

  private validateConstraints(dto: TaxRateConstraints): void {
    const type = dto.calculation_type ?? TaxCalculationType.PERCENTAGE;
    if (dto.rate < 0) {
      throw new BadRequestException('Le taux doit être positif');
    }
    if (type === TaxCalculationType.PERCENTAGE && dto.rate > 100) {
      throw new BadRequestException(
        'Un taux en pourcentage doit être compris entre 0 et 100',
      );
    }
    if (dto.valid_from && dto.valid_to) {
      const from = new Date(dto.valid_from);
      const to = new Date(dto.valid_to);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new BadRequestException('Date de validité invalide');
      }
      if (to < from) {
        throw new BadRequestException(
          'La fin de validité doit être postérieure au début de validité',
        );
      }
    }
  }

  private async assertCodeAvailable(
    propertyId: string,
    code: string,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      property_id: this.toObjectId(propertyId, 'property_id'),
      code,
    };
    if (excludeId) {
      filter._id = { $ne: this.toObjectId(excludeId, 'id') };
    }
    if (await this.repository.exists(filter)) {
      throw new ConflictException(`Une taxe avec le code ${code} existe déjà`);
    }
  }

  private assertAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Le montant doit être positif');
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toObjectId(id: string, field: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide (${field})`);
    }
    return new Types.ObjectId(id);
  }
}
