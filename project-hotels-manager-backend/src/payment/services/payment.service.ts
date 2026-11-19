import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Payment, PaymentDocument } from '../schemas/payment.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { PaymentMethod } from '../../base-entities/enums/payment-method.enum';
import { PaymentStatus } from '../../base-entities/enums/payment-status.enum';
import {
  DomainEventPublisher,
  publishRecordEvent,
} from '../../platform/events/domain-event.publisher';
import {
  DomainEventName,
  DomainEvents,
} from '../../platform/events/domain-events';

/**
 * Service de gestion des paiements.
 */
@Injectable()
export class PaymentService extends BaseCrudService<
  Payment,
  CreatePaymentDto,
  UpdatePaymentDto
> {
  constructor(
    @InjectModel(Payment.name)
    protected readonly paymentModel: Model<Payment>,
    @Optional() private readonly events?: DomainEventPublisher,
  ) {
    super(paymentModel, Payment.name);
  }

  /** Crée un paiement avec numéro unique, monnaie rendue et date de règlement. */
  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const amount = createPaymentDto.amount?.amount ?? 0;
    const received = createPaymentDto.received_amount;
    const change_due = received != null ? Math.max(0, received - amount) : 0;

    const status = createPaymentDto.status ?? PaymentStatus.COMPLETED;
    const paid_at = status === PaymentStatus.COMPLETED ? new Date() : undefined;

    const payment = await super.create({
      ...createPaymentDto,
      payment_number: this.generatePaymentNumber(),
      change_due,
      status,
      paid_at,
    } as any);
    return status === PaymentStatus.COMPLETED
      ? this.emitted(DomainEvents.PAYMENT_COMPLETED, payment)
      : payment;
  }

  /** Liste les paiements d'une réservation. */
  findByReservation(reservationId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      reservation_id: new Types.ObjectId(reservationId),
    });
  }

  /** Liste les paiements d'un client. */
  findByGuest(guestId: string, query: PaginationQueryDto) {
    return this.findAll(query, { guest_id: new Types.ObjectId(guestId) });
  }

  /** Retrouve un paiement par identifiant de transaction. */
  async findByTransactionId(transactionId: string): Promise<Payment> {
    return this.findOneOrFail({ transaction_id: transactionId } as any);
  }

  /** Marque un paiement comme complété. */
  async markAsCompleted(id: string): Promise<Payment> {
    return this.emitted(
      DomainEvents.PAYMENT_COMPLETED,
      this.update(id, {
        status: PaymentStatus.COMPLETED,
        paid_at: new Date(),
      } as unknown as UpdatePaymentDto),
    );
  }

  /** Rembourse (partiellement ou totalement) un paiement. */
  async refund(id: string, amount: number, reason?: string): Promise<Payment> {
    return this.emitted(
      DomainEvents.PAYMENT_REFUNDED,
      this.update(id, {
        status: PaymentStatus.REFUNDED,
        metadata: { refund_amount: amount, refund_reason: reason },
      } as UpdatePaymentDto),
    );
  }

  /** Rapport de caisse journalier (total des paiements en espèces du jour). */
  async getDailyCashup(
    propertyId: string,
    date?: Date,
  ): Promise<{ date: Date; total: number; count: number }> {
    const target = date ?? new Date();
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const payments = await this.paymentModel
      .find({
        property_id: new Types.ObjectId(propertyId),
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        paid_at: { $gte: start, $lte: end },
        is_deleted: { $ne: true },
      })
      .exec();

    const total = payments.reduce((sum, p) => sum + (p.amount?.amount ?? 0), 0);

    return { date: target, total, count: payments.length };
  }

  /** Génère un numéro de paiement lisible et unique. */
  private generatePaymentNumber(): string {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `PAY-${Date.now()}-${suffix}`;
  }
  /** Publie l'événement métier correspondant puis renvoie le document. */
  private async emitted<R>(
    name: DomainEventName,
    result: R | Promise<R>,
  ): Promise<R> {
    const doc = await result;
    await publishRecordEvent(this.events, name, Payment.name, doc);
    return doc;
  }
}
