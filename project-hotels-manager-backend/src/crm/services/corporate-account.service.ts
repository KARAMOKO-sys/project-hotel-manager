import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { CorporateAccount } from '../schemas/corporate-account.entity';
import {
  CorporateAccountQueryDto,
  CreateCorporateAccountDto,
  UpdateCorporateAccountDto,
} from '../dto/corporate-account.dto';
import { escapeRegex, toObjectId } from '../crm.utils';

/** Comptes entreprises (contrats corporate). */
@Injectable()
export class CorporateAccountService extends BaseCrudService<
  CorporateAccount,
  CreateCorporateAccountDto,
  UpdateCorporateAccountDto
> {
  constructor(
    @InjectModel(CorporateAccount.name)
    protected readonly accountModel: Model<CorporateAccount>,
  ) {
    super(accountModel, CorporateAccount.name);
  }

  async findAll(
    query: CorporateAccountQueryDto,
  ): Promise<PaginatedResult<CorporateAccount>> {
    const filter: QueryFilter<CorporateAccount> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.is_active !== undefined) filter.is_active = query.is_active;
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [
        { name: regex },
        { tax_id: regex },
        { industry: regex },
        { 'contacts.name': regex },
        { 'contacts.email': regex },
      ];
    }
    return super.findAll({ ...query, sort: query.sort ?? 'name' }, filter);
  }
}
