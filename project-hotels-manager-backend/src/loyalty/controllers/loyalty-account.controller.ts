import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { LoyaltyAccountService } from '../services/loyalty-account.service';
import {
  AdjustPointsDto,
  EnrollLoyaltyAccountDto,
  LoyaltyAccountQueryDto,
  RedeemPointsDto,
  StatementQueryDto,
} from '../dto/loyalty-account.dto';

@ApiTags('Fidélité - Comptes')
@RequiresApp('loyalty')
@Controller('loyalty/accounts')
export class LoyaltyAccountController {
  constructor(private readonly service: LoyaltyAccountService) {}

  /** Inscrit un client au programme (idempotent). */
  @Post()
  enroll(@Body() dto: EnrollLoyaltyAccountDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: LoyaltyAccountQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.service.findOne(params.id);
  }

  @Get(':id/statement')
  statement(@Param() params: IdParamDto, @Query() query: StatementQueryDto) {
    return this.service.statement(params.id, query);
  }

  @Post(':id/redeem')
  redeem(
    @Param() params: IdParamDto,
    @Body() dto: RedeemPointsDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.service.redeem(params.id, dto, actorId);
  }

  @Post(':id/adjust')
  adjust(
    @Param() params: IdParamDto,
    @Body() dto: AdjustPointsDto,
    @CurrentUser('sub') actorId?: string,
  ) {
    return this.service.adjust(params.id, dto, actorId);
  }
}
