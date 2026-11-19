import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { RecordsService } from '../../records/services/records.service';
import { CustomField } from '../schemas/custom-field.entity';
import { CustomFieldValue } from '../schemas/custom-field-value.entity';
import {
  CreateCustomFieldDto,
  CustomFieldQueryDto,
  PutCustomValuesDto,
  StudioScopeQueryDto,
  UpdateCustomFieldDto,
} from '../dto/custom-field.dto';
import {
  BASE_RESERVED_KEYS,
  CustomFieldDefinition,
  CustomFieldOption,
  CustomFieldType,
  SELECTION_TYPES,
} from '../custom-field-types';
import {
  coerceFieldValue,
  validateCustomValues,
} from '../custom-field.validator';

/** Clé d'application du Studio. */
export const STUDIO_APP_KEY = 'studio';

const toObjectId = (value: string | null | undefined) =>
  value && Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : undefined;

/**
 * Studio : définitions de champs personnalisés et saisie de leurs valeurs
 * sur les fiches du registre.
 */
@Injectable()
export class StudioService extends BaseCrudService<
  CustomField,
  CreateCustomFieldDto,
  UpdateCustomFieldDto
> {
  constructor(
    @InjectModel(CustomField.name)
    private readonly fieldModel: Model<CustomField>,
    @InjectModel(CustomFieldValue.name)
    private readonly valueModel: Model<CustomFieldValue>,
    private readonly records: RecordsService,
  ) {
    super(fieldModel, 'Champ personnalisé');
  }

  protected getDefaultSort(): string {
    return 'res_model sequence key';
  }

  // ---------------------------------------------------------------------------
  // Définitions
  // ---------------------------------------------------------------------------

  async create(dto: CreateCustomFieldDto): Promise<CustomField> {
    if (!!dto.organization_id === !!dto.property_id) {
      throw new BadRequestException(
        'Indiquer soit organization_id, soit property_id (exactement un)',
      );
    }
    const definition = this.records.resolveModel(dto.res_model);
    const organizationId =
      dto.organization_id ??
      (await this.records.getOrganizationId(dto.property_id));
    if (organizationId) {
      await this.records.assertAppInstalled(dto.property_id, STUDIO_APP_KEY);
    }

    const reserved = this.reservedKeys(definition.model);
    if (reserved.has(dto.key)) {
      throw new BadRequestException(
        `La clé « ${dto.key} » est réservée (champ existant du modèle)`,
      );
    }
    const options = this.checkFieldShape(dto.field_type, dto.options);
    const defaultValue = this.checkDefault(
      { ...dto, options },
      dto.default_value,
    );
    await this.assertNoScopeCollision(
      definition.model,
      dto.key,
      dto.organization_id,
      dto.property_id,
      organizationId,
    );

    try {
      return await super.create({
        ...dto,
        res_model: definition.model,
        options,
        default_value: defaultValue,
        organization_id: toObjectId(dto.organization_id),
        property_id: toObjectId(dto.property_id),
      } as unknown as CreateCustomFieldDto);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          `Un champ « ${dto.key} » existe déjà pour ce modèle`,
        );
      }
      throw error;
    }
  }

  async findAll(
    query: CustomFieldQueryDto,
    filter: QueryFilter<CustomField> = {},
  ): Promise<PaginatedResult<CustomField>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.res_model) {
      criteria.res_model = this.records.resolveModel(query.res_model).model;
    }
    if (query.organization_id) {
      criteria.organization_id = new Types.ObjectId(query.organization_id);
    }
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (typeof query.is_active === 'boolean')
      criteria.is_active = query.is_active;
    return super.findAll(query, criteria);
  }

  async update(id: string, dto: UpdateCustomFieldDto): Promise<CustomField> {
    const current = await this.findOne(id);
    const fieldType = dto.field_type ?? current.field_type;
    const options = this.checkFieldShape(
      fieldType,
      dto.options ?? current.options,
    );
    const merged = { ...dto };
    if (dto.field_type || dto.options || dto.default_value !== undefined) {
      merged.default_value = this.checkDefault(
        {
          key: current.key,
          label: dto.label ?? current.label,
          field_type: fieldType,
          options,
        },
        dto.default_value !== undefined
          ? dto.default_value
          : current.default_value,
      );
      merged.options = options;
    }
    return super.update(id, merged);
  }

  // ---------------------------------------------------------------------------
  // Schéma et valeurs
  // ---------------------------------------------------------------------------

  /**
   * Champs actifs applicables à une fiche : champs de l'établissement et de
   * son organisation, triés par séquence.
   */
  async getApplicableFields(
    model: string,
    propertyId: string | null | undefined,
    organizationId?: string | null,
  ): Promise<CustomField[]> {
    const definition = this.records.resolveModel(model);
    const orgId =
      organizationId ?? (await this.records.getOrganizationId(propertyId));
    const scopes: Record<string, unknown>[] = [];
    if (propertyId)
      scopes.push({ property_id: new Types.ObjectId(propertyId) });
    if (orgId) scopes.push({ organization_id: new Types.ObjectId(orgId) });
    if (!scopes.length) return [];
    return this.fieldModel
      .find({
        res_model: definition.model,
        is_active: true,
        is_deleted: { $ne: true },
        $or: scopes,
      })
      .sort({ sequence: 1, key: 1 })
      .lean<CustomField[]>()
      .exec();
  }

  /** Définitions pour un moteur de formulaire. */
  async getSchema(model: string, scope: StudioScopeQueryDto) {
    const definition = this.records.resolveModel(model);
    if (scope.property_id) {
      await this.records.assertAppInstalled(scope.property_id, STUDIO_APP_KEY);
    }
    const fields = await this.getApplicableFields(
      definition.model,
      scope.property_id,
      scope.organization_id,
    );
    return {
      res_model: definition.model,
      label: definition.label,
      fields: fields.map((field) => ({
        key: field.key,
        label: field.label,
        field_type: field.field_type,
        options: field.options ?? [],
        required: field.required,
        default_value: field.default_value ?? null,
        help: field.help ?? null,
        sequence: field.sequence,
        scope: field.property_id ? 'property' : 'organization',
      })),
    };
  }

  /** Valeurs personnalisées d'une fiche (avec les définitions applicables). */
  async getValues(model: string, id: string, scope: StudioScopeQueryDto) {
    const ref = await this.records.assertRecordExists(model, id);
    const propertyId = ref.property_id ?? scope.property_id ?? null;
    await this.records.assertAppInstalled(propertyId, STUDIO_APP_KEY);
    const [fields, stored] = await Promise.all([
      this.getApplicableFields(
        ref.definition.model,
        propertyId,
        scope.organization_id,
      ),
      this.valueModel
        .findOne({ res_model: ref.definition.model, res_id: ref.id })
        .lean()
        .exec(),
    ]);
    return {
      res_model: ref.definition.model,
      res_id: String(ref.id),
      property_id: propertyId,
      values: stored?.values ?? {},
      fields: fields.map((field) => field.key),
      updated_at: stored?.updated_at ?? null,
    };
  }

  /** Valide et fusionne les valeurs saisies (400 avec le détail des erreurs). */
  async putValues(
    model: string,
    id: string,
    dto: PutCustomValuesDto,
    userId?: string,
  ) {
    const ref = await this.records.assertRecordExists(model, id);
    const propertyId = ref.property_id ?? dto.property_id ?? null;
    await this.records.assertAppInstalled(propertyId, STUDIO_APP_KEY);
    const fields = await this.getApplicableFields(
      ref.definition.model,
      propertyId,
    );
    const stored = await this.valueModel
      .findOne({ res_model: ref.definition.model, res_id: ref.id })
      .lean()
      .exec();
    const { values, errors } = validateCustomValues(
      fields.map((field) => this.toDefinition(field)),
      dto.values,
      { existing: stored?.values ?? {}, applyDefaults: !stored },
    );
    if (errors.length) {
      throw new BadRequestException({
        message: 'Valeurs personnalisées invalides',
        errors,
      });
    }
    const saved = await this.valueModel
      .findOneAndUpdate(
        { res_model: ref.definition.model, res_id: ref.id },
        {
          $set: {
            values,
            property_id: toObjectId(propertyId),
            updated_by: toObjectId(userId),
          },
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();
    return {
      res_model: ref.definition.model,
      res_id: String(ref.id),
      property_id: propertyId,
      values: saved?.values ?? values,
      updated_at: saved?.updated_at ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // Interne
  // ---------------------------------------------------------------------------

  /** Clés interdites : champs techniques + champs du schéma Mongoose du modèle. */
  reservedKeys(model: string): Set<string> {
    return new Set([
      ...BASE_RESERVED_KEYS,
      ...this.records.getCoreFieldNames(model),
    ]);
  }

  private checkFieldShape(
    fieldType: CustomFieldType,
    options: CustomFieldOption[] | undefined,
  ): CustomFieldOption[] | undefined {
    if (!SELECTION_TYPES.includes(fieldType)) return undefined;
    if (!options?.length) {
      throw new BadRequestException(
        'Un champ de sélection doit définir au moins une option',
      );
    }
    const seen = new Set<string>();
    for (const option of options) {
      if (seen.has(option.value)) {
        throw new BadRequestException(`Option en double : ${option.value}`);
      }
      seen.add(option.value);
    }
    return options.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }

  private checkDefault(
    field: Pick<
      CustomFieldDefinition,
      'key' | 'label' | 'field_type' | 'options'
    >,
    value: unknown,
  ): unknown {
    if (value === undefined || value === null) return undefined;
    const result = coerceFieldValue(field, value);
    if (!result.ok) {
      throw new BadRequestException(
        `Valeur par défaut invalide : ${result.message}`,
      );
    }
    return result.value ?? undefined;
  }

  /**
   * Une même clé ne peut exister à la fois au niveau de l'organisation et
   * d'un de ses établissements (les deux s'appliqueraient à la même fiche).
   */
  private async assertNoScopeCollision(
    model: string,
    key: string,
    organizationScope: string | undefined,
    propertyScope: string | undefined,
    organizationId: string | null,
  ): Promise<void> {
    const scopes: Record<string, unknown>[] = [];
    if (propertyScope && organizationId) {
      scopes.push({ organization_id: new Types.ObjectId(organizationId) });
    }
    if (organizationScope) {
      const propertyIds =
        await this.records.getPropertyIdsOfOrganization(organizationScope);
      if (propertyIds.length)
        scopes.push({ property_id: { $in: propertyIds } });
    }
    if (!scopes.length) return;
    const clash = await this.fieldModel
      .exists({
        res_model: model,
        key,
        is_deleted: { $ne: true },
        $or: scopes,
      })
      .exec();
    if (clash) {
      throw new ConflictException(
        `La clé « ${key} » est déjà utilisée par un autre niveau (organisation / établissement)`,
      );
    }
  }

  private toDefinition(field: CustomField): CustomFieldDefinition {
    return {
      key: field.key,
      label: field.label,
      field_type: field.field_type,
      options: field.options,
      required: field.required,
      default_value: field.default_value,
      is_active: field.is_active,
    };
  }
}
