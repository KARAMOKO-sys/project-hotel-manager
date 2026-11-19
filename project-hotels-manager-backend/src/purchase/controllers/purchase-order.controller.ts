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
import { PurchaseOrderService } from '../services/purchase-order.service';
import { VendorBillService } from '../services/vendor-bill.service';
import {
  BillPurchaseOrderDto,
  CreatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '../dto/purchase-order.dto';

@ApiTags('Achats - Bons de commande')
@RequiresApp('purchase')
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(
    private readonly orders: PurchaseOrderService,
    private readonly bills: VendorBillService,
  ) {}

  @Post()
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.orders.create(dto, actorId);
  }

  @Get()
  findAll(@Query() query: PurchaseOrderQueryDto) {
    return this.orders.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.orders.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdatePurchaseOrderDto) {
    return this.orders.update(params.id, dto);
  }

  @Post(':id/send')
  send(@Param() params: IdParamDto) {
    return this.orders.send(params.id);
  }

  @Post(':id/confirm')
  confirm(@Param() params: IdParamDto, @CurrentUser('sub') actorId: string) {
    return this.orders.confirm(params.id, actorId);
  }

  /** Permission dérivée : `purchase-orders:approve`. */
  @Post(':id/approve')
  approve(@Param() params: IdParamDto, @CurrentUser('sub') actorId: string) {
    return this.orders.approve(params.id, actorId);
  }

  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.orders.cancel(params.id);
  }

  @Post(':id/receive')
  receive(
    @Param() params: IdParamDto,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.orders.receive(params.id, dto, actorId);
  }

  /** Facture brouillon des quantités reçues non facturées. */
  @Post(':id/bill')
  bill(
    @Param() params: IdParamDto,
    @Body() dto: BillPurchaseOrderDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.bills.createFromOrder(params.id, dto, actorId);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.orders.remove(params.id);
  }
}
