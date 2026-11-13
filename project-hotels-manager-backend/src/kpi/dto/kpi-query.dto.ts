import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { KpiMetric, KpiPeriodType } from '../schemas/kpi.entity';

export class KpiFilterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(KpiPeriodType)
  period_type?: KpiPeriodType;
}

export class KpiLatestQueryDto {
  @IsOptional()
  @IsEnum(KpiPeriodType)
  period_type?: KpiPeriodType;
}

export class KpiTrendQueryDto {
  @IsEnum(KpiMetric)
  metric!: KpiMetric;

  @IsOptional()
  @IsEnum(KpiPeriodType)
  period_type?: KpiPeriodType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
