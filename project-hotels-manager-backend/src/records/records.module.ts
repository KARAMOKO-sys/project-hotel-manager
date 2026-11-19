import { Module } from '@nestjs/common';
import { RecordsController } from './controllers/records.controller';
import { RecordsService } from './services/records.service';

/**
 * Registre des fiches transverses (discussion, Studio, automatisations).
 * Dépend uniquement de la connexion Mongoose et de `PlatformModule` (global).
 */
@Module({
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
