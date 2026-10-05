import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { RoomType, RoomTypeDocument } from '../schemas/room-type.entity';
import { CreateRoomTypeDto } from '../dto/create-room-type.dto';
import { UpdateRoomTypeDto } from '../dto/update-room-type.dto';
import { Room, RoomDocument } from '../../room/schemas/room.entity';
import { Currency } from '../../base-entities/embeddables/money.embeddable';

/**
 * Service de gestion des types de chambres (Standard, Deluxe, Suite…).
 */
@Injectable()
export class RoomTypeService extends BaseCrudService<
  RoomType,
  CreateRoomTypeDto,
  UpdateRoomTypeDto
> {
  constructor(
    @InjectModel(RoomType.name)
    protected readonly roomTypeModel: Model<RoomTypeDocument>,
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
  ) {
    super(roomTypeModel, RoomType.name);
  }

  /** Liste les types de chambres d'une propriété (paginé). */
  findByProperty(propertyId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      property_id: new Types.ObjectId(propertyId),
    });
  }

  /** Met à jour le prix de base du type de chambre. */
  async updateBasePrice(
    id: string,
    amount: number,
    currency?: string,
  ): Promise<RoomType> {
    const roomType = await this.findOne(id);
    roomType.base_price.amount = amount;
    if (currency) {
      roomType.base_price.currency = currency as Currency;
    }
    await roomType.save();
    return roomType;
  }

  /** Liste les chambres rattachées à ce type. */
  async getRooms(id: string): Promise<Room[]> {
    await this.findOne(id);
    return this.roomModel
      .find({
        room_type_id: new Types.ObjectId(id),
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Room[]>;
  }
}
