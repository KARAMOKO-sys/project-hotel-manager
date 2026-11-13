import {
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Corps de la route de changement de mot de passe. */
export class ChangePartnerPasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  new_password!: string;
}

/** Corps de la route d'approbation d'un partenaire. */
export class ApprovePartnerDto {
  /** Identifiant de l'administrateur ayant approuvé le dossier. */
  @IsOptional()
  @IsMongoId()
  verified_by?: string;
}

/** Corps des routes nécessitant une raison obligatoire (rejet, blocage). */
export class PartnerReasonDto {
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export class SuspendPartnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Corps de la route de modification du taux de commission. */
export class CommissionRateDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commission_rate!: number;
}

/** Corps de la route de modification de la limite de propriétés. */
export class MaxPropertiesDto {
  @IsInt()
  @Min(0)
  @Max(999)
  max_properties!: number;
}

/** Corps de la route d'enregistrement d'une réservation apportée. */
export class RecordPartnerBookingDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}

/** Corps de la route d'association d'une propriété. */
export class PartnerPropertyDto {
  @IsMongoId()
  property_id!: string;
}

/** Corps de la route d'ajout d'un avis. */
export class PartnerReviewDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  rating!: number;
}
