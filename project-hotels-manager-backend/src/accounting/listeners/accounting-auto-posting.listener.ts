import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppsService } from '../../platform/apps/apps.service';
import { TenantScopeService } from '../../platform/tenancy/tenant-scope.service';
import { refId } from '../../platform/events/domain-event.publisher';
import { DomainEvents } from '../../platform/events/domain-events';
import type { DomainEvent } from '../../platform/events/domain-events';
import { AccountingSettings } from '../schemas/accounting-settings.entity';
import { Account } from '../schemas/account.entity';
import { JournalEntryState } from '../schemas/journal-entry.entity';
import { AccountingSettingsService } from '../services/accounting-settings.service';
import { JournalEntryService } from '../services/journal-entry.service';
import {
  AccountMapping,
  PosTransactionPayload,
  PostingPlan,
  buildInvoicePlan,
  buildPaymentPlan,
  buildPosPlan,
  buildRefundPlan,
  buildVendorBillPlan,
} from '../domain/posting-rules';
import { JournalRole } from '../domain/syscohada-chart';

export const ACCOUNTING_APP_KEY = 'accounting';

interface PostingContext {
  propertyId: string;
  settings: AccountingSettings;
  accounts: AccountMapping;
  journals: Record<JournalRole, string>;
}

type Payload = Record<string, unknown>;

/**
 * Comptabilisation automatique des événements métier (factures, paiements,
 * ventes POS, factures fournisseurs).
 *
 * N'agit que si l'application `accounting` est installée pour l'organisation
 * de l'établissement ET que les paramètres comptables existent avec
 * `auto_posting = true`. Idempotent (index unique sur la source) ; les
 * erreurs sont journalisées et n'interrompent jamais l'opération d'origine.
 */
@Injectable()
export class AccountingAutoPostingListener {
  private readonly logger = new Logger(AccountingAutoPostingListener.name);

  constructor(
    private readonly entries: JournalEntryService,
    private readonly apps: AppsService,
    private readonly tenantScope: TenantScopeService,
    @InjectModel(AccountingSettings.name)
    private readonly settingsModel: Model<AccountingSettings>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
  ) {}

  @OnEvent(DomainEvents.INVOICE_CREATED, { async: true, promisify: true })
  async onInvoiceCreated(event: DomainEvent<Payload>): Promise<void> {
    await this.handle(event, 'Invoice', async (ctx, id) => {
      const plan = buildInvoicePlan(event.payload, ctx.accounts);
      await this.postPlan(ctx, plan, 'Invoice', id, event);
    });
  }

  @OnEvent(DomainEvents.INVOICE_CANCELLED, { async: true, promisify: true })
  async onInvoiceCancelled(event: DomainEvent<Payload>): Promise<void> {
    await this.handle(event, 'Invoice', (ctx, id) =>
      this.reverseSource(
        event,
        'Invoice',
        id,
        DomainEvents.INVOICE_CREATED,
        'Facture annulée',
      ),
    );
  }

  @OnEvent(DomainEvents.PAYMENT_COMPLETED, { async: true, promisify: true })
  async onPaymentCompleted(event: DomainEvent<Payload>): Promise<void> {
    await this.handle(event, 'Payment', async (ctx, id) => {
      const plan = buildPaymentPlan(event.payload, ctx.accounts);
      await this.postPlan(ctx, plan, 'Payment', id, event);
    });
  }

  @OnEvent(DomainEvents.PAYMENT_REFUNDED, { async: true, promisify: true })
  async onPaymentRefunded(event: DomainEvent<Payload>): Promise<void> {
    await this.handle(event, 'Payment', async (ctx, id) => {
      const plan = buildRefundPlan(event.payload, ctx.accounts);
      await this.postPlan(ctx, plan, 'Payment', id, event);
    });
  }

  @OnEvent(DomainEvents.POS_TRANSACTION_COMPLETED, {
    async: true,
    promisify: true,
  })
  async onPosTransactionCompleted(event: DomainEvent<Payload>): Promise<void> {
    if (
      (event.payload as PosTransactionPayload)?.settlement_type ===
      'room_charge'
    ) {
      return; // comptabilisée via la facture hôtel
    }
    await this.handle(event, 'PosTransaction', async (ctx, id) => {
      const plan = buildPosPlan(event.payload, ctx.accounts);
      await this.postPlan(ctx, plan, 'PosTransaction', id, event);
    });
  }

