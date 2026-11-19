import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

/** Filtre commun des états comptables : établissement + période. */
export class ReportPeriodQueryDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  /** Borne incluse ; aujourd'hui par défaut. */
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class GeneralLedgerQueryDto extends ReportPeriodQueryDto {
  @IsMongoId()
  account_id!: string;
}

/** Bilan : situation cumulée à une date (aujourd'hui par défaut). */
export class BalanceSheetQueryDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

/** Balance âgée : compte clients des paramètres (411) par défaut. */
export class ReceivablesAgingQueryDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsDateString()
  as_of?: string;

  @IsOptional()
  @IsMongoId()
  account_id?: string;
}
