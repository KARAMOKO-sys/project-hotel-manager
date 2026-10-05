import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Campaign, CampaignDocument } from '../schemas/campaign.entity';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { CampaignStatus } from '../../base-entities/enums/campaign-status.enum';

/**
 * Service de gestion des campagnes marketing.
 */
@Injectable()
export class CampaignService extends BaseCrudService<
  Campaign,
  CreateCampaignDto,
  UpdateCampaignDto
> {
  constructor(
    @InjectModel(Campaign.name)
    protected readonly campaignModel: Model<CampaignDocument>,
  ) {
    super(campaignModel, Campaign.name);
  }

  /** Liste les campagnes d'une propriété (paginé). */
  findByProperty(propertyId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      property_id: new Types.ObjectId(propertyId),
    });
  }

  /** Programme l'envoi d'une campagne. */
  async schedule(id: string, scheduledAt: Date): Promise<Campaign> {
    return this.update(id, {
      status: CampaignStatus.SCHEDULED,
      scheduled_at: scheduledAt,
    } as unknown as UpdateCampaignDto);
  }

  /** Annule une campagne programmée. */
  async cancel(id: string): Promise<Campaign> {
    return this.update(id, {
      status: CampaignStatus.CANCELLED,
    } as UpdateCampaignDto);
  }

  /** Envoie immédiatement la campagne (simulation d'envoi). */
  async send(id: string): Promise<Campaign> {
    return this.update(id, {
      status: CampaignStatus.SENT,
      sent_at: new Date(),
    } as unknown as UpdateCampaignDto);
  }

  /** Statistiques simples d'une campagne. */
  async getStatistics(id: string): Promise<{
    status: CampaignStatus;
    recipient_count: number;
    sent_at?: Date;
  }> {
    const campaign = await this.findOne(id);
    return {
      status: campaign.status,
      recipient_count: campaign.recipient_count,
      sent_at: campaign.sent_at,
    };
  }
}
