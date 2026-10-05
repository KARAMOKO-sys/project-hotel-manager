import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestPreferenceService } from './services/guest-preference.service';
import { GuestPreferenceController } from './controllers/guest-preference.controller';
import {
  GuestPreference,
  GuestPreferenceSchema,
} from './schemas/guest-preference.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestPreference.name, schema: GuestPreferenceSchema },
    ]),
  ],
  controllers: [GuestPreferenceController],
  providers: [GuestPreferenceService],
  exports: [GuestPreferenceService],
})
export class GuestPreferenceModule {}
