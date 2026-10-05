import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CampaignStatus } from '../../base-entities/enums/campaign-status.enum';
import { CampaignType } from '../../base-entities/enums/campaign-type.enum';

export class CreateCampaignDto {
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsMongoId()
  segment_id?: string;

  @IsString()
  @Length(2, 200)
  name!: string;

  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}
