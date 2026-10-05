// src/modules/roles/dto/role-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { RoleLevel } from '../schemas/role.schema';

export class RoleResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  role_level!: RoleLevel;

  @ApiProperty()
  is_system!: boolean;

  @ApiProperty()
  permissions!: string[];

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
