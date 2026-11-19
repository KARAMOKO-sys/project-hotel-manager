import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { ActivityService } from '../../activity/services/activity.service';
import { RecordActivityType } from '../../activity/schemas/record-activity.entity';
import { NotificationLogService } from '../../notification-log/services/notification-log.service';
import { NotificationChannel } from '../../base-entities/enums/notification-channel.enum';
import { NotificationRecipientType } from '../../notification-log/schemas/notification-log.entity';
import { findRecordModel } from '../../records/record-registry';
import { renderTemplate } from '../engine/template';
import {
  ACTION_TYPE_SCHEMAS,
  AutomationActionType,
  RuleAction,
} from '../engine/rule-validator';

/** Canal interne repris par l'application ESB. */
export const INTEGRATION_OUTBOUND_CHANNEL = 'integration.outbound';

/** Message émis sur `integration.outbound`. */
export interface IntegrationOutboundMessage {
  topic: string;
  event: Record<string, unknown>;
  /** Règle à l'origine de la publication. */
  rule_id: string;
}

/** Action telle qu'elle serait exécutée (essai à blanc). */
export interface PlannedAction {
  type: AutomationActionType;
  params: Record<string, unknown>;
  warnings: string[];
}

const DAY_MS = 24 * 3600 * 1000;
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const text = (value: unknown): string =>
  typeof value === 'string' ? value : '';
const isObjectId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

/** Exécution des actions des règles d'automatisation. */
@Injectable()
export class AutomationActionsService {
  constructor(
    private readonly activity: ActivityService,
    private readonly notifications: NotificationLogService,
    private readonly emitter: EventEmitter2,
  ) {}

  /** Paramètres avec les `{{chemin}}` résolus depuis l'enveloppe. */
  renderParams(action: RuleAction, envelope: unknown): Record<string, unknown> {
    const schema = ACTION_TYPE_SCHEMAS.find(
      (item) => item.type === action.type,
    );
    const rendered: Record<string, unknown> = { ...(action.params ?? {}) };
    for (const param of schema?.params ?? []) {
      const value = rendered[param.name];
      if (param.templating && typeof value === 'string') {
        rendered[param.name] = renderTemplate(value, envelope);
      }
    }
    return rendered;
  }

  /** Décrit l'action sans l'exécuter (essai à blanc). */
  plan(action: RuleAction, envelope: Record<string, unknown>): PlannedAction {
    const params = this.renderParams(action, envelope);
    const warnings: string[] = [];
    const schema = ACTION_TYPE_SCHEMAS.find(
      (item) => item.type === action.type,
    );
    if (schema?.requires_record) {
      const record = envelope.record as
        { model?: string; id?: string } | undefined;
      if (!record || !findRecordModel(record.model) || !isObjectId(record.id)) {
        warnings.push(
          "L'événement ne porte pas de fiche prise en charge : action impossible",
        );
      }
    }
    if (
      action.type === AutomationActionType.CREATE_ACTIVITY &&
      params.assigned_to &&
      !isObjectId(params.assigned_to)
    ) {
      warnings.push('assigned_to ne donne pas un identifiant valide : ignoré');
    }
    if (action.type === AutomationActionType.NOTIFY && !params.recipient) {
      warnings.push('Destinataire vide après résolution');
    }
    return { type: action.type, params, warnings };
  }

  /** Exécute une action ; lève une erreur en cas d'échec. */
  async execute(
    action: RuleAction,
    event: Record<string, unknown>,
    ruleId: string,
  ): Promise<Record<string, unknown>> {
    const params = this.renderParams(action, event);
    switch (action.type) {
      case AutomationActionType.CREATE_ACTIVITY:
        return this.createActivity(params, event, ruleId);
      case AutomationActionType.POST_NOTE:
        return this.postNote(params, event, ruleId);
      case AutomationActionType.NOTIFY:
        return this.notify(params, event, ruleId);
      case AutomationActionType.PUBLISH_EVENT:
        return this.publishEvent(params, event, ruleId);
      default:
        throw new Error(`Type d'action inconnu : ${String(action.type)}`);
    }
  }

