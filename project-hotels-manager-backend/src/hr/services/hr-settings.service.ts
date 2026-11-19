import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HrSettings } from '../schemas/hr-settings.entity';
import { UpsertHrSettingsDto } from '../dto/hr-settings.dto';
import { DEFAULT_WORKING_DAYS, toObjectId } from '../hr.utils';

/** Paramètres RH effectifs d'un établissement. */
export interface EffectiveHrSettings {
  property_id: string;
  working_days: number[];
  public_holidays: { date: string; name?: string }[];
  contract_expiry_alert_days: number;
}

/** Paramètres RH par établissement (un document par établissement). */
@Injectable()
export class HrSettingsService {
  constructor(
    @InjectModel(HrSettings.name)
    private readonly settingsModel: Model<HrSettings>,
  ) {}

  /** Paramètres de l'établissement, ou valeurs par défaut s'il n'y en a pas. */
  async get(propertyId: string | Types.ObjectId): Promise<EffectiveHrSettings> {
    const id = toObjectId(propertyId, 'property_id');
    const doc = await this.settingsModel
      .findOne({ property_id: id, is_deleted: { $ne: true } })
      .lean()
      .exec();
    return {
      property_id: String(id),
      working_days:
        doc?.working_days && doc.working_days.length > 0
          ? [...doc.working_days]
          : [...DEFAULT_WORKING_DAYS],
      public_holidays: (doc?.public_holidays ?? []).map((h) => ({
        date: h.date,
        name: h.name,
      })),
      contract_expiry_alert_days: doc?.contract_expiry_alert_days ?? 30,
    };
  }

  /** Crée ou met à jour les paramètres (upsert idempotent). */
  async upsert(dto: UpsertHrSettingsDto): Promise<EffectiveHrSettings> {
    const id = toObjectId(dto.property_id, 'property_id');
    const $set: Record<string, unknown> = {};
    if (dto.working_days) {
      $set.working_days = [...new Set(dto.working_days)].sort();
    }
    if (dto.public_holidays) {
      const unique = new Map(dto.public_holidays.map((h) => [h.date, h]));
      $set.public_holidays = [...unique.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    }
    if (dto.contract_expiry_alert_days !== undefined) {
      $set.contract_expiry_alert_days = dto.contract_expiry_alert_days;
    }
    await this.settingsModel
      .updateOne(
        { property_id: id },
        { $set, $setOnInsert: { property_id: id, is_deleted: false } },
        { upsert: true, runValidators: true },
      )
      .exec();
    return this.get(id);
  }
}
