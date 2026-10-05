import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { LoyaltyTier } from '../schemas/guest.entity';

export class CreateGuestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  last_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  identification_type?: string;

  @IsOptional()
  @IsString()
  identification_number?: string;

  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;

  @IsOptional()
  @IsEnum(LoyaltyTier)
  loyalty_tier?: LoyaltyTier;

  @IsOptional()
  @IsBoolean()
  marketing_consent?: boolean;
}
