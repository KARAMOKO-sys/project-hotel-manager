import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIP,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class AuditChangeDto {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsOptional()
  old_value?: unknown;

  @IsOptional()
  new_value?: unknown;
}

export class CreateAuditLogDto {
  @IsOptional()
  @IsMongoId()
  actor_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  actor_type?: string;

  @IsOptional()
  @IsEmail()
  actor_email?: string;

  /** Voir `AuditAction` pour les valeurs courantes. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entity_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  entity_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsObject()
  old_values?: Record<string, any>;

  @IsOptional()
  @IsObject()
  new_values?: Record<string, any>;

  /** Calculé automatiquement à partir de old/new_values si absent. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuditChangeDto)
  changes?: AuditChangeDto[];

  @IsOptional()
  @IsIP()
  ip_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  user_agent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  request_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
