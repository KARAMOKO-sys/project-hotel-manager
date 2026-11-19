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
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { VendorService } from '../services/vendor.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  VendorQueryDto,
} from '../dto/vendor.dto';

@ApiTags('Achats - Fournisseurs')
@RequiresApp('purchase')
@Controller('vendors')
export class VendorController {
  constructor(private readonly vendors: VendorService) {}

  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendors.create(dto);
  }

  @Get()
  findAll(@Query() query: VendorQueryDto) {
    return this.vendors.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.vendors.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateVendorDto) {
    return this.vendors.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.vendors.remove(params.id);
  }
}
