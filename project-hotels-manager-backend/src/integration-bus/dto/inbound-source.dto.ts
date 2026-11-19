import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
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
import { WebhookProvider } from '../../webhook-log/schemas/webhook-log.entity';
import { InboundSignatureScheme } from '../schemas/integration-inbound-source.entity';

const HEADER_NAME_REGEX = /^[A-Za-z0-9-]{1,100}$/;
const PATH_REGEX = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;

export class CreateInboundSourceDto {
  @ValidateIf((dto: CreateInboundSourceDto) => !dto.property_id)
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsEnum(WebhookProvider)
  provider?: WebhookProvider;

  /** Secret partagé avec le fournisseur (généré si absent). */
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret?: string;

  @IsOptional()
  @IsEnum(InboundSignatureScheme)
  signature_scheme?: InboundSignatureScheme;

  @ValidateIf(
    (dto: CreateInboundSourceDto) =>
      dto.signature_scheme === InboundSignatureScheme.HMAC_SHA256_HEX_HEADER ||
      dto.signature_header !== undefined,
  )
  @IsString()
  @Matches(HEADER_NAME_REGEX, { message: 'Nom d’en-tête invalide' })
  signature_header?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  signature_prefix?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3600)
  tolerance_seconds?: number;

  @IsOptional()
  @IsString()
  @Matches(PATH_REGEX)
  @MaxLength(100)
  event_id_path?: string;

  @IsOptional()
  @IsString()
  @Matches(PATH_REGEX)
  @MaxLength(100)
  event_type_path?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateInboundSourceDto extends PartialType(
  OmitType(CreateInboundSourceDto, ['organization_id', 'secret'] as const),
) {}

export class InboundSourceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(WebhookProvider)
  provider?: WebhookProvider;
}
