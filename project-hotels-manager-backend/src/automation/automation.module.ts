import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordsModule } from '../records/records.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationLogModule } from '../notification-log/notification-log.module';
import {
  AutomationRule,
  AutomationRuleSchema,
} from './schemas/automation-rule.entity';
import {
  AutomationRun,
  AutomationRunSchema,
} from './schemas/automation-run.entity';
import { AutomationRuleService } from './services/automation-rule.service';
import { AutomationRunService } from './services/automation-run.service';
import { AutomationActionsService } from './services/automation-actions.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { AutomationRulesController } from './controllers/automation-rules.controller';
import { AutomationRunsController } from './controllers/automation-runs.controller';
import { AutomationCatalogController } from './controllers/automation-catalog.controller';

/** Application « Automatisations » (règles déclenchées par les événements). */
@Module({
  imports: [
    RecordsModule,
    ActivityModule,
    NotificationLogModule,
    MongooseModule.forFeature([
      { name: AutomationRule.name, schema: AutomationRuleSchema },
      { name: AutomationRun.name, schema: AutomationRunSchema },
    ]),
  ],
  controllers: [
    AutomationCatalogController,
    AutomationRunsController,
    AutomationRulesController,
  ],
  providers: [
    AutomationRuleService,
    AutomationRunService,
    AutomationActionsService,
    AutomationEngineService,
  ],
  exports: [AutomationRuleService, AutomationEngineService],
})
export class AutomationModule {}