  @OnEvent(DomainEvents.POS_TRANSACTION_VOIDED, {
    async: true,
    promisify: true,
  })
  async onPosTransactionVoided(event: DomainEvent<Payload>): Promise<void> {
    if (
      (event.payload as PosTransactionPayload)?.settlement_type ===
      'room_charge'
    ) {
      return;
    }
    await this.handle(event, 'PosTransaction', (ctx, id) =>
      this.reverseSource(
        event,
        'PosTransaction',
        id,
        DomainEvents.POS_TRANSACTION_COMPLETED,
        'Vente annulée',
      ),
    );
  }

  @OnEvent(DomainEvents.VENDOR_BILL_POSTED, { async: true, promisify: true })
  async onVendorBillPosted(event: DomainEvent<Payload>): Promise<void> {
    await this.handle(event, 'VendorBill', async (ctx, id) => {
      const known = await this.accountModel
        .find({
          property_id: new Types.ObjectId(ctx.propertyId),
          is_deleted: { $ne: true },
          is_active: { $ne: false },
        })
        .select('code')
        .lean()
        .exec();
      const plan = buildVendorBillPlan(
        event.payload,
        ctx.accounts,
        new Set(known.map((a) => a.code)),
      );
      await this.postPlan(ctx, plan, 'VendorBill', id, event);
    });
  }

  // -------------------------------------------------------------------------

  /** Contexte de comptabilisation, ou `null` si elle n'est pas active. */
  async resolveContext(
    event: DomainEvent<Payload>,
  ): Promise<PostingContext | null> {
    const propertyId =
      event.property_id ?? refId((event.payload ?? {}).property_id);
    if (!propertyId || !Types.ObjectId.isValid(propertyId)) return null;
    const organizationId =
      event.organization_id ??
      (await this.tenantScope.getOrganizationIdForProperty(propertyId));
    if (!organizationId) return null;
    if (!(await this.apps.isInstalled(organizationId, ACCOUNTING_APP_KEY))) {
      return null;
    }
    const settings = (await this.settingsModel
      .findOne({ property_id: new Types.ObjectId(propertyId) })
      .lean()
      .exec()) as unknown as AccountingSettings | null;
    if (!settings || settings.auto_posting === false) return null;
    return {
      propertyId,
      settings,
      accounts: AccountingSettingsService.accountMapping(settings),
      journals: AccountingSettingsService.journalMapping(settings),
    };
  }

  private async handle(
    event: DomainEvent<Payload>,
    model: string,
    work: (ctx: PostingContext, id: string) => Promise<void>,
  ): Promise<void> {
    const id = event.record?.id ?? refId((event.payload ?? {})._id);
    try {
      if (!id) return;
      const ctx = await this.resolveContext(event);
      if (!ctx) return;
      await work(ctx, id);
    } catch (error) {
      this.logger.error(
        `Comptabilisation de ${event.name} (${model} ${id ?? '?'}) impossible : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async postPlan(
    ctx: PostingContext,
    plan: PostingPlan | null,
    model: string,
    id: string,
    event: DomainEvent<Payload>,
  ): Promise<void> {
    if (!plan) return;
    for (const warning of plan.warnings) this.logger.warn(warning);
    await this.entries.createAndPost({
      property_id: ctx.propertyId,
      journal_code: ctx.journals[plan.journal_role],
      date: plan.date,
      reference: plan.reference,
      narration: plan.narration,
      currency: plan.currency ?? ctx.settings.currency,
      lines: plan.lines,
      source: { model, id, event: event.name },
      actor_id: event.actor_id,
    });
  }

  /** Contre-passe l'écriture issue de `originEvent` (si validée et non déjà contre-passée). */
  private async reverseSource(
    event: DomainEvent<Payload>,
    model: string,
    id: string,
    originEvent: string,
    reason: string,
  ): Promise<void> {
    if (await this.entries.findBySource(model, id, event.name)) return;
    const origin = await this.entries.findBySource(model, id, originEvent);
    if (!origin) return;
    if (origin.state === JournalEntryState.DRAFT) {
      await this.entries.cancel(String(origin._id));
      return;
    }
    if (origin.state !== JournalEntryState.POSTED || origin.reversed_entry_id) {
      return;
    }
    await this.entries.reverse(String(origin._id), {
      reason,
      actorId: event.actor_id,
      source: { model, id, event: event.name },
    });
  }
}
