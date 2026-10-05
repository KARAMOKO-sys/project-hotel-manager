import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * DTO de pagination et de tri réutilisable pour toutes les routes de liste.
 *
 * Il est attendu en `@Query()` et convertit automatiquement les chaînes de
 * caractères de la requête HTTP en nombres grâce à `@Type(() => Number)`.
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  /**
   * Champ de tri au format MongoDB. Exemples :
   *  - `created_at` (croissant)
   *  - `-created_at` (décroissant)
   *  - `name` (croissant)
   */
  @IsOptional()
  @IsString()
  sort?: string;

  /** Terme de recherche libre (implémenté par les services qui le supportent). */
  @IsOptional()
  @IsString()
  search?: string;
}
