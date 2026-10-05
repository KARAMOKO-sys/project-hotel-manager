import { Injectable } from '@nestjs/common';
import { CreateDailyPriceDto } from '../dto/create-daily-price.dto';
import { UpdateDailyPriceDto } from '../dto/update-daily-price.dto';

@Injectable()
export class DailyPriceService {
  create(createDailyPriceDto: CreateDailyPriceDto) {
    return 'This action adds a new dailyPrice';
  }

  findAll() {
    return `This action returns all dailyPrice`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dailyPrice`;
  }

  update(id: number, updateDailyPriceDto: UpdateDailyPriceDto) {
    return `This action updates a #${id} dailyPrice`;
  }

  remove(id: number) {
    return `This action removes a #${id} dailyPrice`;
  }
}
