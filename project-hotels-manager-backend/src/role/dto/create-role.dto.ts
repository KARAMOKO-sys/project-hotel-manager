// src/modules/roles/dto/create-role.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Length,
} from 'class-validator';
import { RoleLevel } from '../schemas/role.schema';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Nom du rôle',
    example: 'Super Administrateur',
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({
    description: 'Code unique du rôle',
    example: 'super_admin',
    maxLength: 50,
  })
  @IsString()
  @Length(2, 50)
  code!: string;

  @ApiPropertyOptional({
    description: 'Description du rôle',
    example: 'Administrateur système avec accès complet',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Niveau du rôle (0-4)',
    enum: RoleLevel,
    default: RoleLevel.STAFF,
  })
  @IsOptional()
  @IsEnum(RoleLevel)
  role_level?: RoleLevel;

  @ApiPropertyOptional({
    description: 'Est un rôle système',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_system?: boolean;

  @ApiPropertyOptional({
    description: 'Liste des permissions',
    example: ['*'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    description: 'Métadonnées supplémentaires',
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Est actif',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
