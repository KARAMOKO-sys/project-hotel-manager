import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  MaintenanceRequest,
  MaintenanceRequestDocument,
} from '../schemas/maintenance-request.entity';
import { CreateMaintenanceRequestDto } from '../dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from '../dto/update-maintenance-request.dto';
import { TaskPriority } from '../../base-entities/enums/task-priority.enum';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

/**
 * Service de gestion des demandes de maintenance.
 */
@Injectable()
export class MaintenanceRequestService extends BaseCrudService<
  MaintenanceRequest,
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto
> {
  constructor(
    @InjectModel(MaintenanceRequest.name)
    protected readonly maintenanceRequestModel: Model<MaintenanceRequestDocument>,
  ) {
    super(maintenanceRequestModel, MaintenanceRequest.name);
  }

  /** Assigne la demande à un technicien. */
  async assignRequest(
    id: string,
    staffId: string,
  ): Promise<MaintenanceRequest> {
    return this.update(id, {
      staff_id: staffId,
    } as UpdateMaintenanceRequestDto);
  }

  /** Démarre l'intervention. */
  async startRequest(id: string): Promise<MaintenanceRequest> {
    return this.update(id, {
      status: TaskStatus.IN_PROGRESS,
    } as UpdateMaintenanceRequestDto);
  }

  /** Termine l'intervention et note la résolution. */
  async completeRequest(
    id: string,
    resolution?: string,
  ): Promise<MaintenanceRequest> {
    return this.update(id, {
      status: TaskStatus.COMPLETED,
      completed_at: new Date(),
      resolution,
    } as unknown as UpdateMaintenanceRequestDto);
  }

  /** Annule une demande de maintenance. */
  async cancelRequest(
    id: string,
    reason?: string,
  ): Promise<MaintenanceRequest> {
    return this.update(id, {
      status: TaskStatus.SKIPPED,
      cancelled_reason: reason,
    } as UpdateMaintenanceRequestDto);
  }

  /** Liste les demandes d'une propriété. */
  async getRequestsByProperty(
    propertyId: string,
  ): Promise<MaintenanceRequest[]> {
    return this.maintenanceRequestModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<MaintenanceRequest[]>;
  }

  /** Liste les demandes urgentes (non terminées). */
  async getUrgentRequests(propertyId: string): Promise<MaintenanceRequest[]> {
    return this.maintenanceRequestModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        priority: TaskPriority.URGENT,
        status: { $ne: TaskStatus.COMPLETED },
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<MaintenanceRequest[]>;
  }
}
