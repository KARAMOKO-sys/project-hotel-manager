import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  GuestRequest,
  GuestRequestDocument,
} from '../schemas/guest-request.entity';
import { CreateGuestRequestDto } from '../dto/create-guest-request.dto';
import { UpdateGuestRequestDto } from '../dto/update-guest-request.dto';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

/**
 * Service de gestion des demandes clients (room service, réveil…).
 */
@Injectable()
export class GuestRequestService extends BaseCrudService<
  GuestRequest,
  CreateGuestRequestDto,
  UpdateGuestRequestDto
> {
  constructor(
    @InjectModel(GuestRequest.name)
    protected readonly guestRequestModel: Model<GuestRequestDocument>,
  ) {
    super(guestRequestModel, GuestRequest.name);
  }

  /** Assigne la demande à un membre du personnel. */
  async assign(id: string, staffId: string): Promise<GuestRequest> {
    return this.update(id, {
      staff_id: staffId,
    } as UpdateGuestRequestDto);
  }

  /** Marque la demande comme traitée. */
  async complete(id: string): Promise<GuestRequest> {
    return this.update(id, {
      status: TaskStatus.COMPLETED,
      completed_at: new Date(),
    } as unknown as UpdateGuestRequestDto);
  }

  /** Annule une demande. */
  async cancel(id: string, reason?: string): Promise<GuestRequest> {
    return this.update(id, {
      status: TaskStatus.SKIPPED,
      cancelled_reason: reason,
    } as UpdateGuestRequestDto);
  }

  /** Historique des demandes d'un client. */
  async getRequestsByGuest(guestId: string): Promise<GuestRequest[]> {
    return this.guestRequestModel
      .find({
        guest_id: new Types.ObjectId(guestId),
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<GuestRequest[]>;
  }

  /** Demandes rattachées à une chambre. */
  async getRequestsByRoom(roomId: string): Promise<GuestRequest[]> {
    return this.guestRequestModel
      .find({ room_id: new Types.ObjectId(roomId), is_deleted: { $ne: true } })
      .exec() as unknown as Promise<GuestRequest[]>;
  }

  /** Demandes en attente d'une propriété. */
  async getPendingRequests(propertyId: string): Promise<GuestRequest[]> {
    return this.guestRequestModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        status: TaskStatus.PENDING,
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<GuestRequest[]>;
  }
}
