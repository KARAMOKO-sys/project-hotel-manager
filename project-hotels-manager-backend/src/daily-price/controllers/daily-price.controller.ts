import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { DailyPriceService } from '../services/daily-price.service';
import { CreateDailyPriceDto } from '../dto/create-daily-price.dto';
import { UpdateDailyPriceDto } from '../dto/update-daily-price.dto';
import {
  BulkSetDailyPriceDto,
  PriceCalendarQueryDto,
  StayPriceQueryDto,
} from '../dto/daily-price-actions.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('daily-prices')
export class DailyPriceController {
  constructor(private readonly dailyPriceService: DailyPriceService) {}

  @Post()
  create(@Body() createDailyPriceDto: CreateDailyPriceDto) {
    return this.dailyPriceService.create(createDailyPriceDto);
  }

  @Put()
  setPrice(@Body() dto: CreateDailyPriceDto) {
    return this.dailyPriceService.setPrice(dto);
  }

  @Post('bulk')
  bulkSetPrices(@Body() dto: BulkSetDailyPriceDto) {
    return this.dailyPriceService.bulkSetPrices(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.dailyPriceService.findAll(query);
  }

  @Get('room-type/:roomTypeId/calendar')
  getCalendar(
    @Param('roomTypeId') roomTypeId: string,
    @Query() query: PriceCalendarQueryDto,
  ) {
    return this.dailyPriceService.getCalendar(
      roomTypeId,
      query.start_date,
      query.end_date,
      query.rate_plan_id,
    );
  }

  @Get('room-type/:roomTypeId/stay')
  calculateStayPrice(
    @Param('roomTypeId') roomTypeId: string,
    @Query() query: StayPriceQueryDto,
  ) {
    return this.dailyPriceService.calculateStayPrice(
      roomTypeId,
      query.check_in,
      query.check_out,
      query.rate_plan_id,
    );
  }

  @Get('room-type/:roomTypeId/date/:date')
  getPriceForDate(
    @Param('roomTypeId') roomTypeId: string,
    @Param('date') date: string,
    @Query('rate_plan_id') ratePlanId?: string,
  ) {
    return this.dailyPriceService.getPriceForDate(roomTypeId, date, ratePlanId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.dailyPriceService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateDailyPriceDto: UpdateDailyPriceDto,
  ) {
    return this.dailyPriceService.update(params.id, updateDailyPriceDto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.dailyPriceService.remove(params.id);
  }
}
