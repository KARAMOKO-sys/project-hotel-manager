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
import { IdParamDto } from '../../common/dto/id-param.dto';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { LoyaltyProgramService } from '../services/loyalty-program.service';
import {
  CreateLoyaltyProgramDto,
  LoyaltyProgramQueryDto,
  UpdateLoyaltyProgramDto,
} from '../dto/loyalty-program.dto';

@ApiTags('Fidélité - Programmes')
@RequiresApp('loyalty')
@Controller('loyalty/programs')
export class LoyaltyProgramController {
  constructor(private readonly service: LoyaltyProgramService) {}

  @Post()
  create(@Body() dto: CreateLoyaltyProgramDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: LoyaltyProgramQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateLoyaltyProgramDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
