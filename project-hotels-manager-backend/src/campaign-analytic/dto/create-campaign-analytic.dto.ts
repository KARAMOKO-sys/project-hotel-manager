import {
  IsEnum,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CampaignEvent } from '../schemas/campaign-analytic.entity';

export class CreateCampaignAnalyticDto {
  @IsMongoId()
  campaign_id!: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsEnum(CampaignEvent)
  event!: CampaignEvent;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
