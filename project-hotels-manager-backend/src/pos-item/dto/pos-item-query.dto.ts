import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PosCategory } from '../schemas/pos-item.entity';

/** Filtres de liste des articles POS. */
export class PosItemQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsEnum(PosCategory)
  category?: PosCategory;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  is_active?: boolean;
}