  private requireRecord(event: Record<string, unknown>) {
    const record = event.record as { model?: string; id?: string } | undefined;
    if (!record || !findRecordModel(record.model) || !isObjectId(record.id)) {
      throw new Error("L'événement ne porte pas de fiche prise en charge");
    }
    return record as { model: string; id: string };
  }

  private async createActivity(
    params: Record<string, unknown>,
    event: Record<string, unknown>,
    ruleId: string,
  ) {
    const record = this.requireRecord(event);
    const days =
      typeof params.due_in_days === 'number' ? params.due_in_days : 0;
    const activity = await this.activity.createActivity({
      model: record.model,
      id: record.id,
      property_id: isObjectId(event.property_id)
        ? event.property_id
        : undefined,
      activity_type: params.activity_type as RecordActivityType,
      summary: String(params.summary).slice(0, 255),
      note: typeof params.note === 'string' ? params.note : undefined,
      due_date: new Date(Date.now() + days * DAY_MS),
      assigned_to: isObjectId(params.assigned_to)
        ? params.assigned_to
        : undefined,
      created_by_rule_id: ruleId,
    });
    return { activity_id: String(activity._id) };
  }

  private async postNote(
    params: Record<string, unknown>,
    event: Record<string, unknown>,
    ruleId: string,
  ) {
    const record = this.requireRecord(event);
    const body = text(params.body).trim();
    if (!body) throw new Error('Note vide après résolution');
    const message = await this.activity.postSystemMessage({
      model: record.model,
      id: record.id,
      body,
      property_id: isObjectId(event.property_id)
        ? event.property_id
        : undefined,
      author_type: `automation:${ruleId}`.slice(0, 50),
    });
    return { message_id: String(message._id) };
  }

  private async notify(
    params: Record<string, unknown>,
    event: Record<string, unknown>,
    ruleId: string,
  ) {
    const recipient = text(params.recipient).trim();
    if (!recipient) throw new Error('Destinataire vide après résolution');
    const channel = params.channel as NotificationChannel;
    if (
      channel === NotificationChannel.EMAIL &&
      !OBJECT_ID.test(recipient) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
    ) {
      throw new Error(`Adresse email invalide : ${recipient}`);
    }
    const message = text(params.message).trim();
    if (!message) throw new Error('Message vide après résolution');
    const record = event.record as { model?: string; id?: string } | undefined;
    const subject =
      typeof params.subject === 'string' ? params.subject.trim() : '';
    const log = await this.notifications.create({
      property_id: isObjectId(event.property_id)
        ? event.property_id
        : undefined,
      channel,
      ...(OBJECT_ID.test(recipient)
        ? {
            recipient_id: recipient,
            recipient_type: NotificationRecipientType.USER,
          }
        : {
            recipient_address: recipient.slice(0, 320),
            recipient_type: NotificationRecipientType.OTHER,
          }),
      template: 'automation',
      subject: subject ? subject.slice(0, 255) : undefined,
      body: message.slice(0, 10000),
      related_entity_type: record?.model,
      related_entity_id: isObjectId(record?.id) ? record.id : undefined,
      metadata: {
        source: 'automation',
        rule_id: ruleId,
        event_id: event.id,
        event_name: event.name,
      },
    });
    return {
      notification_id: String((log as unknown as { _id: Types.ObjectId })._id),
    };
  }

  private async publishEvent(
    params: Record<string, unknown>,
    event: Record<string, unknown>,
    ruleId: string,
  ) {
    const message: IntegrationOutboundMessage = {
      topic: String(params.topic),
      event,
      rule_id: ruleId,
    };
    const listeners = await this.emitter.emitAsync(
      INTEGRATION_OUTBOUND_CHANNEL,
      message,
    );
    return { topic: message.topic, listeners: listeners.length };
  }
}
