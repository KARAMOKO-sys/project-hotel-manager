import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Room, RoomDocument } from '../schemas/room.entity';
import { CreateRoomDto } from '../dto/create-room.dto';
import { UpdateRoomDto } from '../dto/update-room.dto';
import { RoomStatus } from '../../base-entities/enums/room-status.enum';

/**
 * Service de gestion des chambres individuelles.
 */
@Injectable()
export class RoomService extends BaseCrudService<
  Room,
  CreateRoomDto,
  UpdateRoomDto
> {
  constructor(
    @InjectModel(Room.name)
    protected readonly roomModel: Model<RoomDocument>,
  ) {
    super(roomModel, Room.name);
  }

  /** Liste les chambres d'une propriété (paginé). */
  findByProperty(propertyId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      property_id: new Types.ObjectId(propertyId),
    });
  }

  /** Liste les chambres par statut. */
  findByStatus(status: RoomStatus, query: PaginationQueryDto) {
    return this.findAll(query, { status });
  }

  /** Change le statut d'une chambre (propre, sale, maintenance…). */
  async updateStatus(id: string, status: RoomStatus): Promise<Room> {
    return this.update(id, { status } as UpdateRoomDto);
  }

  /** Liste les chambres en maintenance d'une propriété. */
  async getMaintenanceRooms(propertyId: string): Promise<Room[]> {
    return this.roomModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        status: RoomStatus.MAINTENANCE,
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Room[]>;
  }

  /** Bloque une chambre (maintenance, rénovation…). */
  async blockRoom(id: string, reason?: string): Promise<Room> {
    return this.update(id, {
      status: RoomStatus.BLOCKED,
      notes: reason,
    } as UpdateRoomDto);
  }

  /** Liste les chambres disponibles d'une propriété. */
  async getAvailableRooms(propertyId: string): Promise<Room[]> {
    return this.roomModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        status: { $in: [RoomStatus.CLEAN, RoomStatus.INSPECTION] },
        is_active: true,
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Room[]>;
  }
}
