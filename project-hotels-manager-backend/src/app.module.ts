// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminsModule } from './admins/admins.module';
import { OwnersModule } from './owners/owners.module';
import { ReceptionistModule } from './receptionist/receptionist.module';
import { HousekeepingStaffModule } from './housekeeping-staff/housekeeping-staff.module';
import { AccountantModule } from './accountant/accountant.module';
import { GuestModule } from './guest/guest.module';
//import { PartnerModule } from './partner/partner.module';
import { StaffModule } from './staff/staff.module';
import { OrganizationModule } from './organization/organization.module';
import { PropertyModule } from './property/property.module';
import { RoomTypeModule } from './room-type/room-type.module';
import { RoomModule } from './room/room.module';
import { ReservationModule } from './reservation/reservation.module';
import { ReservationRoomModule } from './reservation-room/reservation-room.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { BlockedDateModule } from './blocked-date/blocked-date.module';
import { InvoiceModule } from './invoice/invoice.module';
import { InvoiceItemModule } from './invoice-item/invoice-item.module';
import { PaymentModule } from './payment/payment.module';
import { TaxRateModule } from './tax-rate/tax-rate.module';
import { GuestPreferenceModule } from './guest-preference/guest-preference.module';
import { GuestSegmentModule } from './guest-segment/guest-segment.module';
import { CampaignModule } from './campaign/campaign.module';
import { CampaignAnalyticModule } from './campaign-analytic/campaign-analytic.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { MaintenanceRequestModule } from './maintenance-request/maintenance-request.module';
import { GuestRequestModule } from './guest-request/guest-request.module';
import { PosTransactionModule } from './pos-transaction/pos-transaction.module';
import { PosItemModule } from './pos-item/pos-item.module';
import { IaPredictionModule } from './ia-prediction/ia-prediction.module';
import { ChatbotConversationModule } from './chatbot-conversation/chatbot-conversation.module';
import { ChatbotMessageModule } from './chatbot-message/chatbot-message.module';
import { SentimentAnalysisModule } from './sentiment-analysis/sentiment-analysis.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { OtaConnectionModule } from './ota-connection/ota-connection.module';
import { WebhookLogModule } from './webhook-log/webhook-log.module';
import { NotificationLogModule } from './notification-log/notification-log.module';
import { RatePlanModule } from './rate-plan/rate-plan.module';
import { DynamicPricingRuleModule } from './dynamic-pricing-rule/dynamic-pricing-rule.module';
import { DailyPriceModule } from './daily-price/daily-price.module';
import { ReportModule } from './report/report.module';
import { KpiModule } from './kpi/kpi.module';
import { RoleModule } from './role/role.module';
import { UserRoleModule } from './user-role/user-role.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Configuration MongoDB avec Mongoose - CORRIGÉE
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        const dbName = config.get<string>('MONGODB_DB_NAME', 'bd_pleasantstay');

        return {
          uri,
          dbName,
          // Options supportées par Mongoose
          retryAttempts: 3,
          retryDelay: 3000,
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          serverSelectionTimeoutMS: 5000,
          heartbeatFrequencyMS: 10000,
          // Note: Les options suivantes sont supportées dans les versions récentes
          // mais peuvent varier selon la version de Mongoose
          // maxPoolSize: 10,  // Uniquement si supporté par votre version
          // minPoolSize: 2,   // Uniquement si supporté par votre version
        };
      },
    }),

    AdminsModule,

    OwnersModule,

    ReceptionistModule,

    HousekeepingStaffModule,

    AccountantModule,

    GuestModule,

    //PartnerModule,

    StaffModule,

    OrganizationModule,

    PropertyModule,

    RoomTypeModule,

    RoomModule,

    ReservationModule,

    ReservationRoomModule,

    WaitlistModule,

    BlockedDateModule,

    InvoiceModule,

    InvoiceItemModule,

    PaymentModule,

    TaxRateModule,

    GuestPreferenceModule,

    GuestSegmentModule,

    CampaignModule,

    CampaignAnalyticModule,

    HousekeepingModule,

    MaintenanceRequestModule,

    GuestRequestModule,

    PosTransactionModule,

    PosItemModule,

    IaPredictionModule,

    ChatbotConversationModule,

    ChatbotMessageModule,

    SentimentAnalysisModule,

    RecommendationModule,

    OtaConnectionModule,

    WebhookLogModule,

    NotificationLogModule,

    RatePlanModule,

    DynamicPricingRuleModule,

    DailyPriceModule,

    ReportModule,

    KpiModule,

    RoleModule,

    UserRoleModule,

    AuditLogModule,

    SessionModule,
  ],
})
export class AppModule {}
