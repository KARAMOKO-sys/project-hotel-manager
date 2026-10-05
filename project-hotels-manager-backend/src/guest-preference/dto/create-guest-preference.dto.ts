import { IsMongoId, IsOptional, IsString, Length } from 'class-validator';

export class CreateGuestPreferenceDto {
  @IsMongoId()
  guest_id!: string;

  @IsString()
  @Length(1, 100)
  preference_type!: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
