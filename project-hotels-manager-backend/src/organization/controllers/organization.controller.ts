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
import { OrganizationService } from '../services/organization.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { AddMemberDto } from '../dto/add-member.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.create(createOrganizationDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.organizationService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.organizationService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(params.id, updateOrganizationDto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.organizationService.remove(params.id);
  }

  @Get(':id/settings')
  getSettings(@Param() params: IdParamDto) {
    return this.organizationService.getSettings(params.id);
  }

  @Patch(':id/settings')
  updateSettings(
    @Param() params: IdParamDto,
    @Body() settings: Record<string, any>,
  ) {
    return this.organizationService.updateSettings(params.id, settings);
  }

  @Get(':id/members')
  getMembers(@Param() params: IdParamDto) {
    return this.organizationService.getMembers(params.id);
  }

  @Post(':id/members')
  addMember(@Param() params: IdParamDto, @Body() addMemberDto: AddMemberDto) {
    return this.organizationService.addMember(
      params.id,
      addMemberDto.user_id,
      addMemberDto.role_id,
    );
  }

  @Delete(':id/members/:userId')
  removeMember(@Param() params: IdParamDto, @Param('userId') userId: string) {
    return this.organizationService.removeMember(params.id, userId);
  }

  @Get(':id/statistics')
  getStatistics(@Param() params: IdParamDto) {
    return this.organizationService.getStatistics(params.id);
  }
}
