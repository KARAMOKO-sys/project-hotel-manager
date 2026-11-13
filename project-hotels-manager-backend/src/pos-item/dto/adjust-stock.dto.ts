import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';

/** Ajustement relatif du stock (positif = réapprovisionnement, négatif = sortie). */
export class AdjustStockDto {
  @IsInt()
  @NotEquals(0)
  delta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

/** Fixe le stock à une valeur absolue (inventaire physique). */
export class SetStockDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}
