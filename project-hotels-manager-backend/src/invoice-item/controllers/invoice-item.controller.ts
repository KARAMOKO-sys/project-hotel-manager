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
import { InvoiceItemService } from '../services/invoice-item.service';
import { CreateInvoiceItemDto } from '../dto/create-invoice-item.dto';
import { UpdateInvoiceItemDto } from '../dto/update-invoice-item.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('invoice-items')
export class InvoiceItemController {
  constructor(private readonly invoiceItemService: InvoiceItemService) {}

  @Post()
  create(@Body() createInvoiceItemDto: CreateInvoiceItemDto) {
    return this.invoiceItemService.create(createInvoiceItemDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.invoiceItemService.findAll(query);
  }

  @Get('invoice/:invoiceId')
  findByInvoice(
    @Param('invoiceId') invoiceId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.invoiceItemService.findByInvoice(invoiceId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.invoiceItemService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateInvoiceItemDto: UpdateInvoiceItemDto,
  ) {
    return this.invoiceItemService.update(params.id, updateInvoiceItemDto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.invoiceItemService.remove(params.id);
  }
}
