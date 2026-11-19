import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Connection, Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import { DomainEvents } from '../../platform/events/domain-events';
import { LoyaltyTier } from '../../base-entities/enums/loyalty-tier.enum';
import { LoyaltyAccount } from '../schemas/loyalty-account.entity';
import { LoyaltyProgram } from '../schemas/loyalty-program.entity';
import {
  LoyaltySource,
  LoyaltyTransaction,
  LoyaltyTransactionType,
} from '../schemas/loyalty-transaction.entity';
import {
  AdjustPointsDto,
  EnrollLoyaltyAccountDto,
  LoyaltyAccountQueryDto,
  RedeemPointsDto,
  StatementQueryDto,
} from '../dto/loyalty-account.dto';
import {
  assertRedeemable,
  computeEarnPoints,
  expiryDate,
  isDuplicateKeyError,
  planFifoConsumption,
  pointsValue,
  resolveTier,
  tierMultiplier,
  toObjectId,
} from '../loyalty.utils';

export interface EarnInput {
  program: LoyaltyProgram;
  guestId: string | Types.ObjectId;
  amount: number;
  source: LoyaltySource;
  propertyId?: string;
  organizationId?: string;
  description?: string;
}

export interface EarnResult {
  account: LoyaltyAccount;
  transaction: LoyaltyTransaction;
  points: number;
  tier_changed: boolean;
}

/**
 * Comptes et grand livre de fidélité : gain idempotent (index unique sur
 * l'origine), utilisation atomique (`$inc` conditionné au solde),
 * ajustements, expiration FIFO et relevé. Synchronise `guests.loyalty_points`
 * et `guests.loyalty_tier`.
 */
@Injectable()
export class LoyaltyAccountService extends BaseCrudService<
  LoyaltyAccount,
  EnrollLoyaltyAccountDto,
  Partial<LoyaltyAccount>
