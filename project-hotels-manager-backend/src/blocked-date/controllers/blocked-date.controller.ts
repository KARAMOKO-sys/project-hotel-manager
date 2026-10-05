import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BlockedDateService } from '../services/blocked-date.service';
import { CreateBlockedDateDto } from '../dto/create-blocked-date.dto';
import { UpdateBlockedDateDto } from '../dto/update-blocked-date.dto';

@Controller('blocked-date')
export class BlockedDateController {
  constructor(private readonly blockedDateService: BlockedDateService) {}

  @Post()
  create(@Body() createBlockedDateDto: CreateBlockedDateDto) {
    return this.blockedDateService.create(createBlockedDateDto);
  }

  @Get()
  findAll() {
    return this.blockedDateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blockedDateService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBlockedDateDto: UpdateBlockedDateDto,
  ) {
    return this.blockedDateService.update(+id, updateBlockedDateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blockedDateService.remove(+id);
  }
}
