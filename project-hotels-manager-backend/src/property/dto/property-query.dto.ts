import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PropertyType } from '../../base-entities/enums/property-type.enum';

/**
 * Paramètres de liste des propriétés : pagination + filtres métier.
 *
 * Exemple : `GET /properties?type=hotel&city=Abidjan&search=plaza&page=2`
 */
export class PropertyQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  /** Ville (insensible à la casse, correspondance partielle). */
  @IsOptional()
  @IsString()
  city?: string;

  /** Ne retourne que les propriétés actives (`is_active` + statut `active`). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  active?: boolean;
}
