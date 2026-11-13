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
import { PosTransactionService } from '../services/pos-transaction.service';
import { CreatePosTransactionDto } from '../dto/create-pos-transaction.dto';
import { UpdatePosTransactionDto } from '../dto/update-pos-transaction.dto';
import {
  PosTransactionQueryDto,
  RefundPosTransactionDto,
  SettlePosTransactionDto,
  TopSellingQueryDto,
  VoidPosTransactionDto,
} from '../dto/pos-transaction-actions.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('pos-transactions')
export class PosTransactionController {
  constructor(private readonly posTransactionService: PosTransactionService) {}

  @Post()
  create(@Body() createPosTransactionDto: CreatePosTransactionDto) {
    return this.posTransactionService.create(createPosTransactionDto);
  }

  @Get()
  findAll(@Query() query: PosTransactionQueryDto) {
    return this.posTransactionService.findAll(query);
  }

  @Get('number/:number')
  findByNumber(@Param('number') transactionNumber: string) {
    return this.posTransactionService.findByNumber(transactionNumber);
  }

  @Get('reservation/:reservationId/room-charges')
  getRoomCharges(@Param('reservationId') reservationId: string) {
    return this.posTransactionService.getRoomCharges(reservationId);
  }

  @Get('reservation/:reservationId')
  findByReservation(
    @Param('reservationId') reservationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.posTransactionService.findByReservation(reservationId, query);
  }

  @Get('guest/:guestId')
  findByGuest(
    @Param('guestId') guestId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.posTransactionService.findByGuest(guestId, query);
  }

  @Get('property/:propertyId/daily-sales')
  getDailySales(
    @Param('propertyId') propertyId: string,
    @Query('date') date?: string,
  ) {
    return this.posTransactionService.getDailySales(
      propertyId,
      date ? new Date(date) : undefined,
    );
  }

  @Get('property/:propertyId/top-items')
  getTopSellingItems(
    @Param('propertyId') propertyId: string,
    @Query() query: TopSellingQueryDto,
  ) {
    return this.posTransactionService.getTopSellingItems(
      propertyId,
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
      query.limit,
    );
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.posTransactionService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updatePosTransactionDto: UpdatePosTransactionDto,
  ) {
    return this.posTransactionService.update(
      params.id,
      updatePosTransactionDto,
    );
  }

  @Patch(':id/void')
  void(@Param() params: IdParamDto, @Body() body: VoidPosTransactionDto) {
    return this.posTransactionService.void(params.id, body.reason);
  }

  @Patch(':id/refund')
  refund(@Param() params: IdParamDto, @Body() body: RefundPosTransactionDto) {
    return this.posTransactionService.refund(params.id, body);
  }

  @Patch(':id/settle')
  settle(@Param() params: IdParamDto, @Body() body: SettlePosTransactionDto) {
    return this.posTransactionService.settle(params.id, body.invoice_id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.posTransactionService.remove(params.id);
  }
}
