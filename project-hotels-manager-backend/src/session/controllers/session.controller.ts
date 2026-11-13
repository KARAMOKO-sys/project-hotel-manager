import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SessionService } from '../services/session.service';
import { SessionRevokeReason } from '../schemas/session.entity';
import { SessionUserQueryDto } from '../dto/session-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

/**
 * Gestion des sessions (appareils connectés).
 *
 * - `/sessions/me…` : l'utilisateur gère ses propres sessions.
 * - `/sessions/user/:id`, `DELETE /sessions/:id`, `/sessions/purge` :
 *   réservés au super administrateur.
 */
@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /** Liste les sessions actives de l'utilisateur connecté. */
  @Get('me')
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    const sessions = await this.sessionService.findActiveByUser(
      user.sub,
      user.user_type,
    );
    return sessions.map((session) => ({
      ...session,
      current: session._id?.toString() === user.sid,
    }));
  }

  /** Révoque toutes les autres sessions de l'utilisateur connecté. */
  @Delete('me')
  async revokeAllMine(@CurrentUser() user: AuthenticatedUser) {
    const revoked = await this.sessionService.revokeAllForUser(
      user.sub,
      user.user_type,
      SessionRevokeReason.LOGOUT_ALL,
      user.sid,
    );
    return { revoked };
  }

  /** Révoque une des sessions de l'utilisateur connecté. */
  @Delete('me/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param() { id }: IdParamDto,
  ): Promise<void> {
    await this.sessionService.revoke(id, user.sub, SessionRevokeReason.LOGOUT);
  }

  /** [Super admin] Liste les sessions actives d'un utilisateur. */
  @Get('user/:id')
  @Roles('super_admin')
  findByUser(@Param() { id }: IdParamDto, @Query() query: SessionUserQueryDto) {
    return this.sessionService.findActiveByUser(id, query.user_type);
  }

  /** [Super admin] Révoque toutes les sessions d'un utilisateur. */
  @Delete('user/:id')
  @Roles('super_admin')
  async revokeAllForUser(
    @Param() { id }: IdParamDto,
    @Query() query: SessionUserQueryDto,
  ) {
    const revoked = await this.sessionService.revokeAllForUser(
      id,
      query.user_type,
      SessionRevokeReason.ADMIN,
    );
    return { revoked };
  }

  /** [Super admin] Purge les sessions expirées ou révoquées anciennes. */
  @Post('purge')
  @Roles('super_admin')
  async purge() {
    const deleted = await this.sessionService.purgeExpired();
    return { deleted };
  }

  /** [Super admin] Révoque une session quelconque. */
  @Delete(':id')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param() { id }: IdParamDto): Promise<void> {
    await this.sessionService.revoke(id, undefined, SessionRevokeReason.ADMIN);
  }
}
