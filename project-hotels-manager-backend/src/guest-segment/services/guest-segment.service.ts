import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  GuestSegment,
  GuestSegmentDocument,
} from '../schemas/guest-segment.entity';
import { CreateGuestSegmentDto } from '../dto/create-guest-segment.dto';
import { UpdateGuestSegmentDto } from '../dto/update-guest-segment.dto';

/**
 * Service de segmentation des clients.
 */
@Injectable()
export class GuestSegmentService extends BaseCrudService<
  GuestSegment,
  CreateGuestSegmentDto,
  UpdateGuestSegmentDto
> {
  constructor(
    @InjectModel(GuestSegment.name)
    protected readonly guestSegmentModel: Model<GuestSegmentDocument>,
  ) {
    super(guestSegmentModel, GuestSegment.name);
  }

  /** Liste les segments d'une propriété (paginé). */
  findByProperty(propertyId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      property_id: new Types.ObjectId(propertyId),
    });
  }

  /** Active un segment. */
  async activate(id: string): Promise<GuestSegment> {
    return this.update(id, { is_active: true } as UpdateGuestSegmentDto);
  }

  /** Désactive un segment. */
  async deactivate(id: string): Promise<GuestSegment> {
    return this.update(id, { is_active: false } as UpdateGuestSegmentDto);
  }

  /** Statistiques simples d'un segment. */
  async getStatistics(id: string): Promise<{
    member_count: number;
    is_active: boolean;
    criteria: Record<string, any>;
  }> {
    const segment = await this.findOne(id);
    return {
      member_count: segment.member_count,
      is_active: segment.is_active,
      criteria: segment.criteria,
    };
  }
}
