import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from './schemas/account.entity';
import { Journal, JournalSchema } from './schemas/journal.entity';
import {
  JournalEntry,
  JournalEntrySchema,
} from './schemas/journal-entry.entity';
import {
  AccountingSettings,
  AccountingSettingsSchema,
} from './schemas/accounting-settings.entity';
import { AccountService } from './services/account.service';
import { JournalService } from './services/journal.service';
import { JournalEntryService } from './services/journal-entry.service';
import { AccountingSettingsService } from './services/accounting-settings.service';
import { AccountingReportService } from './services/accounting-report.service';
import { AccountingAutoPostingListener } from './listeners/accounting-auto-posting.listener';
import { AccountingSetupController } from './controllers/accounting-setup.controller';
import { AccountingSettingsController } from './controllers/accounting-settings.controller';
import { AccountsController } from './controllers/accounts.controller';
import { JournalsController } from './controllers/journals.controller';
import { JournalEntriesController } from './controllers/journal-entries.controller';
import { AccountingReportsController } from './controllers/accounting-reports.controller';

/**
 * Application Comptabilité (SYSCOHADA, XOF) : plan comptable, journaux,
 * écritures, états et comptabilisation automatique des événements métier.
 * Dépend de `PlatformModule` (global) pour les événements, la numérotation,
 * le magasin d'applications et la portée d'organisation.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Journal.name, schema: JournalSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: AccountingSettings.name, schema: AccountingSettingsSchema },
    ]),
  ],
  controllers: [
    AccountingSetupController,
    AccountingSettingsController,
    AccountsController,
    JournalsController,
    JournalEntriesController,
    AccountingReportsController,
  ],
  providers: [
    AccountService,
    JournalService,
    JournalEntryService,
    AccountingSettingsService,
    AccountingReportService,
    AccountingAutoPostingListener,
  ],
  exports: [
    AccountService,
    JournalService,
    JournalEntryService,
    AccountingSettingsService,
    AccountingReportService,
  ],
})
export class AccountingModule {}
