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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { InventoryCountService } from '../services/inventory-count.service';
import {
  CreateInventoryCountDto,
  InventoryCountQueryDto,
  UpdateInventoryCountDto,
} from '../dto/inventory-count.dto';

@ApiTags('Stock - Inventaires')
@RequiresApp('inventory')
@Controller('inventory-counts')
export class InventoryCountController {
  constructor(private readonly counts: InventoryCountService) {}

  @Post()
  create(@Body() dto: CreateInventoryCountDto) {
    return this.counts.create(dto);
  }

  @Get()
  findAll(@Query() query: InventoryCountQueryDto) {
    return this.counts.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.counts.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateInventoryCountDto) {
    return this.counts.update(params.id, dto);
  }

  @Post(':id/apply')
  apply(@Param() params: IdParamDto, @CurrentUser('sub') actorId: string) {
    return this.counts.apply(params.id, actorId);
  }

  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.counts.cancel(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.counts.remove(params.id);
  }
}
