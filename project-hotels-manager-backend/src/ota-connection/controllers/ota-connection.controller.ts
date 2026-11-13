import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OtaConnectionService } from '../services/ota-connection.service';
import { CreateOtaConnectionDto } from '../dto/create-ota-connection.dto';
import { UpdateOtaConnectionDto } from '../dto/update-ota-connection.dto';
import {
  RecordSyncDto,
  SetRoomMappingsDto,
  UpdateOtaCredentialsDto,
} from '../dto/ota-connection-actions.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { OtaProvider } from '../schemas/ota-connection.entity';

@Controller('ota-connections')
export class OtaConnectionController {
  constructor(private readonly otaConnectionService: OtaConnectionService) {}

  @Post()
  create(@Body() createOtaConnectionDto: CreateOtaConnectionDto) {
    return this.otaConnectionService.create(createOtaConnectionDto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.otaConnectionService.findAll(query);
  }

  @Get('due-for-sync')
  findDueForSync(@Query('interval') interval?: number) {
    return this.otaConnectionService.findDueForSync(
      interval ? Number(interval) : undefined,
    );
  }

  @Get('property/:propertyId/:provider/status')
  getConnectionStatus(
    @Param('propertyId') propertyId: string,
    @Param('provider', new ParseEnumPipe(OtaProvider)) provider: OtaProvider,
  ) {
    return this.otaConnectionService.getConnectionStatus(propertyId, provider);
  }

  @Get('property/:propertyId/:provider')
  findByPropertyAndProvider(
    @Param('propertyId') propertyId: string,
    @Param('provider', new ParseEnumPipe(OtaProvider)) provider: OtaProvider,
  ) {
    return this.otaConnectionService.findByPropertyAndProvider(
      propertyId,
      provider,
    );
  }

  @Get('property/:propertyId')
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.otaConnectionService.findByProperty(propertyId);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.otaConnectionService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateOtaConnectionDto: UpdateOtaConnectionDto,
  ) {
    return this.otaConnectionService.update(params.id, updateOtaConnectionDto);
  }

  @Patch(':id/credentials')
  updateCredentials(
    @Param() params: IdParamDto,
    @Body() body: UpdateOtaCredentialsDto,
  ) {
    return this.otaConnectionService.updateCredentials(
      params.id,
      body.credentials,
    );
  }

  @Patch(':id/room-mappings')
  setRoomMappings(
    @Param() params: IdParamDto,
    @Body() body: SetRoomMappingsDto,
  ) {
    return this.otaConnectionService.setRoomMappings(
      params.id,
      body.room_mappings,
    );
  }

  @Delete(':id/room-mappings/:roomTypeId')
  removeRoomMapping(
    @Param() params: IdParamDto,
    @Param('roomTypeId') roomTypeId: string,
  ) {
    return this.otaConnectionService.removeRoomMapping(params.id, roomTypeId);
  }

  @Patch(':id/enable')
  enable(@Param() params: IdParamDto) {
    return this.otaConnectionService.enable(params.id);
  }

  @Patch(':id/disable')
  disable(@Param() params: IdParamDto) {
    return this.otaConnectionService.disable(params.id);
  }

  @Post(':id/test')
  testConnection(@Param() params: IdParamDto) {
    return this.otaConnectionService.testConnection(params.id);
  }

  @Post(':id/sync/start')
  startSync(@Param() params: IdParamDto) {
    return this.otaConnectionService.startSync(params.id);
  }

  @Post(':id/sync/result')
  recordSync(@Param() params: IdParamDto, @Body() body: RecordSyncDto) {
    return this.otaConnectionService.recordSync(params.id, body);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.otaConnectionService.remove(params.id);
  }
}
