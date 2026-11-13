import {
  IsDateString,
  IsEnum,
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
import { OwnerSubscriptionPlan } from '../schemas/owner.entity';

/** Corps de la route de changement de mot de passe. */
export class ChangeOwnerPasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  new_password!: string;
}

/** Corps de la route de validation d'un propriétaire. */
export class VerifyOwnerDto {
  /** Identifiant de l'administrateur ayant validé le dossier. */
  @IsOptional()
  @IsMongoId()
  verified_by?: string;
}

/** Corps de la route de rejet d'un dossier propriétaire. */
export class RejectOwnerDto {
  @IsString()
  @Length(3, 500)
  reason!: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export class SuspendOwnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Corps de la route d'association d'une propriété. */
export class OwnerPropertyDto {
  @IsMongoId()
  property_id!: string;
}

/** Corps de la route de changement d'abonnement. */
export class UpdateOwnerSubscriptionDto {
  @IsEnum(OwnerSubscriptionPlan)
  subscription_plan!: OwnerSubscriptionPlan;

  @IsOptional()
  @IsDateString()
  subscription_expires_at?: string;

  /** Surcharge du nombre maximal de propriétés (sinon : limite du plan). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  max_properties?: number;
}

/** Corps de la route d'ajout de chiffre d'affaires. */
export class AddOwnerRevenueDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}
