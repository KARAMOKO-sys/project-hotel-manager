import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PurchaseSettings } from '../schemas/purchase-settings.entity';
import { UpdatePurchaseSettingsDto } from '../dto/purchase-settings.dto';
import { DEFAULT_APPROVAL_THRESHOLD } from '../purchase.utils';
import { toObjectId } from '../../inventory/inventory.utils';

export interface PurchaseSettingsView {
  property_id: string;
  approval_threshold: number;
  auto_reorder: boolean;
}

/** Paramètres d'achat par établissement (valeurs par défaut si absents). */
@Injectable()
export class PurchaseSettingsService {
  constructor(
    @InjectModel(PurchaseSettings.name)
    private readonly settingsModel: Model<PurchaseSettings>,
  ) {}

  async get(propertyId: string): Promise<PurchaseSettingsView> {
    const doc = (await this.settingsModel
      .findOne({ property_id: toObjectId(propertyId, 'Établissement') })
      .lean()
      .exec()) as unknown as PurchaseSettings | null;
    return {
      property_id: propertyId,
      approval_threshold: doc?.approval_threshold ?? DEFAULT_APPROVAL_THRESHOLD,
      auto_reorder: doc?.auto_reorder ?? true,
    };
  }

  async update(
    dto: UpdatePurchaseSettingsDto,
    actorId?: string,
  ): Promise<PurchaseSettingsView> {
    const set: Record<string, unknown> = { updated_by: actorId };
    if (dto.approval_threshold !== undefined) {
      set.approval_threshold = dto.approval_threshold;
    }
    if (dto.auto_reorder !== undefined) set.auto_reorder = dto.auto_reorder;
    await this.settingsModel
      .updateOne(
        { property_id: new Types.ObjectId(dto.property_id) },
        { $set: set },
        { upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    return this.get(dto.property_id);
  }
}
