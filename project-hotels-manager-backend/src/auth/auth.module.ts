import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UserAccountsService } from './services/user-accounts.service';
import { TotpService } from './services/totp.service';
import { LoggingAuthNotifier } from './services/auth-notifier.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AUTH_NOTIFIER } from './auth.constants';
import { buildAuthConfig } from './auth.config';
import { AuthToken, AuthTokenSchema } from './schemas/auth-token.entity';
import { SessionModule } from '../session/session.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { Guest, GuestSchema } from '../guest/schemas/guest.entity';
import { Owner, OwnerSchema } from '../owners/schemas/owner.entity';
import { SuperAdmin, SuperAdminSchema } from '../admins/schemas/admin.entity';
import {
  Receptionist,
  ReceptionistSchema,
} from '../receptionist/schemas/receptionist.entity';
import {
  HousekeepingStaff,
  HousekeepingStaffSchema,
} from '../housekeeping-staff/schemas/housekeeping-staff.entity';
import {
  Accountant,
  AccountantSchema,
} from '../accountant/schemas/accountant.entity';

/**
 * Module d'authentification.
 *
 * Enregistre `JwtModule` en global : `JwtAuthGuard` peut ainsi être utilisé
 * par n'importe quel module (`@UseGuards(JwtAuthGuard, RolesGuard)`).
 * Les gardes ne sont PAS enregistrées globalement.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = buildAuthConfig(configService);
        return {
          secret: config.jwtSecret,
          signOptions: {
            expiresIn: config.accessTtlSeconds,
            ...(config.jwtIssuer ? { issuer: config.jwtIssuer } : {}),
          },
        };
      },
    }),
    MongooseModule.forFeature([
      { name: AuthToken.name, schema: AuthTokenSchema },
      { name: Guest.name, schema: GuestSchema },
      { name: Owner.name, schema: OwnerSchema },
      { name: SuperAdmin.name, schema: SuperAdminSchema },
      { name: Receptionist.name, schema: ReceptionistSchema },
      { name: HousekeepingStaff.name, schema: HousekeepingStaffSchema },
      { name: Accountant.name, schema: AccountantSchema },
    ]),
    SessionModule,
    UserRoleModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserAccountsService,
    TotpService,
    JwtAuthGuard,
    RolesGuard,
    { provide: AUTH_NOTIFIER, useClass: LoggingAuthNotifier },
  ],
  exports: [AuthService, UserAccountsService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
