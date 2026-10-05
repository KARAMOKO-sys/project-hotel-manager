import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  CampaignAnalytic,
  CampaignAnalyticDocument,
  CampaignEvent,
} from '../schemas/campaign-analytic.entity';
import { CreateCampaignAnalyticDto } from '../dto/create-campaign-analytic.dto';
import { UpdateCampaignAnalyticDto } from '../dto/update-campaign-analytic.dto';

/**
 * Service d'analytics des campagnes (ouvertures, clics, conversions).
 */
@Injectable()
export class CampaignAnalyticService extends BaseCrudService<
  CampaignAnalytic,
  CreateCampaignAnalyticDto,
  UpdateCampaignAnalyticDto
> {
  constructor(
    @InjectModel(CampaignAnalytic.name)
    protected readonly campaignAnalyticModel: Model<CampaignAnalyticDocument>,
  ) {
    super(campaignAnalyticModel, CampaignAnalytic.name);
  }

  /** Enregistre l'ouverture d'un email de campagne. */
  trackOpen(campaignId: string, guestId?: string, ip?: string) {
    return this.create({
      campaign_id: campaignId,
      guest_id: guestId,
      event: CampaignEvent.OPEN,
      ip,
    } as CreateCampaignAnalyticDto);
  }

  /** Enregistre le clic sur un lien. */
  trackClick(campaignId: string, guestId?: string, link?: string) {
    return this.create({
      campaign_id: campaignId,
      guest_id: guestId,
      event: CampaignEvent.CLICK,
      link,
    } as CreateCampaignAnalyticDto);
  }

  /** Enregistre une conversion (réservation, achat…). */
  trackConversion(
    campaignId: string,
    guestId?: string,
    conversionData?: Record<string, any>,
  ) {
    return this.create({
      campaign_id: campaignId,
      guest_id: guestId,
      event: CampaignEvent.CONVERSION,
      metadata: conversionData,
    } as CreateCampaignAnalyticDto);
  }

  /** Statistiques en temps réel d'une campagne (nombre d'événements par type). */
  async getRealtimeStats(campaignId: string): Promise<{
    opens: number;
    clicks: number;
    conversions: number;
    total: number;
  }> {
    const filter = { campaign_id: new Types.ObjectId(campaignId) };

    const [opens, clicks, conversions, total] = await Promise.all([
      this.campaignAnalyticModel.countDocuments({
        ...filter,
        event: CampaignEvent.OPEN,
      }),
      this.campaignAnalyticModel.countDocuments({
        ...filter,
        event: CampaignEvent.CLICK,
      }),
      this.campaignAnalyticModel.countDocuments({
        ...filter,
        event: CampaignEvent.CONVERSION,
      }),
      this.campaignAnalyticModel.countDocuments(filter),
    ]);

    return { opens, clicks, conversions, total };
  }
}
