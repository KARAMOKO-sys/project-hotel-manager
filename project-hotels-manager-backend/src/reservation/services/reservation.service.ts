import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  Reservation,
  ReservationDocument,
  ReservationStatus,
} from '../schemas/reservation.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';

/**
 * Service de gestion des réservations.
 *
 * Étend le CRUD générique et ajoute le cycle de vie (confirmation, check-in,
 * check-out, annulation, no-show) ainsi que des recherches métier.
 */
@Injectable()
export class ReservationService extends BaseCrudService<
  Reservation,
  CreateReservationDto,
  UpdateReservationDto
> {
  constructor(
    @InjectModel(Reservation.name)
    protected readonly reservationModel: Model<Reservation>,
  ) {
    super(reservationModel, Reservation.name);
  }

  /** Crée une réservation en générant un code de confirmation unique. */
  async create(
    createReservationDto: CreateReservationDto,
  ): Promise<Reservation> {
    const confirmation_code = this.generateConfirmationCode();
    return super.create({ ...createReservationDto, confirmation_code } as any);
  }

  /** Recherche une réservation par code de confirmation. */
  async findByConfirmationCode(code: string): Promise<Reservation> {
    return this.findOneOrFail({
      confirmation_code: code.toUpperCase(),
    } as any);
  }

  /** Liste les réservations d'un client. */
  findByGuest(guestId: string, query: PaginationQueryDto) {
    return this.findAll(query, { guest_id: new Types.ObjectId(guestId) });
  }

  /** Confirme une réservation en attente. */
  async confirm(id: string): Promise<Reservation> {
    return this.update(id, {
      status: ReservationStatus.CONFIRMED,
    } as UpdateReservationDto);
  }

  /** Annule une réservation et enregistre la raison. */
  async cancel(id: string, reason?: string): Promise<Reservation> {
    return this.update(id, {
      status: ReservationStatus.CANCELLED,
      cancellation_reason: reason,
    } as UpdateReservationDto);
  }

  /** Enregistre l'arrivée (check-in). */
  async checkIn(id: string): Promise<Reservation> {
    return this.update(id, {
      status: ReservationStatus.CHECKED_IN,
    } as UpdateReservationDto);
  }

  /** Enregistre le départ (check-out). */
  async checkOut(id: string): Promise<Reservation> {
    return this.update(id, {
      status: ReservationStatus.CHECKED_OUT,
    } as UpdateReservationDto);
  }

  /** Check-in autonome, limité au titulaire et à la période de séjour. */
  async selfCheckIn(id: string, guestId: string): Promise<Reservation> {
    const filter = this.ownedReservationFilter(id, guestId);
    const reservation = await this.reservationModel.findOne(filter).exec();
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable');
    }
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException(
        'Seule une réservation confirmée peut être enregistrée à l’arrivée',
      );
    }

    const now = new Date();
    const checkInTime = reservation.check_in?.getTime();
    const checkOutTime = reservation.check_out?.getTime();
    if (
      !Number.isFinite(checkInTime) ||
      !Number.isFinite(checkOutTime) ||
      checkInTime > now.getTime() ||
      checkOutTime <= now.getTime()
    ) {
      throw new ConflictException(
        "Le check-in autonome n'est pas disponible pour cette période",
      );
    }

    const updated = await this.reservationModel
      .findOneAndUpdate(
        {
          ...filter,
          status: ReservationStatus.CONFIRMED,
          check_in: { $lte: now },
          check_out: { $gt: now },
        },
        { $set: { status: ReservationStatus.CHECKED_IN } },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        "La réservation a changé d'état ; veuillez actualiser puis réessayer",
      );
    }
    return updated;
  }

  /** Check-out autonome d'une réservation appartenant au client connecté. */
  async selfCheckOut(id: string, guestId: string): Promise<Reservation> {
    const filter = this.ownedReservationFilter(id, guestId);
    const reservation = await this.reservationModel.findOne(filter).exec();
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable');
    }
    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new ConflictException(
        'Seul un séjour en cours peut être clôturé par check-out',
      );
    }

    const updated = await this.reservationModel
      .findOneAndUpdate(
        { ...filter, status: ReservationStatus.CHECKED_IN },
        { $set: { status: ReservationStatus.CHECKED_OUT } },
        { new: true },
      )
      .exec();
    if (!updated) {
      throw new ConflictException(
        "La réservation a changé d'état ; veuillez actualiser puis réessayer",
      );
    }
    return updated;
  }

  /** Marque une réservation comme « non présentée ». */
  async markAsNoShow(id: string): Promise<Reservation> {
    return this.update(id, {
      status: ReservationStatus.NO_SHOW,
    } as UpdateReservationDto);
  }

  /** Liste les arrivées prévues dans les X prochains jours. */
  async getUpcomingArrivals(
    propertyId: string,
    days = 7,
  ): Promise<Reservation[]> {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);

    return this.reservationModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        status: ReservationStatus.CONFIRMED,
        check_in: { $gte: from, $lte: to },
        is_deleted: { $ne: true },
      })
      .sort({ check_in: 1 })
      .exec() as unknown as Promise<Reservation[]>;
  }

  /** Liste les départs prévus à une date donnée. */
  async getDepartures(propertyId: string, date?: Date): Promise<Reservation[]> {
    const target = date ?? new Date();
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    return this.reservationModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        status: ReservationStatus.CHECKED_IN,
        check_out: { $gte: start, $lte: end },
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Reservation[]>;
  }

  /** Génère un code de confirmation lisible et unique. */
  private generateConfirmationCode(): string {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `RSV-${suffix}`;
  }

  private ownedReservationFilter(
    id: string,
    guestId: string,
  ): Record<string, unknown> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(guestId)) {
      throw new NotFoundException('Réservation introuvable');
    }
    return {
      _id: new Types.ObjectId(id),
      guest_id: new Types.ObjectId(guestId),
      is_deleted: { $ne: true },
    };
  }
}
