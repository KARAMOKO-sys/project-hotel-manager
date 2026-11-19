import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { Vendor } from '../schemas/vendor.entity';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorQueryDto,
} from '../dto/vendor.dto';
import {
  escapeRegex,
  isDuplicateKeyError,
} from '../../inventory/inventory.utils';

/** Fournisseurs. */
@Injectable()
export class VendorService extends BaseCrudService<
  Vendor,
  CreateVendorDto,
  UpdateVendorDto
> {
  constructor(
    @InjectModel(Vendor.name) protected readonly vendorModel: Model<Vendor>,
  ) {
    super(vendorModel, Vendor.name);
  }

  async create(dto: CreateVendorDto): Promise<Vendor> {
    try {
      return await super.create(dto);
    } catch (error) {
      throw this.mapDuplicate(error);
    }
  }

  async update(id: string, dto: UpdateVendorDto): Promise<Vendor> {
    try {
      return await super.update(id, dto);
    } catch (error) {
      throw this.mapDuplicate(error);
    }
  }

  async findAll(
    query: VendorQueryDto,
    filter: QueryFilter<Vendor> = {},
  ): Promise<PaginatedResult<Vendor>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.is_active !== undefined) criteria.is_active = query.is_active;
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
      criteria.$or = [
        { name: pattern },
        { code: pattern },
        { 'contact.email': pattern },
      ];
    }
    return super.findAll(query, criteria);
  }

  protected getDefaultSort(): string {
    return 'name';
  }

  /** Fournisseur actif d'un établissement (400/404 sinon). */
  async getForProperty(vendorId: string, propertyId: string): Promise<Vendor> {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Fournisseur invalide');
    }
    const vendor = (await this.vendorModel
      .findOne({ _id: new Types.ObjectId(vendorId), is_deleted: { $ne: true } })
      .lean()
      .exec()) as unknown as Vendor | null;
    if (!vendor) throw new NotFoundException('Fournisseur introuvable');
    if (String(vendor.property_id) !== String(propertyId)) {
      throw new BadRequestException(
        "Ce fournisseur n'appartient pas à cet établissement",
      );
    }
    return vendor;
  }

  /** Noms des fournisseurs, indexés par identifiant. */
  async namesById(
    ids: Array<string | Types.ObjectId>,
  ): Promise<Map<string, string>> {
    const valid = ids
      .map(String)
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const rows = (await this.vendorModel
      .find({ _id: { $in: valid } })
      .select('name')
      .lean()
      .exec()) as unknown as Array<{ _id: Types.ObjectId; name: string }>;
    return new Map(rows.map((row) => [String(row._id), row.name]));
  }

  private mapDuplicate(error: unknown) {
    if (isDuplicateKeyError(error)) {
      return new ConflictException(
        'Ce code fournisseur est déjà utilisé dans cet établissement',
      );
    }
    return error;
  }
}
