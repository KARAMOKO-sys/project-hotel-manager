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
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.paymentService.findAll(query);
  }

  @Get('transaction/:transactionId')
  findByTransactionId(@Param('transactionId') transactionId: string) {
    return this.paymentService.findByTransactionId(transactionId);
  }

  @Get('reservation/:reservationId')
  findByReservation(
    @Param('reservationId') reservationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.paymentService.findByReservation(reservationId, query);
  }

  @Get('guest/:guestId')
  findByGuest(
    @Param('guestId') guestId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.paymentService.findByGuest(guestId, query);
  }

  @Get('property/:propertyId/cashup')
  getDailyCashup(
    @Param('propertyId') propertyId: string,
    @Query('date') date?: string,
  ) {
    return this.paymentService.getDailyCashup(
      propertyId,
      date ? new Date(date) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.paymentService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.paymentService.update(params.id, updatePaymentDto);
  }

  @Patch(':id/complete')
  markAsCompleted(@Param() params: IdParamDto) {
    return this.paymentService.markAsCompleted(params.id);
  }

  @Patch(':id/refund')
  refund(
    @Param() params: IdParamDto,
    @Body() body: { amount: number; reason?: string },
  ) {
    return this.paymentService.refund(params.id, body.amount, body.reason);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.paymentService.remove(params.id);
  }
}
