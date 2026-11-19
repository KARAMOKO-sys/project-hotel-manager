import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IntegrationEndpointKind } from '../schemas/integration-endpoint.entity';
import { EVENT_PATTERN_REGEX } from '../utils/pattern-matcher';
import { MAX_TIMEOUT_MS, MIN_TIMEOUT_MS } from '../integration-bus.constants';

export class CreateIntegrationEndpointDto {
  /** Organisation propriétaire (déduite de `property_id` si absente). */
  @ValidateIf((dto: CreateIntegrationEndpointDto) => !dto.property_id)
  @IsMongoId()
  organization_id?: string;

  /** Restreint l'abonnement aux événements de cet établissement. */
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(IntegrationEndpointKind)
  kind?: IntegrationEndpointKind;

  @ValidateIf(
    (dto: CreateIntegrationEndpointDto) =>
      (dto.kind ?? IntegrationEndpointKind.WEBHOOK) ===
        IntegrationEndpointKind.WEBHOOK || dto.url !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: "L'URL est obligatoire pour un webhook" })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  broker_destination?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(EVENT_PATTERN_REGEX, {
    each: true,
    message:
      'Motif d’événement invalide (ex. « billing.* », « hotel.reservation.created » ou « * »)',
  })
  event_patterns!: string[];

  /** Secret HMAC (généré si absent). Jamais renvoyé ensuite. */
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_TIMEOUT_MS)
  @Max(MAX_TIMEOUT_MS)
  timeout_ms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  max_attempts?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/** Le secret se change via `POST :id/rotate-secret`, l'organisation est figée. */
export class UpdateIntegrationEndpointDto extends PartialType(
  OmitType(CreateIntegrationEndpointDto, [
    'organization_id',
    'secret',
  ] as const),
) {}

export class RotateSecretDto {
  /** Secret imposé (sinon généré). */
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret?: string;
}

/** Portée d'organisation optionnelle des routes d'administration. */
export class OrganizationScopeQueryDto {
  @IsOptional()
  @IsMongoId()
  organization_id?: string;
}

export class IntegrationEndpointQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(IntegrationEndpointKind)
  kind?: IntegrationEndpointKind;

  @IsOptional()
  @Type(() => String)
  @Matches(/^(true|false)$/)
  is_active?: string;
}
