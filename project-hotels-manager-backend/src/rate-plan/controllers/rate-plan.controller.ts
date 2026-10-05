import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RatePlanService } from '../services/rate-plan.service';
import { CreateRatePlanDto } from '../dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from '../dto/update-rate-plan.dto';

@Controller('rate-plan')
export class RatePlanController {
  constructor(private readonly ratePlanService: RatePlanService) {}

  @Post()
  create(@Body() createRatePlanDto: CreateRatePlanDto) {
    return this.ratePlanService.create(createRatePlanDto);
  }

  @Get()
  findAll() {
    return this.ratePlanService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ratePlanService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRatePlanDto: UpdateRatePlanDto,
  ) {
    return this.ratePlanService.update(+id, updateRatePlanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ratePlanService.remove(+id);
  }
}
