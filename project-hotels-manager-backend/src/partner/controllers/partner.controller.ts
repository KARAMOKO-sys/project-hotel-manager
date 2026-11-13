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
import { PartnerService } from '../services/partner.service';
import { CreatePartnerDto } from '../dto/create-partner.dto';
import { UpdatePartnerDto } from '../dto/update-partner.dto';
import {
  ApprovePartnerDto,
  ChangePartnerPasswordDto,
  CommissionRateDto,
  MaxPropertiesDto,
  PartnerPropertyDto,
  PartnerReasonDto,
  PartnerReviewDto,
  RecordPartnerBookingDto,
  SuspendPartnerDto,
} from '../dto/partner-actions.dto';
import { PartnerStatus, PartnerType } from '../schemas/partner.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Routes de gestion des partenaires.
 *
 * Les routes spécifiques sont déclarées avant `:id`.
 */
@Controller('partners')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  /** Inscription d'un partenaire (statut « en attente »). */
  @Post()
  create(@Body() createPartnerDto: CreatePartnerDto) {
    return this.partnerService.create(createPartnerDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.partnerService.findAll(query);
  }

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.partnerService.search(searchTerm);
  }

  @Get('pending')
  findPending(@Query() query: PaginationQueryDto) {
    return this.partnerService.findPending(query);
  }

  @Get('stats')
  getStatistics() {
    return this.partnerService.getStatistics();
  }

  @Get('status/:status')
  findByStatus(
    @Param('status') status: PartnerStatus,
    @Query() query: PaginationQueryDto,
  ) {
    return this.partnerService.findByStatus(status, query);
  }

  @Get('type/:type')
  findByType(
    @Param('type') type: PartnerType,
    @Query() query: PaginationQueryDto,
  ) {
    return this.partnerService.findByType(type, query);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.partnerService.findByEmail(email);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.partnerService.findOne(params.id);
  }

  @Get(':id/commission')
  calculateCommission(
    @Param() params: IdParamDto,
    @Query('amount', ParseFloatPipe) amount: number,
  ) {
    return this.partnerService.calculateCommission(params.id, amount);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnerService.update(params.id, updatePartnerDto);
  }

  @Patch(':id/approve')
  approve(@Param() params: IdParamDto, @Body() body: ApprovePartnerDto) {
    return this.partnerService.approve(params.id, body.verified_by);
  }

  @Patch(':id/reject')
  reject(@Param() params: IdParamDto, @Body() body: PartnerReasonDto) {
    return this.partnerService.reject(params.id, body.reason);
  }

  @Patch(':id/suspend')
  suspend(@Param() params: IdParamDto, @Body() body: SuspendPartnerDto) {
    return this.partnerService.suspend(params.id, body.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param() params: IdParamDto) {
    return this.partnerService.reactivate(params.id);
  }

  @Patch(':id/block')
  block(@Param() params: IdParamDto, @Body() body: PartnerReasonDto) {
    return this.partnerService.block(params.id, body.reason);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.partnerService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.partnerService.deactivate(params.id);
  }

  @Patch(':id/password')
  changePassword(
    @Param() params: IdParamDto,
    @Body() body: ChangePartnerPasswordDto,
  ) {
    return this.partnerService.changePassword(
      params.id,
      body.current_password,
      body.new_password,
    );
  }

  @Patch(':id/commission-rate')
  updateCommissionRate(
    @Param() params: IdParamDto,
    @Body() body: CommissionRateDto,
  ) {
    return this.partnerService.updateCommissionRate(
      params.id,
      body.commission_rate,
    );
  }

  @Patch(':id/max-properties')
  setMaxProperties(
    @Param() params: IdParamDto,
    @Body() body: MaxPropertiesDto,
  ) {
    return this.partnerService.setMaxProperties(params.id, body.max_properties);
  }

  @Post(':id/bookings')
  recordBooking(
    @Param() params: IdParamDto,
    @Body() body: RecordPartnerBookingDto,
  ) {
    return this.partnerService.recordBooking(params.id, body.amount);
  }

  @Post(':id/properties')
  addProperty(@Param() params: IdParamDto, @Body() body: PartnerPropertyDto) {
    return this.partnerService.addProperty(params.id, body.property_id);
  }

  @Delete(':id/properties/:propertyId')
  removeProperty(
    @Param() params: IdParamDto,
    @Param('propertyId') propertyId: string,
  ) {
    return this.partnerService.removeProperty(params.id, propertyId);
  }

  @Post(':id/reviews')
  addReview(@Param() params: IdParamDto, @Body() body: PartnerReviewDto) {
    return this.partnerService.addReview(params.id, body.rating);
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.partnerService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.partnerService.remove(params.id);
  }
}
