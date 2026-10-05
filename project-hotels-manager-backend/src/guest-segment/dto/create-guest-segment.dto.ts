import {
  IsBoolean,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateGuestSegmentDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsString()
  @Length(2, 150)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  criteria?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
