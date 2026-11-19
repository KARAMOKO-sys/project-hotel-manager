import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { InboundWebhookService } from '../services/inbound-webhook.service';

/**
 * Réception publique des webhooks entrants signés.
 *
 * Nécessite `NestFactory.create(AppModule, { rawBody: true })` dans main.ts
 * (sinon 400 : la signature est calculée sur le corps brut `req.rawBody`).
 * Pas de `@RequiresApp` ici : l'installation de l'application est vérifiée
 * par le service à partir de la source (404 si absente).
 */
@ApiTags('Integration Bus')
@Controller('integration/inbound')
export class IntegrationInboundController {
  constructor(private readonly inbound: InboundWebhookService) {}

  @Public()
  @Post(':endpointKey')
  @HttpCode(HttpStatus.ACCEPTED)
  receive(
    @Param('endpointKey') endpointKey: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    return this.inbound.receive(endpointKey, {
      rawBody: req.rawBody,
      body: req.body as unknown,
      headers: req.headers,
      ip: req.ip,
    });
  }
}
