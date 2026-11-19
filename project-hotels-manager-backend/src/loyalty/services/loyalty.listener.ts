import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppsService } from '../../platform/apps/apps.service';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { refId } from '../../platform/events/domain-event.publisher';
import { DomainEvent, DomainEvents } from '../../platform/events/domain-events';
import { LoyaltyProgram } from '../schemas/loyalty-program.entity';
import { LoyaltyProgramService } from './loyalty-program.service';
import { EarnResult, LoyaltyAccountService } from './loyalty-account.service';
import { readAmount, round2 } from '../loyalty.utils';

type AnyEvent = DomainEvent<Record<string, unknown>>;

/**
 * Gains automatiques : départ d'une réservation, vente POS rattachée à un
 * client. N'agit que si l'application `loyalty` est installée pour
 * l'organisation et qu'un programme actif existe. Idempotent (origine
 * unique dans le grand livre) ; n'échoue jamais.
 */
@Injectable()
export class LoyaltyListener {
  private readonly logger = new Logger(LoyaltyListener.name);

  constructor(
    private readonly apps: AppsService,
    private readonly tenantScope: TenantScopeService,
    private readonly programs: LoyaltyProgramService,
    private readonly accounts: LoyaltyAccountService,
  ) {}

  @OnEvent(DomainEvents.RESERVATION_CHECKED_OUT, {
    async: true,
    promisify: true,
  })
  async onReservationCheckedOut(event: AnyEvent): Promise<EarnResult | null> {
    try {
      const payload = event.payload ?? {};
      const reservationId = event.record?.id ?? refId(payload._id);
      const guestId = refId(payload.guest_id);
      if (!reservationId || !guestId) return null;
      const ctx = await this.resolve(event);
      if (!ctx || !ctx.program.earn_on_reservation) return null;
      const { amount, currency } = readAmount(payload.total_amount);
      if (!this.sameCurrency(ctx.program, currency)) return null;
      return await this.accounts.earn({
        program: ctx.program,
        guestId,
        amount,
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        source: {
          model: 'Reservation',
          id: reservationId,
          event: DomainEvents.RESERVATION_CHECKED_OUT,
        },
        description: `Séjour ${typeof payload.confirmation_code === 'string' ? payload.confirmation_code : reservationId}`,
      });
    } catch (error) {
      this.logError(event, error);
      return null;
    }
  }

  @OnEvent(DomainEvents.POS_TRANSACTION_COMPLETED, {
    async: true,
    promisify: true,
  })
  async onPosTransactionCompleted(event: AnyEvent): Promise<EarnResult | null> {
    try {
      const payload = event.payload ?? {};
      const transactionId = event.record?.id ?? refId(payload._id);
      const guestId = refId(payload.guest_id);
      if (!transactionId || !guestId) return null;
      if (payload.status && payload.status !== 'completed') return null;
      const ctx = await this.resolve(event);
      if (!ctx || !ctx.program.earn_on_pos) return null;
      const total = readAmount(payload.total).amount;
      const refunded = readAmount(payload.refunded_amount).amount;
      const currency =
        typeof payload.currency === 'string' ? payload.currency : undefined;
      if (!this.sameCurrency(ctx.program, currency)) return null;
      return await this.accounts.earn({
        program: ctx.program,
        guestId,
        amount: round2(Math.max(0, total - refunded)),
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        source: {
          model: 'PosTransaction',
          id: transactionId,
          event: DomainEvents.POS_TRANSACTION_COMPLETED,
        },
        description: `Vente ${typeof payload.transaction_number === 'string' ? payload.transaction_number : transactionId}`,
      });
    } catch (error) {
      this.logError(event, error);
      return null;
    }
  }

  /** Établissement, organisation (app installée) et programme actif. */
  private async resolve(event: AnyEvent): Promise<{
    program: LoyaltyProgram;
    propertyId?: string;
    organizationId: string;
  } | null> {
    const propertyId = event.property_id ?? refId(event.payload?.property_id);
    const organizationId =
      event.organization_id ??
      (propertyId
        ? await this.tenantScope.getOrganizationIdForProperty(propertyId)
        : null);
    if (!organizationId) return null;
    if (!(await this.apps.isInstalled(organizationId, 'loyalty'))) return null;
    const program = await this.programs.findActiveFor(
      propertyId,
      organizationId,
    );
    return program ? { program, propertyId, organizationId } : null;
  }

  /** Pas de conversion de devise : un montant d'une autre devise est ignoré. */
  private sameCurrency(program: LoyaltyProgram, currency?: string): boolean {
    if (
      !currency ||
      currency.toUpperCase() === String(program.currency).toUpperCase()
    )
      return true;
    this.logger.warn(
      `Devise ${currency} différente de celle du programme (${program.currency}) : aucun point crédité`,
    );
    return false;
  }

  private logError(event: AnyEvent, error: unknown) {
    this.logger.error(
      `Fidélité : échec du traitement de ${event?.name} (${event?.record?.id ?? '?'}) : ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
