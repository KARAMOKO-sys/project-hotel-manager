import { PartialType } from '@nestjs/mapped-types';
import { CreateDailyPriceDto } from './create-daily-price.dto';

export class UpdateDailyPriceDto extends PartialType(CreateDailyPriceDto) {}
