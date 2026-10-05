import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MaintenanceRequestService } from './services/maintenance-request.service';
import { MaintenanceRequestController } from './controllers/maintenance-request.controller';
import {
  MaintenanceRequest,
  MaintenanceRequestSchema,
} from './schemas/maintenance-request.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MaintenanceRequest.name, schema: MaintenanceRequestSchema },
    ]),
  ],
  controllers: [MaintenanceRequestController],
  providers: [MaintenanceRequestService],
  exports: [MaintenanceRequestService],
})
export class MaintenanceRequestModule {}
