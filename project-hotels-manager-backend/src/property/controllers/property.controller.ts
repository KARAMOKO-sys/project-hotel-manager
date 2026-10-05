import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PropertyService } from '../services/property.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertyService.create(createPropertyDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.propertyService.findAll(query);
  }

  @Get('organization/:organizationId')
  findByOrganization(
    @Param('organizationId') organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.propertyService.findByOrganization(organizationId, query);
  }

  @Get('owner/:ownerId')
  findByOwner(
    @Param('ownerId') ownerId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.propertyService.findByOwner(ownerId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.propertyService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(params.id, updatePropertyDto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.propertyService.remove(params.id);
  }

  @Get(':id/settings')
  getSettings(@Param() params: IdParamDto) {
    return this.propertyService.getSettings(params.id);
  }

  @Patch(':id/settings')
  updateSettings(
    @Param() params: IdParamDto,
    @Body() settings: Record<string, any>,
  ) {
    return this.propertyService.updateSettings(params.id, settings);
  }

  @Get(':id/rooms')
  getRooms(@Param() params: IdParamDto) {
    return this.propertyService.getRooms(params.id);
  }

  @Get(':id/room-types')
  getRoomTypes(@Param() params: IdParamDto) {
    return this.propertyService.getRoomTypes(params.id);
  }
}
