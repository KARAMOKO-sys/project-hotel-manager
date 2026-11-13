import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OwnersService } from '../services/owners.service';
import { CreateOwnerDto } from '../dto/create-owner.dto';
import { UpdateOwnerDto } from '../dto/update-owner.dto';
import {
  AddOwnerRevenueDto,
  ChangeOwnerPasswordDto,
  OwnerPropertyDto,
  RejectOwnerDto,
  SuspendOwnerDto,
  UpdateOwnerSubscriptionDto,
  VerifyOwnerDto,
} from '../dto/owner-actions.dto';
import { OwnerStatus } from '../schemas/owner.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Routes de gestion des propriétaires.
 *
 * Les routes spécifiques sont déclarées avant `:id`.
 */
@Controller('owners')
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Post()
  create(@Body() createOwnerDto: CreateOwnerDto) {
    return this.ownersService.create(createOwnerDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.ownersService.findAll(query);
  }

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.ownersService.search(searchTerm);
  }

  @Get('pending')
  findPendingVerification(@Query() query: PaginationQueryDto) {
    return this.ownersService.findPendingVerification(query);
  }

  @Get('expiring')
  findExpiringSubscriptions(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.ownersService.findExpiringSubscriptions(days);
  }

  @Get('status/:status')
  findByStatus(
    @Param('status') status: OwnerStatus,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ownersService.findByStatus(status, query);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.ownersService.findByEmail(email);
  }

  @Get('property/:propertyId')
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.ownersService.findByProperty(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.ownersService.findOne(params.id);
  }

  @Get(':id/subscription')
  getSubscriptionStatus(@Param() params: IdParamDto) {
    return this.ownersService.getSubscriptionStatus(params.id);
  }

  @Get(':id/completeness')
  getProfileCompleteness(@Param() params: IdParamDto) {
    return this.ownersService.getProfileCompleteness(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() updateOwnerDto: UpdateOwnerDto) {
    return this.ownersService.update(params.id, updateOwnerDto);
  }

  @Patch(':id/verify')
  verify(@Param() params: IdParamDto, @Body() body: VerifyOwnerDto) {
    return this.ownersService.verify(params.id, body.verified_by);
  }

  @Patch(':id/reject')
  reject(@Param() params: IdParamDto, @Body() body: RejectOwnerDto) {
    return this.ownersService.reject(params.id, body.reason);
  }

  @Patch(':id/suspend')
  suspend(@Param() params: IdParamDto, @Body() body: SuspendOwnerDto) {
    return this.ownersService.suspend(params.id, body.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param() params: IdParamDto) {
    return this.ownersService.reactivate(params.id);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.ownersService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.ownersService.deactivate(params.id);
  }

  @Patch(':id/password')
  changePassword(
    @Param() params: IdParamDto,
    @Body() body: ChangeOwnerPasswordDto,
  ) {
    return this.ownersService.changePassword(
      params.id,
      body.current_password,
      body.new_password,
    );
  }

  @Patch(':id/subscription')
  updateSubscription(
    @Param() params: IdParamDto,
    @Body() body: UpdateOwnerSubscriptionDto,
  ) {
    return this.ownersService.updateSubscription(params.id, body);
  }

  @Post(':id/properties')
  addProperty(@Param() params: IdParamDto, @Body() body: OwnerPropertyDto) {
    return this.ownersService.addProperty(params.id, body.property_id);
  }

  @Delete(':id/properties/:propertyId')
  removeProperty(
    @Param() params: IdParamDto,
    @Param('propertyId') propertyId: string,
  ) {
    return this.ownersService.removeProperty(params.id, propertyId);
  }

  @Post(':id/revenue')
  addRevenue(@Param() params: IdParamDto, @Body() body: AddOwnerRevenueDto) {
    return this.ownersService.addRevenue(params.id, body.amount);
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.ownersService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.ownersService.remove(params.id);
  }
}
