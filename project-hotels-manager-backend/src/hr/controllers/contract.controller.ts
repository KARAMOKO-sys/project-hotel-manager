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
import { ContractService } from '../services/contract.service';
import {
  ContractQueryDto,
  CreateContractDto,
  ExpiringContractsQueryDto,
  TerminateContractDto,
  UpdateContractDto,
} from '../dto/contract.dto';

@ApiTags('RH - Contrats')
@RequiresApp('hr')
@Controller('hr/contracts')
export class ContractController {
  constructor(private readonly service: ContractService) {}

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: ContractQueryDto) {
    return this.service.findAll(query);
  }

  /** Contrats en cours se terminant dans les N jours (défaut 30). */
  @Get('expiring')
  expiring(@Query() query: ExpiringContractsQueryDto) {
    return this.service.findExpiring(query.property_id, query.days ?? 30);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateContractDto) {
    return this.service.update(params.id, dto);
  }

  @Post(':id/start')
  start(@Param() params: IdParamDto) {
    return this.service.start(params.id);
  }

  @Post(':id/terminate')
  terminate(@Param() params: IdParamDto, @Body() dto: TerminateContractDto) {
    return this.service.terminate(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
