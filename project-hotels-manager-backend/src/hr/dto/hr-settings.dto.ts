import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PublicHolidayDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date attendue au format YYYY-MM-DD',
  })
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;
}

export class UpsertHrSettingsDto {
  @IsMongoId()
  property_id!: string;

  /** Jours ouvrés : 0 = dimanche … 6 = samedi. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  working_days?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicHolidayDto)
  public_holidays?: PublicHolidayDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  contract_expiry_alert_days?: number;
}

export class PropertyQueryDto {
  @IsMongoId()
  property_id!: string;
}
