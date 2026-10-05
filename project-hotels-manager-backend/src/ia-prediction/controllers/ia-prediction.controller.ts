import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { IaPredictionService } from '../services/ia-prediction.service';
import { CreateIaPredictionDto } from '../dto/create-ia-prediction.dto';
import { UpdateIaPredictionDto } from '../dto/update-ia-prediction.dto';

@Controller('ia-prediction')
export class IaPredictionController {
  constructor(private readonly iaPredictionService: IaPredictionService) {}

  @Post()
  create(@Body() createIaPredictionDto: CreateIaPredictionDto) {
    return this.iaPredictionService.create(createIaPredictionDto);
  }

  @Get()
  findAll() {
    return this.iaPredictionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.iaPredictionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIaPredictionDto: UpdateIaPredictionDto,
  ) {
    return this.iaPredictionService.update(+id, updateIaPredictionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.iaPredictionService.remove(+id);
  }
}
