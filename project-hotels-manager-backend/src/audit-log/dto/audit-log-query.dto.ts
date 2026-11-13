import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AuditLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entity_type?: string;

  @IsOptional()
  @IsMongoId()
  actor_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** Période obligatoire pour la recherche par plage de dates. */
export class AuditDateRangeQueryDto extends PaginationQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
