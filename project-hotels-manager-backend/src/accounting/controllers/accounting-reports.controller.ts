import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequiresApp } from '../../platform/apps/requires-app.decorator';
import { AccountingReportService } from '../services/accounting-report.service';
import {
  BalanceSheetQueryDto,
  GeneralLedgerQueryDto,
  ReceivablesAgingQueryDto,
  ReportPeriodQueryDto,
} from '../dto/report-query.dto';

@ApiTags('Comptabilité – états')
@RequiresApp('accounting')
@Controller('accounting/reports')
export class AccountingReportsController {
  constructor(private readonly reports: AccountingReportService) {}

  @Get('trial-balance')
  trialBalance(@Query() query: ReportPeriodQueryDto) {
    return this.reports.trialBalance(query);
  }

  @Get('general-ledger')
  generalLedger(@Query() query: GeneralLedgerQueryDto) {
    return this.reports.generalLedger(query);
  }

  @Get('income-statement')
  incomeStatement(@Query() query: ReportPeriodQueryDto) {
    return this.reports.incomeStatement(query);
  }

  @Get('balance-sheet')
  balanceSheet(@Query() query: BalanceSheetQueryDto) {
    return this.reports.balanceSheet(query);
  }

  @Get('receivables-aging')
  receivablesAging(@Query() query: ReceivablesAgingQueryDto) {
    return this.reports.receivablesAging(query);
  }
}
