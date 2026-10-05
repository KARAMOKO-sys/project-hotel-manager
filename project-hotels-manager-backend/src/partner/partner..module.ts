import { Module } from '@nestjs/common';
import { PartnerService } from './services/partner..service';
import { PartnerController } from './controllers/partner..controller';

@Module({
  controllers: [PartnerController],
  providers: [PartnerService],
})
export class PartnerModule {}
