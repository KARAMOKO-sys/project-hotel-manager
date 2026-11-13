import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';

/** Préférences du client (type de lit, vue, flexibilité des dates…). */
export class WaitlistPreferencesDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  alternative_room_type_ids?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bed_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  view?: string;

  @IsOptional()
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsBoolean()
  smoking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(14)
  date_flexibility_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** DTO d'ajout d'un client en liste d'attente (`addToWaitlist`). */
export class CreateWaitlistDto {
  @IsMongoId()
  property_id!: string;

  @IsMongoId()
  guest_id!: string;

  @IsOptional()
  @IsMongoId()
  room_type_id?: string;

  @IsDateString()
  check_in!: string;

  @IsDateString()
  check_out!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => WaitlistPreferencesDto)
  preferences?: WaitlistPreferencesDto;

  /** Niveau de fidélité du client, utilisé pour calculer la priorité. */
  @IsOptional()
  @IsEnum(LoyaltyTier)
  loyalty_tier?: LoyaltyTier;

  /** Bonus de priorité manuel (geste commercial, VIP…). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  priority_boost?: number;

  @IsOptional()
  @IsEnum(NotificationChannel)
  notification_channel?: NotificationChannel;

  @IsOptional()
  @IsEmail()
  contact_email?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;
}
