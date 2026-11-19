import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmStage, CrmStageSchema } from './schemas/crm-stage.entity';
import {
  CorporateAccount,
  CorporateAccountSchema,
} from './schemas/corporate-account.entity';
import { Lead, LeadSchema } from './schemas/lead.entity';
import { CrmStageService } from './services/crm-stage.service';
import { CorporateAccountService } from './services/corporate-account.service';
import { LeadService } from './services/lead.service';
import { CrmController } from './controllers/crm.controller';
import { CrmStageController } from './controllers/crm-stage.controller';
import { CorporateAccountController } from './controllers/corporate-account.controller';
import { LeadController } from './controllers/lead.controller';

/** Application CRM (`crm`) : pipeline commercial, comptes entreprises. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrmStage.name, schema: CrmStageSchema },
      { name: CorporateAccount.name, schema: CorporateAccountSchema },
      { name: Lead.name, schema: LeadSchema },
    ]),
  ],
  controllers: [
    CrmController,
    CrmStageController,
    CorporateAccountController,
    LeadController,
  ],
  providers: [CrmStageService, CorporateAccountService, LeadService],
  exports: [CrmStageService, CorporateAccountService, LeadService],
})
export class CrmModule {}