> {
  private readonly logger = new Logger(LoyaltyAccountService.name);

  constructor(
    @InjectModel(LoyaltyAccount.name)
    protected readonly accountModel: Model<LoyaltyAccount>,
    @InjectModel(LoyaltyProgram.name)
    private readonly programModel: Model<LoyaltyProgram>,
    @InjectModel(LoyaltyTransaction.name)
    private readonly txModel: Model<LoyaltyTransaction>,
    @InjectConnection() private readonly connection: Connection,
    private readonly events: DomainEventPublisher,
  ) {
    super(accountModel, LoyaltyAccount.name);
  }

  /** Inscription d'un client (idempotente). */
  async create(dto: EnrollLoyaltyAccountDto): Promise<LoyaltyAccount> {
    const program = await this.getProgram(dto.program_id);
    if (!program.is_active)
      throw new BadRequestException('Ce programme est inactif');
    const guestId = toObjectId(dto.guest_id, 'guest_id');
    const guest = await this.connection
      .collection('guests')
      .findOne({ _id: guestId }, { projection: { _id: 1 } });
    if (!guest) throw new NotFoundException('Client introuvable');
    return this.ensureAccount(program, guestId);
  }

  async findAll(
    query: LoyaltyAccountQueryDto,
  ): Promise<PaginatedResult<LoyaltyAccount>> {
    const filter: QueryFilter<LoyaltyAccount> = {};
    if (query.program_id)
      filter.program_id = toObjectId(query.program_id, 'program_id');
    if (query.guest_id)
      filter.guest_id = toObjectId(query.guest_id, 'guest_id');
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.tier) filter.tier = query.tier;
    return super.findAll(query, filter);
  }

  /** Compte du client dans le programme (créé si besoin, sans doublon). */
  async ensureAccount(
    program: LoyaltyProgram,
    guestId: Types.ObjectId | string,
  ): Promise<LoyaltyAccount> {
    const guest = toObjectId(guestId, 'guest_id');
    const filter = {
      program_id: program._id,
      guest_id: guest,
    };
    try {
      const account = await this.accountModel
        .findOneAndUpdate(
          filter,
          {
            $setOnInsert: {
              ...filter,
              property_id: program.property_id,
              organization_id: program.organization_id,
              balance: 0,
              lifetime_points: 0,
              tier: resolveTier(program.tiers, 0),
              is_active: true,
              is_deleted: false,
            },
          },
          { upsert: true, returnDocument: 'after' },
        )
        .exec();
      return account;
    } catch (error) {
      // Course entre deux upserts : l'autre a créé le compte.
      if (isDuplicateKeyError(error)) {
        const existing = await this.accountModel.findOne(filter).exec();
        if (existing) return existing;
      }
      throw error;
    }
  }

  /**
   * Gain de points idempotent. Retourne `null` si rien n'est crédité
   * (montant trop faible) ou si l'origine a déjà été traitée.
   */
  async earn(input: EarnInput): Promise<EarnResult | null> {
    const { program } = input;
    const account = await this.ensureAccount(program, input.guestId);
    if (account.is_active === false) return null;
    const points = computeEarnPoints(input.amount, program, account.tier);
    if (points <= 0) return null;

    const now = new Date();
    let transaction: LoyaltyTransaction;
    try {
      transaction = await this.txModel.create({
        account_id: account._id,
        program_id: program._id,
        guest_id: account.guest_id,
        property_id:
          input.propertyId && Types.ObjectId.isValid(input.propertyId)
            ? new Types.ObjectId(input.propertyId)
            : account.property_id,
        type: LoyaltyTransactionType.EARN,
        points,
        remaining_points: points,
        source: input.source,
        expires_at: expiryDate(now, program.points_expiry_months),
        amount: input.amount,
        currency: program.currency,
        multiplier: tierMultiplier(program.tiers, account.tier),
        description: input.description,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        this.logger.debug(
          `Gain déjà enregistré pour ${input.source.model}/${input.source.id} (${input.source.event})`,
        );
        return null;
      }
      throw error;
    }

    const updated = await this.accountModel
      .findOneAndUpdate(
        { _id: account._id },
        {
          $inc: { balance: points, lifetime_points: points },
          $set: { last_activity_at: now },
        },
        { returnDocument: 'after' },
      )
      .exec();
    const { account: final, changed } = await this.applyTier(program, updated!);
    await this.syncGuest(final);
    await this.events.publish(DomainEvents.LOYALTY_POINTS_EARNED, {
      property_id: input.propertyId,
      organization_id: input.organizationId,
      record: { model: LoyaltyAccount.name, id: String(final._id) },
      payload: {
        account_id: String(final._id),
        program_id: String(program._id),
        guest_id: String(final.guest_id),
        points,
        balance: final.balance,
        lifetime_points: final.lifetime_points,
        tier: final.tier,
        source: input.source,
        transaction_id: String(transaction._id),
      },
    });
    return { account: final, transaction, points, tier_changed: changed };
  }

  /** Utilisation de points : retourne la valeur monétaire. */
  async redeem(id: string, dto: RedeemPointsDto, actorId?: string) {
    const account = await this.findOne(id);
    const program = await this.getProgram(account.program_id);
    assertRedeemable(
      dto.points,
      program.min_redeem_points ?? 0,
      account.balance,
    );
    const updated = await this.debit(account, dto.points);
    const value = pointsValue(dto.points, program.point_value);
    const transaction = await this.txModel.create({
      account_id: account._id,
      program_id: program._id,
      guest_id: account.guest_id,
      property_id: account.property_id,
      type: LoyaltyTransactionType.REDEEM,
      points: -dto.points,
      amount: value,
      currency: program.currency,
      description: dto.reason,
      ...(actorId && Types.ObjectId.isValid(actorId)
        ? { actor_id: new Types.ObjectId(actorId) }
        : {}),
    });
    await this.syncGuest(updated);
    await this.events.publish(DomainEvents.LOYALTY_POINTS_REDEEMED, {
      property_id: account.property_id
        ? String(account.property_id)
        : undefined,
      organization_id: account.organization_id
        ? String(account.organization_id)
        : undefined,
      actor_id: actorId,
      record: { model: LoyaltyAccount.name, id: String(account._id) },
      payload: {
        account_id: String(account._id),
        guest_id: String(account.guest_id),
        points: dto.points,
        value,
        currency: program.currency,
        balance: updated.balance,
        reason: dto.reason,
        transaction_id: String(transaction._id),
      },
    });
    return {
      account: updated,
      transaction,
      points: dto.points,
      value,
      currency: program.currency,
    };
  }

  /** Ajustement manuel (motif obligatoire). Un crédit compte pour le niveau. */
  async adjust(id: string, dto: AdjustPointsDto, actorId?: string) {
    const account = await this.findOne(id);
    const program = await this.getProgram(account.program_id);
    const actor =
      actorId && Types.ObjectId.isValid(actorId)
        ? { actor_id: new Types.ObjectId(actorId) }
        : {};
    let updated: LoyaltyAccount;
    if (dto.points > 0) {
      await this.txModel.create({
        account_id: account._id,
        program_id: program._id,
        guest_id: account.guest_id,
        property_id: account.property_id,
        type: LoyaltyTransactionType.ADJUST,
        points: dto.points,
        remaining_points: dto.points,
        expires_at: expiryDate(new Date(), program.points_expiry_months),
        description: dto.reason,
        ...actor,
      });
      const credited = await this.accountModel
        .findOneAndUpdate(
          { _id: account._id },
          {
            $inc: { balance: dto.points, lifetime_points: dto.points },
            $set: { last_activity_at: new Date() },
          },
          { returnDocument: 'after' },
        )
        .exec();
      updated = (await this.applyTier(program, credited!)).account;
    } else {
      const points = -dto.points;
      if (points > account.balance) {
        throw new BadRequestException(
          `Solde insuffisant : ${account.balance} points disponibles`,
        );
      }
      updated = await this.debit(account, points);
      await this.txModel.create({
        account_id: account._id,
        program_id: program._id,
        guest_id: account.guest_id,
        property_id: account.property_id,
        type: LoyaltyTransactionType.ADJUST,
        points: dto.points,
        description: dto.reason,
        ...actor,
      });
    }
    await this.syncGuest(updated);
    return updated;
  }

  /** Relevé de compte sur une période. */
  async statement(id: string, query: StatementQueryDto) {
    const account = await this.findOne(id);
    const program = await this.getProgram(account.program_id);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const accountId = account._id;

    const [openingAgg, transactions, expiringAgg] = await Promise.all([
      from
        ? this.txModel
            .aggregate<{ total: number }>([
              {
                $match: {
                  account_id: accountId,
                  is_deleted: { $ne: true },
                  created_at: { $lt: from },
                },
              },
              { $group: { _id: null, total: { $sum: '$points' } } },
            ])
            .exec()
        : Promise.resolve([] as { total: number }[]),
      this.txModel
        .find({
          account_id: accountId,
          is_deleted: { $ne: true },
          ...(from || to
            ? {
                created_at: {
                  ...(from ? { $gte: from } : {}),
                  ...(to ? { $lte: to } : {}),
                },
              }
            : {}),
        })
        .sort({ created_at: 1 })
        .limit(Math.min(query.limit ?? 500, 2000))
        .lean()
        .exec(),
      this.txModel
        .aggregate<{ total: number }>([
          {
            $match: {
              account_id: accountId,
              expired: { $ne: true },
              remaining_points: { $gt: 0 },
              expires_at: {
                $ne: null,
                $lte: new Date(Date.now() + 30 * 86_400_000),
              },
            },
          },
          { $group: { _id: null, total: { $sum: '$remaining_points' } } },
        ])
        .exec(),
    ]);
    const opening = openingAgg[0]?.total ?? 0;
    const totals: Record<string, number> = {
      earn: 0,
      redeem: 0,
      adjust: 0,
      expire: 0,
    };
    let running = opening;
    const lines = (transactions as unknown as LoyaltyTransaction[]).map(
      (tx) => {
        running += tx.points;
        totals[tx.type] = (totals[tx.type] ?? 0) + tx.points;
        return { ...tx, balance_after: running };
      },
    );
    return {
      account,
      program: {
        _id: program._id,
        name: program.name,
        currency: program.currency,
        point_value: program.point_value,
      },
      period: { from: from ?? null, to: to ?? null },
      opening_balance: opening,
      closing_balance: running,
      balance_value: pointsValue(account.balance, program.point_value),
      totals,
      expiring_within_30_days: expiringAgg[0]?.total ?? 0,
      transactions: lines,
    };
  }

  /**
   * Expiration des points : chaque lot positif échu est « réclamé »
   * atomiquement (expired = true, reste remis à 0) puis son reste est déduit
   * du solde et tracé par une écriture `expire` (origine unique = le lot).
   * Les utilisations ayant consommé les lots les plus anciens en premier
   * (FIFO), seul le reliquat non consommé expire.
   */
  async expirePoints(
    now: Date = new Date(),
  ): Promise<{ lots: number; points: number }> {
    let lots = 0;
    let total = 0;
    for (let batch = 0; batch < 100; batch += 1) {
      const due = await this.txModel
        .find({
          expires_at: { $lte: now },
          remaining_points: { $gt: 0 },
          expired: { $ne: true },
          is_deleted: { $ne: true },
        })
        .sort({ expires_at: 1 })
        .limit(200)
        .lean()
        .exec();
      if (due.length === 0) break;
      for (const lot of due) {
        const claimed = await this.txModel
          .findOneAndUpdate(
            {
              _id: lot._id,
              expired: { $ne: true },
              remaining_points: { $gt: 0 },
            },
            { $set: { expired: true, remaining_points: 0 } },
            { returnDocument: 'before' },
          )
          .lean()
          .exec();
        if (!claimed) continue;
        const points = claimed.remaining_points;
        try {
          await this.txModel.create({
            account_id: lot.account_id,
            program_id: lot.program_id,
            guest_id: lot.guest_id,
            property_id: lot.property_id,
            type: LoyaltyTransactionType.EXPIRE,
            points: -points,
            source: {
              model: LoyaltyTransaction.name,
              id: String(lot._id),
              event: 'expire',
            },
            description: `Expiration des points gagnés le ${new Date(lot.created_at).toISOString().slice(0, 10)}`,
          });
        } catch (error) {
          if (isDuplicateKeyError(error)) continue;
          throw error;
        }
        const account = await this.accountModel
          .findOneAndUpdate(
            { _id: lot.account_id },
            [
              {
                $set: {
                  balance: { $max: [0, { $subtract: ['$balance', points] }] },
                },
              },
            ],
            { returnDocument: 'after', updatePipeline: true } as never,
          )
          .exec();
        if (account) await this.syncGuest(account as unknown as LoyaltyAccount);
        lots += 1;
        total += points;
      }
    }
    return { lots, points: total };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'loyalty-points-expire' })
  async expirePointsCron(): Promise<void> {
    try {
      const result = await this.expirePoints();
      if (result.lots > 0) {
        this.logger.log(
          `${result.points} point(s) expiré(s) sur ${result.lots} lot(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Échec de l'expiration des points : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Débit atomique conditionné au solde, puis consommation FIFO des lots. */
  private async debit(
    account: LoyaltyAccount,
    points: number,
  ): Promise<LoyaltyAccount> {
    const updated = await this.accountModel
      .findOneAndUpdate(
        {
          _id: account._id,
          is_active: { $ne: false },
          balance: { $gte: points },
        },
        { $inc: { balance: -points }, $set: { last_activity_at: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      throw new BadRequestException('Solde insuffisant ou compte inactif');
    }
    await this.consumeFifo(account._id, points);
    return updated;
  }

  /** Consomme `points` sur les lots positifs les plus anciens. */
  private async consumeFifo(
    accountId: Types.ObjectId,
    points: number,
  ): Promise<void> {
    let left = points;
    for (let attempt = 0; attempt < 5 && left > 0; attempt += 1) {
      const lots = await this.txModel
        .find({
          account_id: accountId,
          remaining_points: { $gt: 0 },
          expired: { $ne: true },
          is_deleted: { $ne: true },
        })
        .sort({ created_at: 1, _id: 1 })
        .select('_id remaining_points')
        .lean()
        .exec();
      const plan = planFifoConsumption(lots, left);
      for (const step of plan.allocations) {
        const res = await this.txModel
          .updateOne(
            {
              _id: step.lot_id as Types.ObjectId,
              remaining_points: { $gte: step.points },
              expired: { $ne: true },
            },
            { $inc: { remaining_points: -step.points } },
          )
          .exec();
        if (res.modifiedCount === 1) left -= step.points;
      }
      if (plan.uncovered > 0 && plan.allocations.length === 0) break;
    }
    if (left > 0) {
      this.logger.warn(
        `Consommation FIFO incomplète (${left} pts) pour le compte ${String(accountId)}`,
      );
    }
  }

  /** Recalcule le niveau ; publie LOYALTY_TIER_CHANGED si changement. */
  private async applyTier(
    program: LoyaltyProgram,
    account: LoyaltyAccount,
  ): Promise<{ account: LoyaltyAccount; changed: boolean }> {
    const tier = resolveTier(program.tiers, account.lifetime_points);
    if (tier === account.tier) return { account, changed: false };
    const previous: LoyaltyTier = account.tier;
    const updated = await this.accountModel
      .findOneAndUpdate(
        { _id: account._id, tier: previous },
        { $set: { tier } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) return { account, changed: false };
    await this.events.publish(DomainEvents.LOYALTY_TIER_CHANGED, {
      property_id: account.property_id
        ? String(account.property_id)
        : undefined,
      organization_id: account.organization_id
        ? String(account.organization_id)
        : undefined,
      record: { model: LoyaltyAccount.name, id: String(account._id) },
      payload: {
        account_id: String(account._id),
        guest_id: String(account.guest_id),
        previous_tier: previous,
        tier,
        lifetime_points: updated.lifetime_points,
      },
    });
    return { account: updated, changed: true };
  }

  /** Recopie solde et niveau sur la fiche client (`guests`). */
  private async syncGuest(account: LoyaltyAccount): Promise<void> {
    try {
      await this.connection.collection('guests').updateOne(
        { _id: account.guest_id },
        {
          $set: {
            loyalty_points: account.balance,
            loyalty_tier: account.tier,
          },
        },
      );
    } catch (error) {
      this.logger.warn(
        `Synchronisation client impossible (${String(account.guest_id)}) : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getProgram(
    id: Types.ObjectId | string,
  ): Promise<LoyaltyProgram> {
    const program = await this.programModel
      .findOne({ _id: toObjectId(id, 'program_id'), is_deleted: { $ne: true } })
      .lean()
      .exec();
    if (!program)
      throw new NotFoundException('Programme de fidélité introuvable');
    return program;
  }
}
