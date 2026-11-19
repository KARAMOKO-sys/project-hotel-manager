import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { Product } from '../schemas/product.entity';
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from '../dto/product.dto';
import { escapeRegex, isDuplicateKeyError } from '../inventory.utils';

/** Fiches articles du stock. */
@Injectable()
export class ProductService extends BaseCrudService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(
    @InjectModel(Product.name) protected readonly productModel: Model<Product>,
  ) {
    super(productModel, Product.name);
  }

  async create(dto: CreateProductDto): Promise<Product> {
    this.assertReorderRange(dto.reorder_min, dto.reorder_max);
    try {
      return await super.create(dto);
    } catch (error) {
      throw this.mapDuplicate(error, dto.sku);
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    if (dto.reorder_min !== undefined || dto.reorder_max !== undefined) {
      const current = await this.findOne(id);
      this.assertReorderRange(
        dto.reorder_min ?? current.reorder_min,
        dto.reorder_max ?? current.reorder_max,
      );
    }
    try {
      return await super.update(id, dto);
    } catch (error) {
      throw this.mapDuplicate(error, dto.sku);
    }
  }

  async findAll(
    query: ProductQueryDto,
    filter: QueryFilter<Product> = {},
  ): Promise<PaginatedResult<Product>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.property_id) {
      criteria.property_id = new Types.ObjectId(query.property_id);
    }
    if (query.category) criteria.category = query.category;
    if (query.product_type) criteria.product_type = query.product_type;
    if (query.preferred_vendor_id) {
      criteria.preferred_vendor_id = new Types.ObjectId(
        query.preferred_vendor_id,
      );
    }
    if (query.is_active !== undefined) criteria.is_active = query.is_active;
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search.trim()), 'i');
      criteria.$or = [{ name: pattern }, { sku: pattern }];
    }
    return super.findAll(query, criteria);
  }

  protected getDefaultSort(): string {
    return 'name';
  }

  private assertReorderRange(min?: number, max?: number) {
    if (min !== undefined && max !== undefined && max > 0 && max < min) {
      throw new BadRequestException(
        'Le stock maximum doit être supérieur ou égal au stock minimum',
      );
    }
  }

  private mapDuplicate(error: unknown, sku?: string) {
    if (isDuplicateKeyError(error)) {
      return new ConflictException(
        `La référence « ${sku?.toUpperCase() ?? ''} » est déjà utilisée dans cet établissement`,
      );
    }
    return error;
  }
}
