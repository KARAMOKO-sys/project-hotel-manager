import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { GuestPreferenceService } from '../services/guest-preference.service';
import { CreateGuestPreferenceDto } from '../dto/create-guest-preference.dto';
import { UpdateGuestPreferenceDto } from '../dto/update-guest-preference.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('guest-preferences')
export class GuestPreferenceController {
  constructor(
    private readonly guestPreferenceService: GuestPreferenceService,
  ) {}

  @Post()
  create(@Body() createGuestPreferenceDto: CreateGuestPreferenceDto) {
    return this.guestPreferenceService.create(createGuestPreferenceDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.guestPreferenceService.findAll(query);
  }

  @Get('guest/:guestId')
  findByGuest(@Param('guestId') guestId: string) {
    return this.guestPreferenceService.findByGuest(guestId);
  }

  @Get('guest/:guestId/recommendations')
  getRecommendations(@Param('guestId') guestId: string) {
    return this.guestPreferenceService.getRecommendations(guestId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.guestPreferenceService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateGuestPreferenceDto: UpdateGuestPreferenceDto,
  ) {
    return this.guestPreferenceService.update(
      params.id,
      updateGuestPreferenceDto,
    );
  }

  @Put('guest/:guestId/:preferenceType')
  updatePreference(
    @Param('guestId') guestId: string,
    @Param('preferenceType') preferenceType: string,
    @Body() body: { value?: string },
  ) {
    return this.guestPreferenceService.updatePreference(
      guestId,
      preferenceType,
      body.value,
    );
  }

  @Delete('guest/:guestId/:preferenceType')
  deletePreference(
    @Param('guestId') guestId: string,
    @Param('preferenceType') preferenceType: string,
  ) {
    return this.guestPreferenceService.deletePreference(
      guestId,
      preferenceType,
    );
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.guestPreferenceService.remove(params.id);
  }
}
