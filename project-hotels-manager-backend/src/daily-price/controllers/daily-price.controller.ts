import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DailyPriceService } from '../services/daily-price.service';
import { CreateDailyPriceDto } from '../dto/create-daily-price.dto';
import { UpdateDailyPriceDto } from '../dto/update-daily-price.dto';

@Controller('daily-price')
export class DailyPriceController {
  constructor(private readonly dailyPriceService: DailyPriceService) {}

  @Post()
  create(@Body() createDailyPriceDto: CreateDailyPriceDto) {
    return this.dailyPriceService.create(createDailyPriceDto);
  }

  @Get()
  findAll() {
    return this.dailyPriceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailyPriceService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDailyPriceDto: UpdateDailyPriceDto,
  ) {
    return this.dailyPriceService.update(+id, updateDailyPriceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dailyPriceService.remove(+id);
  }
}
