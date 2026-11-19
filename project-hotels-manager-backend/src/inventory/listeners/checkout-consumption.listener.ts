import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Connection, Types } from 'mongoose';
import { DomainEvents } from '../../platform/events/domain-events';
import type { DomainEvent } from '../../platform/events/domain-events';
import { AppsService } from '../../platform/apps/apps.service';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { InventoryService } from '../services/inventory.service';

type ReservationPayload = {
  _id?: string;
  id?: string;
  property_id?: string;
  rooms_count?: number;
  room_count?: number;
  metadata?: { rooms_count?: number; room_count?: number };
};

/**
 * Au départ d'un client, sort automatiquement de l'économat les articles
 * consommés par chambre (kits d'accueil, savons…).
 */
@Injectable()
export class CheckoutConsumptionListener {
  private readonly logger = new Logger(CheckoutConsumptionListener.name);

  constructor(
    private readonly inventory: InventoryService,
    private readonly apps: AppsService,
    private readonly tenantScope: TenantScopeService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @OnEvent(DomainEvents.RESERVATION_CHECKED_OUT, {
    async: true,
    promisify: true,
  })
  async handle(event: DomainEvent<ReservationPayload>): Promise<void> {
    try {
      const payload = event.payload ?? {};
      const reservationId = event.record?.id ?? payload._id ?? payload.id;
      const propertyId = event.property_id ?? payload.property_id;
      if (!reservationId || !propertyId) return;

      const organizationId =
        event.organization_id ??
        (await this.tenantScope.getOrganizationIdForProperty(propertyId));
      if (
        !organizationId ||
        !(await this.apps.isInstalled(organizationId, 'inventory'))
      ) {
        return;
      }

      const rooms = await this.countRooms(reservationId, payload);
      const result = await this.inventory.consumeForCheckout(
        propertyId,
        reservationId,
        rooms,
        event.actor_id,
      );
      if (result.created || result.failed) {
        this.logger.log(
          `Départ ${reservationId} : ${result.created} consommation(s), ${result.failed} échec(s), ${result.skipped} déjà traitée(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Consommation au départ impossible : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Nombre de chambres : lignes `reservation_rooms`, sinon champ
   * `rooms_count` de la réservation, sinon 1.
   */
  async countRooms(
    reservationId: string,
    payload: ReservationPayload,
  ): Promise<number> {
    if (Types.ObjectId.isValid(reservationId)) {
      const count = await this.connection
        .collection('reservation_rooms')
        .countDocuments({
          reservation_id: new Types.ObjectId(reservationId),
          is_deleted: { $ne: true },
        });
      if (count > 0) return count;
    }
    const declared =
      payload.rooms_count ??
      payload.room_count ??
      payload.metadata?.rooms_count ??
      payload.metadata?.room_count;
    return typeof declared === 'number' && declared > 0
      ? Math.floor(declared)
      : 1;
  }
}
