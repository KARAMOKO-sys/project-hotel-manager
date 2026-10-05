import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PosItemService } from '../services/pos-item.service';
import { CreatePosItemDto } from '../dto/create-pos-item.dto';
import { UpdatePosItemDto } from '../dto/update-pos-item.dto';

@Controller('pos-item')
export class PosItemController {
  constructor(private readonly posItemService: PosItemService) {}

  @Post()
  create(@Body() createPosItemDto: CreatePosItemDto) {
    return this.posItemService.create(createPosItemDto);
  }

  @Get()
  findAll() {
    return this.posItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.posItemService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePosItemDto: UpdatePosItemDto) {
    return this.posItemService.update(+id, updatePosItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.posItemService.remove(+id);
  }
}
