import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminsService } from '../services/admins.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import {
  ChangeAdminPasswordDto,
  SuspendAdminDto,
  UpdateAccessLevelDto,
  UpdateIpWhitelistDto,
} from '../dto/admin-actions.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

/**
 * Routes de gestion des super administrateurs.
 *
 * Les routes spécifiques (`search`, `email/:email`, ...) sont déclarées avant
 * `:id` pour ne pas être capturées par celle-ci.
 */
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminsService.create(createAdminDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.adminsService.findAll(query);
  }

  @Get('search')
  search(@Query('q') searchTerm: string) {
    return this.adminsService.search(searchTerm);
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.adminsService.findByEmail(email);
  }

  @Get('department/:department')
  findByDepartment(
    @Param('department') department: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.adminsService.findByDepartment(department, query);
  }

  @Get('access-level/:level')
  findByAccessLevel(
    @Param('level', ParseIntPipe) level: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.adminsService.findByAccessLevel(level, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.adminsService.findOne(params.id);
  }

  @Get(':id/alert-contact')
  getAlertContact(@Param() params: IdParamDto) {
    return this.adminsService.getAlertContact(params.id);
  }

  @Get(':id/ip-allowed')
  isIpAllowed(@Param() params: IdParamDto, @Query('ip') ip: string) {
    return this.adminsService.isIpAllowed(params.id, ip);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminsService.update(params.id, updateAdminDto);
  }

  @Patch(':id/activate')
  activate(@Param() params: IdParamDto) {
    return this.adminsService.activate(params.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param() params: IdParamDto) {
    return this.adminsService.deactivate(params.id);
  }

  @Patch(':id/suspend')
  suspend(@Param() params: IdParamDto, @Body() body: SuspendAdminDto) {
    return this.adminsService.suspend(params.id, body.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param() params: IdParamDto) {
    return this.adminsService.reactivate(params.id);
  }

  @Patch(':id/password')
  changePassword(
    @Param() params: IdParamDto,
    @Body() body: ChangeAdminPasswordDto,
  ) {
    return this.adminsService.changePassword(
      params.id,
      body.current_password,
      body.new_password,
    );
  }

  @Patch(':id/access-level')
  updateAccessLevel(
    @Param() params: IdParamDto,
    @Body() body: UpdateAccessLevelDto,
  ) {
    return this.adminsService.updateAccessLevel(params.id, body.access_level);
  }

  @Patch(':id/ip-whitelist')
  updateIpWhitelist(
    @Param() params: IdParamDto,
    @Body() body: UpdateIpWhitelistDto,
  ) {
    return this.adminsService.updateIpWhitelist(params.id, body.ip_whitelist);
  }

  @Patch(':id/audit')
  markAudited(@Param() params: IdParamDto) {
    return this.adminsService.markAudited(params.id);
  }

  @Patch(':id/restore')
  restore(@Param() params: IdParamDto) {
    return this.adminsService.restore(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.adminsService.remove(params.id);
  }
}
