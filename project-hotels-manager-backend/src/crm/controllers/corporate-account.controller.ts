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
import { CorporateAccountService } from '../services/corporate-account.service';
import {
  CorporateAccountQueryDto,
  CreateCorporateAccountDto,
  UpdateCorporateAccountDto,
} from '../dto/corporate-account.dto';

@ApiTags('CRM - Comptes entreprises')
@RequiresApp('crm')
@Controller('crm/corporate-accounts')
export class CorporateAccountController {
  constructor(private readonly service: CorporateAccountService) {}

  @Post()
  create(@Body() dto: CreateCorporateAccountDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: CorporateAccountQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateCorporateAccountDto) {
    return this.service.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.service.remove(params.id);
  }
}
