import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionService } from './services/session.service';
import { SessionController } from './controllers/session.controller';
import { Session, SessionSchema } from './schemas/session.entity';

/**
 * Module des sessions (refresh tokens).
 *
 * Les gardes du contrôleur nécessitent `JwtService`, fourni globalement par
 * `AuthModule`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
