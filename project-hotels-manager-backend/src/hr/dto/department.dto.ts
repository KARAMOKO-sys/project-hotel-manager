import { PartialType, OmitType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateDepartmentDto {
  @IsMongoId()
  property_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code!: string;

  @IsOptional()
  @IsMongoId()
  manager_staff_id?: string;

  @IsOptional()
  @IsMongoId()
  parent_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateDepartmentDto extends PartialType(
  OmitType(CreateDepartmentDto, ['property_id'] as const),
) {}

export class DepartmentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  parent_id?: string;
}
