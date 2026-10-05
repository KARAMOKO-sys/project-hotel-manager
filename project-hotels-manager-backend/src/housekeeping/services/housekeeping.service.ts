import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  Housekeeping,
  HousekeepingDocument,
} from '../schemas/housekeeping.entity';
import { CreateHousekeepingDto } from '../dto/create-housekeeping.dto';
import { UpdateHousekeepingDto } from '../dto/update-housekeeping.dto';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

/**
 * Service de gestion des tâches de ménage.
 */
@Injectable()
export class HousekeepingService extends BaseCrudService<
  Housekeeping,
  CreateHousekeepingDto,
  UpdateHousekeepingDto
> {
  constructor(
    @InjectModel(Housekeeping.name)
    protected readonly housekeepingModel: Model<HousekeepingDocument>,
  ) {
    super(housekeepingModel, Housekeeping.name);
  }

  /** Assigne la tâche à un membre du personnel. */
  async assignTask(id: string, staffId: string): Promise<Housekeeping> {
    return this.update(id, {
      staff_id: staffId,
    } as UpdateHousekeepingDto);
  }

  /** Démarre l'exécution de la tâche. */
  async startTask(id: string): Promise<Housekeeping> {
    return this.update(id, {
      status: TaskStatus.IN_PROGRESS,
    } as UpdateHousekeepingDto);
  }

  /** Marque la tâche comme terminée et attache d'éventuelles photos. */
  async completeTask(id: string, photos?: string[]): Promise<Housekeeping> {
    return this.update(id, {
      status: TaskStatus.COMPLETED,
      completed_at: new Date(),
      photos,
    } as unknown as UpdateHousekeepingDto);
  }

  /** Saute une tâche (chambre occupée, etc.). */
  async skipTask(id: string, reason?: string): Promise<Housekeeping> {
    return this.update(id, {
      status: TaskStatus.SKIPPED,
      skipped_reason: reason,
    } as UpdateHousekeepingDto);
  }

  /** Liste les tâches d'un employé pour une date donnée. */
  async getTasksByStaff(staffId: string, date?: Date): Promise<Housekeeping[]> {
    const filter: Record<string, any> = {
      staff_id: new Types.ObjectId(staffId),
      is_deleted: { $ne: true },
    };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.task_date = { $gte: start, $lte: end };
    }
    return this.housekeepingModel.find(filter).exec() as unknown as Promise<
      Housekeeping[]
    >;
  }

  /** Historique des tâches d'une chambre. */
  async getTasksByRoom(roomId: string): Promise<Housekeeping[]> {
    return this.housekeepingModel
      .find({ room_id: new Types.ObjectId(roomId), is_deleted: { $ne: true } })
      .exec() as unknown as Promise<Housekeeping[]>;
  }

  /** Liste les tâches en attente d'une propriété. */
  async getPendingTasks(propertyId: string): Promise<Housekeeping[]> {
    return this.housekeepingModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        status: TaskStatus.PENDING,
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Housekeeping[]>;
  }
}
