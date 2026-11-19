import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { VendorBillService } from '../services/vendor-bill.service';
import {
  CreateVendorBillDto,
  MarkPaidDto,
  UpdateVendorBillDto,
  VendorBillQueryDto,
} from '../dto/vendor-bill.dto';

@ApiTags('Achats - Factures fournisseurs')
@RequiresApp('purchase')
@Controller('vendor-bills')
export class VendorBillController {
  constructor(private readonly bills: VendorBillService) {}

  @Post()
  create(
    @Body() dto: CreateVendorBillDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.bills.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: VendorBillQueryDto) {
    return this.bills.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.bills.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateVendorBillDto) {
    return this.bills.update(params.id, dto);
  }

  @Post(':id/post')
  post(@Param() params: IdParamDto, @CurrentUser('sub') actorId: string) {
    return this.bills.post(params.id, actorId);
  }

  @Post(':id/mark-paid')
  markPaid(
    @Param() params: IdParamDto,
    @Body() dto: MarkPaidDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.bills.markPaid(params.id, dto, actorId);
  }

  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.bills.cancel(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.bills.remove(params.id);
  }
}
