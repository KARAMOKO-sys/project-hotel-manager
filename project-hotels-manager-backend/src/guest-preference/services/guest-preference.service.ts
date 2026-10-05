import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  GuestPreference,
  GuestPreferenceDocument,
} from '../schemas/guest-preference.entity';
import { CreateGuestPreferenceDto } from '../dto/create-guest-preference.dto';
import { UpdateGuestPreferenceDto } from '../dto/update-guest-preference.dto';

/**
 * Service de gestion des préférences clients.
 */
@Injectable()
export class GuestPreferenceService extends BaseCrudService<
  GuestPreference,
  CreateGuestPreferenceDto,
  UpdateGuestPreferenceDto
> {
  constructor(
    @InjectModel(GuestPreference.name)
    protected readonly guestPreferenceModel: Model<GuestPreferenceDocument>,
  ) {
    super(guestPreferenceModel, GuestPreference.name);
  }

  /** Liste toutes les préférences d'un client. */
  async findByGuest(guestId: string): Promise<GuestPreference[]> {
    return this.guestPreferenceModel
      .find({
        guest_id: new Types.ObjectId(guestId),
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<GuestPreference[]>;
  }

  /** Met à jour (ou crée) une préférence spécifique d'un client. */
  async updatePreference(
    guestId: string,
    preferenceType: string,
    value?: string,
  ): Promise<GuestPreference> {
    const updated = await this.guestPreferenceModel
      .findOneAndUpdate(
        {
          guest_id: new Types.ObjectId(guestId),
          preference_type: preferenceType,
        },
        { value, is_deleted: false },
        { new: true, upsert: true, runValidators: true },
      )
      .exec();
    return updated as unknown as GuestPreference;
  }

  /** Supprime une préférence spécifique d'un client. */
  async deletePreference(
    guestId: string,
    preferenceType: string,
  ): Promise<GuestPreference | null> {
    return this.guestPreferenceModel
      .findOneAndDelete({
        guest_id: new Types.ObjectId(guestId),
        preference_type: preferenceType,
      })
      .exec() as unknown as Promise<GuestPreference | null>;
  }

  /** Retourne les préférences servant de base aux recommandations. */
  async getRecommendations(guestId: string): Promise<GuestPreference[]> {
    return this.findByGuest(guestId);
  }
}
