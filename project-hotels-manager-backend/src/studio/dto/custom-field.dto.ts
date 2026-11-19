import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  CUSTOM_FIELD_KEY_PATTERN,
  CustomFieldType,
} from '../custom-field-types';

/** Option d'un champ de sélection. */
export class CustomFieldOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;
}

/** Création d'un champ personnalisé (portée organisation OU établissement). */
export class CreateCustomFieldDto {
  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsString()
  @MaxLength(100)
  res_model!: string;

  @IsString()
  @Matches(CUSTOM_FIELD_KEY_PATTERN, {
    message:
      'La clé doit être en snake_case (lettre minuscule puis lettres, chiffres ou _ ; 2 à 41 caractères)',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label!: string;

  @IsEnum(CustomFieldType)
  field_type!: CustomFieldType;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldOptionDto)
  @ArrayMaxSize(200)
  options?: CustomFieldOptionDto[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  default_value?: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  help?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sequence?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/** Mise à jour : la portée, le modèle et la clé ne changent pas. */
export class UpdateCustomFieldDto extends PartialType(
  OmitType(CreateCustomFieldDto, [
    'organization_id',
    'property_id',
    'res_model',
    'key',
  ] as const),
) {}

/** Filtres de la liste des champs. */
export class CustomFieldQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  res_model?: string;

  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  is_active?: boolean;
}

/** Saisie des valeurs d'une fiche (fusionnées avec l'existant). */
export class PutCustomValuesDto {
  @IsDefined()
  @IsObject()
  values!: Record<string, unknown>;

  /** Établissement de référence pour les fiches sans établissement (clients). */
  @IsOptional()
  @IsMongoId()
  property_id?: string;
}

/** Portée pour la lecture du schéma / des valeurs. */
export class StudioScopeQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  organization_id?: string;
}
