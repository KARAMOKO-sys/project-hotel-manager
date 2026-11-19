import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class PurchasePropertyQueryDto {
  @IsMongoId()
  property_id!: string;
}

export class UpdatePurchaseSettingsDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  approval_threshold?: number;

  @IsOptional()
  @IsBoolean()
  auto_reorder?: boolean;
}

export class PurchasePeriodQueryDto extends PurchasePropertyQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class BillsDueQueryDto extends PurchasePropertyQueryDto {
  /** Échéances jusqu'à cette date (par défaut : toutes). */
  @IsOptional()
  @IsDateString()
  until?: string;
}
