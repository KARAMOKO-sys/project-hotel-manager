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
import { GuestService } from '../services/guest.service';
import { CreateGuestDto } from '../dto/create-guest.dto';
import { UpdateGuestDto } from '../dto/update-guest.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('guests')
export class GuestController {
  constructor(private readonly guestService: GuestService) {}

  @Post()
  create(@Body() createGuestDto: CreateGuestDto) {
    return this.guestService.create(createGuestDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.guestService.findAll(query);
  }

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.guestService.search(searchTerm);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.guestService.findByEmail(email);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.guestService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() updateGuestDto: UpdateGuestDto) {
    return this.guestService.update(params.id, updateGuestDto);
  }

  @Patch(':id/profile')
  updateProfile(@Param() params: IdParamDto, @Body() profile: UpdateGuestDto) {
    return this.guestService.updateProfile(params.id, profile);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.guestService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.guestService.deactivate(params.id);
  }

  @Post(':id/loyalty-points')
  addLoyaltyPoints(
    @Param() params: IdParamDto,
    @Body() body: { points: number },
  ) {
    return this.guestService.addLoyaltyPoints(params.id, body.points);
  }

  @Post(':id/loyalty-points/redeem')
  redeemLoyaltyPoints(
    @Param() params: IdParamDto,
    @Body() body: { points: number },
  ) {
    return this.guestService.redeemLoyaltyPoints(params.id, body.points);
  }

  @Get(':id/loyalty-history')
  getLoyaltyHistory(@Param() params: IdParamDto) {
    return this.guestService.getLoyaltyHistory(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.guestService.remove(params.id);
  }
}
