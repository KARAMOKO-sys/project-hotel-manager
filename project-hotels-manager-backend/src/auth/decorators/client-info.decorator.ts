import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** Informations sur le client (appareil) à l'origine de la requête. */
export interface ClientInfo {
  ip?: string;
  user_agent?: string;
}

/** Extrait l'adresse IP et le user-agent de la requête. */
export const Client = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientInfo => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const userAgent = request.headers?.['user-agent'];
    return {
      ip: request.ip ?? request.socket?.remoteAddress,
      user_agent: typeof userAgent === 'string' ? userAgent : undefined,
    };
  },
);
