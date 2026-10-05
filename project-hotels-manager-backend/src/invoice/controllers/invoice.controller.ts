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
import { InvoiceService } from '../services/invoice.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { UpdateInvoiceDto } from '../dto/update-invoice.dto';
import { CreateInvoiceItemDto } from '../../invoice-item/dto/create-invoice-item.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(createInvoiceDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.invoiceService.findAll(query);
  }

  @Get('reservation/:reservationId')
  findByReservation(
    @Param('reservationId') reservationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.invoiceService.findByReservation(reservationId, query);
  }

  @Get('guest/:guestId')
  findByGuest(
    @Param('guestId') guestId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.invoiceService.findByGuest(guestId, query);
  }

  @Get('property/:propertyId/outstanding')
  getOutstandingInvoices(@Param('propertyId') propertyId: string) {
    return this.invoiceService.getOutstandingInvoices(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.invoiceService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(params.id, updateInvoiceDto);
  }

  @Patch(':id/paid')
  markAsPaid(@Param() params: IdParamDto) {
    return this.invoiceService.markAsPaid(params.id);
  }

  @Patch(':id/overdue')
  markAsOverdue(@Param() params: IdParamDto) {
    return this.invoiceService.markAsOverdue(params.id);
  }

  @Patch(':id/cancel')
  markAsCancelled(@Param() params: IdParamDto) {
    return this.invoiceService.markAsCancelled(params.id);
  }

  @Post(':id/items')
  addItem(
    @Param() params: IdParamDto,
    @Body() createItemDto: CreateInvoiceItemDto,
  ) {
    return this.invoiceService.addItem(params.id, createItemDto);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Param() params: IdParamDto, @Param('itemId') itemId: string) {
    return this.invoiceService.removeItem(params.id, itemId);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.invoiceService.remove(params.id);
  }
}
