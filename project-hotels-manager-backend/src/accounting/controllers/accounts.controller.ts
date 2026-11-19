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
import { AccountService } from '../services/account.service';
import {
  AccountQueryDto,
  CreateAccountDto,
  UpdateAccountDto,
} from '../dto/account.dto';

@ApiTags('Comptabilité – plan comptable')
@RequiresApp('accounting')
@Controller('accounting/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountService) {}

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accounts.create(dto);
  }

  @Get()
  findAll(@Query() query: AccountQueryDto) {
    return this.accounts.list(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.accounts.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.accounts.remove(params.id);
  }
}
