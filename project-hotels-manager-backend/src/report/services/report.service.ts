import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  Report,
  ReportDocument,
  ReportFormat,
  ReportStatus,
} from '../schemas/report.entity';
import { CreateReportDto } from '../dto/create-report.dto';
import { UpdateReportDto } from '../dto/update-report.dto';
import {
  CreateAndGenerateReportDto,
  GenerateReportDto,
  ReportFilterQueryDto,
  ScheduleReportDto,
} from '../dto/generate-report.dto';
import {
  computeNextRun,
  defaultPeriod,
  exportFileName,
  inferColumns,
  ReportRow,
  summarizeRows,
  toCsv,
} from '../engine/report-builder';

/** Fichier d'export prêt à être renvoyé au client. */
export interface ExportedReport {
  filename: string;
  content_type: string;
  content: string;
}

/**
 * Service de rapports (journaliers, mensuels, annuels, financiers…).
 *
 * Les données sont fournies par l'appelant lors de la génération ; le service
 * calcule une synthèse, gère l'export (CSV, Excel compatible CSV, JSON) et la
 * programmation des rapports récurrents.
 */
@Injectable()
export class ReportService extends BaseCrudService<
  Report,
  CreateReportDto,
  UpdateReportDto
> {
  constructor(
    @InjectModel(Report.name)
    protected readonly reportModel: Model<Report>,
  ) {
    super(reportModel, Report.name);
  }

  /** Crée la définition d'un rapport (statut brouillon). */
  async create(dto: CreateReportDto): Promise<Report> {
    const { start, end } = this.resolvePeriod(dto);
    const definition: Partial<CreateReportDto> = { ...dto };
    delete definition.reference_date;
    return super.create({
      ...definition,
      period_start: start,
      period_end: end,
      status: ReportStatus.DRAFT,
    } as unknown as CreateReportDto);
  }

  /** Met à jour la définition en revalidant la période si elle change. */
  async update(id: string, dto: UpdateReportDto): Promise<Report> {
    if (dto.period_start === undefined && dto.period_end === undefined) {
      return super.update(id, dto);
    }
    const existing = await this.findOne(id);
    this.assertPeriod(
      new Date(dto.period_start ?? existing.period_start),
      new Date(dto.period_end ?? existing.period_end),
    );
    return super.update(id, dto);
  }

  /** Génère le rapport à partir des lignes fournies. */
  async generate(id: string, dto: GenerateReportDto): Promise<Report> {
    const report = await this.findOne(id);
    const rows = this.assertRows(dto.rows);
    const columns =
      dto.columns && dto.columns.length > 0
        ? dto.columns
        : report.columns?.length
          ? report.columns
          : inferColumns(rows);
    const now = new Date();

    const set: Record<string, unknown> = {
      data: { rows },
      columns,
      summary: summarizeRows(rows, columns),
      status: ReportStatus.COMPLETED,
      generated_at: now,
      ...(dto.generated_by && {
        generated_by: this.toObjectId(dto.generated_by),
      }),
    };
    if (report.schedule?.is_active) {
      set['schedule.last_run_at'] = now;
      set['schedule.next_run_at'] = computeNextRun(
        now,
        report.schedule.recurrence,
      );
    }

    const updated = await this.repository.update(id, {
      $set: set,
      $unset: { error_message: 1 },
      $inc: { generation_count: 1 },
    });
    return updated ?? report;
  }

  /** Crée puis génère un rapport en une opération. */
  async createAndGenerate(dto: CreateAndGenerateReportDto): Promise<Report> {
    const rows = this.assertRows(dto.rows);
    const definition: Partial<CreateAndGenerateReportDto> = { ...dto };
    delete definition.rows;
    delete definition.generated_by;
    const created = await this.create(definition as CreateReportDto);
    return this.generate(String(created._id), {
      rows,
      columns: dto.columns,
      generated_by: dto.generated_by,
    });
  }

  /** Marque une génération comme échouée (utilisé par le planificateur). */
  async markFailed(id: string, message: string): Promise<Report> {
    return super.update(id, {
      status: ReportStatus.FAILED,
      error_message: message.slice(0, 1000),
    } as UpdateReportDto);
  }

  /** Exporte un rapport généré dans le format demandé. */
  async export(id: string, format?: ReportFormat): Promise<ExportedReport> {
    const report = await this.findOne(id);
    if (report.status !== ReportStatus.COMPLETED || !report.generated_at) {
      throw new BadRequestException(
        'Le rapport doit être généré avant d’être exporté',
      );
    }
    const rows = (report.data?.rows ?? []) as ReportRow[];
    const columns = report.columns?.length
      ? report.columns
      : inferColumns(rows);
    const target = format ?? report.format ?? ReportFormat.CSV;
    const start = new Date(report.period_start);

    switch (target) {
      case ReportFormat.CSV:
        return {
          filename: exportFileName(report.name, start, 'csv'),
          content_type: 'text/csv; charset=utf-8',
          content: toCsv(rows, columns),
        };
      case ReportFormat.EXCEL:
        // CSV « à la française » (séparateur ; + BOM) ouvert nativement par Excel.
        return {
          filename: exportFileName(report.name, start, 'csv'),
          content_type: 'application/vnd.ms-excel; charset=utf-8',
          content: toCsv(rows, columns, { delimiter: ';', bom: true }),
        };
      case ReportFormat.JSON:
        return {
          filename: exportFileName(report.name, start, 'json'),
          content_type: 'application/json; charset=utf-8',
          content: JSON.stringify({
            name: report.name,
            type: report.type,
            period_start: report.period_start,
            period_end: report.period_end,
            generated_at: report.generated_at,
            summary: report.summary,
            columns,
            rows,
          }),
        };
      default:
        throw new NotImplementedException(
          `Export ${target} non disponible : aucune librairie de rendu installée`,
        );
    }
  }

  /** Programme (ou reprogramme) la génération récurrente du rapport. */
  async schedule(id: string, dto: ScheduleReportDto): Promise<Report> {
    const report = await this.findOne(id);
    const now = new Date();
    const nextRun = dto.start_at
      ? new Date(dto.start_at)
      : computeNextRun(now, dto.recurrence);
    if (nextRun.getTime() <= now.getTime()) {
      throw new BadRequestException(
        'La première exécution doit être dans le futur',
      );
    }
    return super.update(id, {
      schedule: {
        recurrence: dto.recurrence,
        next_run_at: nextRun,
        last_run_at: report.schedule?.last_run_at,
        recipients: dto.recipients ?? report.schedule?.recipients ?? [],
        is_active: true,
      },
      ...(report.status === ReportStatus.DRAFT && {
        status: ReportStatus.SCHEDULED,
      }),
    } as unknown as UpdateReportDto);
  }

  /** Désactive la programmation. */
  async unschedule(id: string): Promise<Report> {
    const report = await this.findOne(id);
    if (!report.schedule?.is_active) {
      throw new BadRequestException('Ce rapport n’est pas programmé');
    }
    const updated = await this.repository.update(id, {
      $set: {
        'schedule.is_active': false,
        ...(report.status === ReportStatus.SCHEDULED && {
          status: report.generated_at
            ? ReportStatus.COMPLETED
            : ReportStatus.DRAFT,
        }),
      },
      $unset: { 'schedule.next_run_at': 1 },
    });
    return updated ?? report;
  }

  /** Rapports programmés dont l'échéance est atteinte. */
  async getDueReports(at = new Date()): Promise<Report[]> {
    return this.repository.find(
      {
        'schedule.is_active': true,
        'schedule.next_run_at': { $lte: at },
        is_deleted: { $ne: true },
      },
      { sort: 'schedule.next_run_at' },
    );
  }

  /** Rapports d'une propriété, filtrables par type et statut. */
  findByProperty(propertyId: string, query: ReportFilterQueryDto) {
    return this.findAll(query, {
      property_id: this.toObjectId(propertyId),
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
    });
  }

  /** Détermine la période : explicite, sinon implicite selon le type. */
  private resolvePeriod(dto: CreateReportDto): { start: Date; end: Date } {
    if (dto.period_start && dto.period_end) {
      const start = new Date(dto.period_start);
      const end = new Date(dto.period_end);
      this.assertPeriod(start, end);
      return { start, end };
    }
    const reference = dto.reference_date
      ? new Date(dto.reference_date)
      : dto.period_start
        ? new Date(dto.period_start)
        : new Date();
    const period = defaultPeriod(dto.type, reference);
    if (!period) {
      throw new BadRequestException(
        `period_start et period_end sont requis pour un rapport de type ${dto.type}`,
      );
    }
    return period;
  }

  private assertPeriod(start: Date, end: Date): void {
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException(
        'period_start doit précéder ou égaler period_end',
      );
    }
  }

  private assertRows(rows: unknown): ReportRow[] {
    if (!Array.isArray(rows)) {
      throw new BadRequestException('`rows` doit être un tableau');
    }
    if (
      rows.some((r) => r === null || typeof r !== 'object' || Array.isArray(r))
    ) {
      throw new BadRequestException('Chaque ligne doit être un objet');
    }
    return rows as ReportRow[];
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Identifiant invalide : ${id}`);
    }
    return new Types.ObjectId(id);
  }
}
