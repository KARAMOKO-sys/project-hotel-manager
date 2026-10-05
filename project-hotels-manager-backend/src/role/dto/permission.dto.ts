// src/modules/roles/dto/permission.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class PermissionDto {
  @ApiProperty({
    description: 'Liste des permissions à vérifier',
    example: ['users:manage', 'properties:manage'],
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class PermissionCheckResponseDto {
  @ApiProperty()
  has_all!: boolean;

  @ApiProperty()
  has_any!: boolean;

  @ApiProperty()
  granted!: string[];

  @ApiProperty()
  missing!: string[];
}
