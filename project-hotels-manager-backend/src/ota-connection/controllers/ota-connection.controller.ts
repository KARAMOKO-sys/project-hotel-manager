import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OtaConnectionService } from '../services/ota-connection.service';
import { CreateOtaConnectionDto } from '../dto/create-ota-connection.dto';
import { UpdateOtaConnectionDto } from '../dto/update-ota-connection.dto';

@Controller('ota-connection')
export class OtaConnectionController {
  constructor(private readonly otaConnectionService: OtaConnectionService) {}

  @Post()
  create(@Body() createOtaConnectionDto: CreateOtaConnectionDto) {
    return this.otaConnectionService.create(createOtaConnectionDto);
  }

  @Get()
  findAll() {
    return this.otaConnectionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.otaConnectionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOtaConnectionDto: UpdateOtaConnectionDto,
  ) {
    return this.otaConnectionService.update(+id, updateOtaConnectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.otaConnectionService.remove(+id);
  }
}
