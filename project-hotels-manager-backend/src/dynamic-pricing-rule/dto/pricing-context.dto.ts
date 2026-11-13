import {
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/** Données de calcul d'un prix ajusté (`calculateAdjustedPrice`). */
export class CalculateAdjustedPriceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  base_price!: number;

  /** Nuit concernée. */
  @IsDateString()
  date!: string;

  /** Date de réservation (défaut : maintenant). */
  @IsOptional()
  @IsDateString()
  booking_date?: string;

  /** Taux d'occupation prévu de la nuit (%). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  occupancy_rate?: number;

  @IsOptional()
  @IsMongoId()
  room_type_id?: string;
}

export class ValidateRuleDto {
  @IsOptional()
  @IsMongoId()
  validated_by?: string;
}
