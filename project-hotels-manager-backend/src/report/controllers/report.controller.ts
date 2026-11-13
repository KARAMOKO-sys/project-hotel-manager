import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from '../services/report.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import {
  CreateAndGenerateReportDto,
  DueReportsQueryDto,
  ExportReportQueryDto,
  GenerateReportDto,
  ReportFilterQueryDto,
  ScheduleReportDto,
} from '../dto/generate-report.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Body() createReportDto: CreateReportDto) {
    return this.reportService.create(createReportDto);
  }

  @Post('generate')
  createAndGenerate(@Body() dto: CreateAndGenerateReportDto) {
    return this.reportService.createAndGenerate(dto);
  }

  @Get()
  findAll(@Query() query: ReportFilterQueryDto) {
    return this.reportService.findAll(query, {
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
    });
  }

  @Get('due')
  getDueReports(@Query() query: DueReportsQueryDto) {
    return this.reportService.getDueReports(
      query.at ? new Date(query.at) : undefined,
    );
  }

  @Get('property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @Query() query: ReportFilterQueryDto,
  ) {
    return this.reportService.findByProperty(propertyId, query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.reportService.findOne(params.id);
  }

  /** Télécharge le rapport généré (en-têtes Content-Type / Content-Disposition). */
  @Get(':id/export')
  async export(
    @Param() params: IdParamDto,
    @Query() query: ExportReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.reportService.export(params.id, query.format);
    res.setHeader('Content-Type', file.content_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return file.content;
  }

  @Post(':id/generate')
  generate(@Param() params: IdParamDto, @Body() dto: GenerateReportDto) {
    return this.reportService.generate(params.id, dto);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportService.update(params.id, updateReportDto);
  }

  @Patch(':id/schedule')
  schedule(@Param() params: IdParamDto, @Body() dto: ScheduleReportDto) {
    return this.reportService.schedule(params.id, dto);
  }

  @Patch(':id/unschedule')
  unschedule(@Param() params: IdParamDto) {
    return this.reportService.unschedule(params.id);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.reportService.remove(params.id);
  }
}
