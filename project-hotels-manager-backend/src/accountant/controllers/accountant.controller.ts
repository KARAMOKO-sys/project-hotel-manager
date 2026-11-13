import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFloatPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccountantService } from '../services/accountant.service';
import { CreateAccountantDto } from '../dto/create-accountant.dto';
import { UpdateAccountantDto } from '../dto/update-accountant.dto';
import {
  AccountantCertificationDto,
  ChangeAccountantPasswordDto,
  SuspendAccountantDto,
  UpdateAccountantPermissionsDto,
} from '../dto/accountant-actions.dto';
import { AccountantStatus } from '../schemas/accountant.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Routes de gestion des comptables.
 *
 * Les routes spécifiques sont déclarées avant `:id`.
 */
@Controller('accountants')
export class AccountantController {
  constructor(private readonly accountantService: AccountantService) {}

  @Post()
  create(@Body() createAccountantDto: CreateAccountantDto) {
    return this.accountantService.create(createAccountantDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.accountantService.findAll(query);
  }

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.accountantService.search(searchTerm);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.accountantService.findByEmail(email);
  }

  @Get('employee/:code')
  findByEmployeeCode(@Param('code') code: string) {
    return this.accountantService.findByEmployeeCode(code);
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: AccountantStatus,
  ) {
    return this.accountantService.findByProperty(propertyId, query, status);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.accountantService.findOne(params.id);
  }

  @Get(':id/approval-check')
  checkApproval(
    @Param() params: IdParamDto,
    @Query('amount', ParseFloatPipe) amount: number,
  ) {
    return this.accountantService.checkApproval(params.id, amount);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateAccountantDto: UpdateAccountantDto,
  ) {
    return this.accountantService.update(params.id, updateAccountantDto);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.accountantService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.accountantService.deactivate(params.id);
  }

  @Patch(':id/suspend')
  suspend(@Param() params: IdParamDto, @Body() body: SuspendAccountantDto) {
    return this.accountantService.suspend(params.id, body.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param() params: IdParamDto) {
    return this.accountantService.reactivate(params.id);
  }

  @Patch(':id/password')
  changePassword(
    @Param() params: IdParamDto,
    @Body() body: ChangeAccountantPasswordDto,
  ) {
    return this.accountantService.changePassword(
      params.id,
      body.current_password,
      body.new_password,
    );
  }

  @Patch(':id/permissions')
  updatePermissions(
    @Param() params: IdParamDto,
    @Body() body: UpdateAccountantPermissionsDto,
  ) {
    return this.accountantService.updatePermissions(params.id, body);
  }

  @Post(':id/certifications')
  addCertification(
    @Param() params: IdParamDto,
    @Body() body: AccountantCertificationDto,
  ) {
    return this.accountantService.addCertification(
      params.id,
      body.certification,
    );
  }

  @Delete(':id/certifications/:certification')
  removeCertification(
    @Param() params: IdParamDto,
    @Param('certification') certification: string,
  ) {
    return this.accountantService.removeCertification(params.id, certification);
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.accountantService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.accountantService.remove(params.id);
  }
}
