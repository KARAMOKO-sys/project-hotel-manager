import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { HousekeepingStaffService } from '../services/housekeeping-staff.service';
import { CreateHousekeepingStaffDto } from '../dto/create-housekeeping-staff.dto';
import { UpdateHousekeepingStaffDto } from '../dto/update-housekeeping-staff.dto';

@Controller('housekeeping-staff')
export class HousekeepingStaffController {
  constructor(
    private readonly housekeepingStaffService: HousekeepingStaffService,
  ) {}

  @Post()
  create(@Body() createHousekeepingStaffDto: CreateHousekeepingStaffDto) {
    return this.housekeepingStaffService.create(createHousekeepingStaffDto);
  }

  @Get()
  findAll() {
    return this.housekeepingStaffService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.housekeepingStaffService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateHousekeepingStaffDto: UpdateHousekeepingStaffDto,
  ) {
    return this.housekeepingStaffService.update(
      +id,
      updateHousekeepingStaffDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.housekeepingStaffService.remove(+id);
  }
}
