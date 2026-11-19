import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RecordMessage,
  RecordMessageType,
  TrackingValue,
} from '../schemas/record-message.entity';
import { RecordFollower } from '../schemas/record-follower.entity';
import {
  RecordActivity,
  RecordActivityState,
  RecordActivityType,
} from '../schemas/record-activity.entity';
import {
  MarkActivityDoneDto,
  PostMessageDto,
  ScheduleActivityDto,
} from '../dto/activity.dto';
import {
  RecordReference,
  RecordsService,
} from '../../records/services/records.service';
import { findRecordModel } from '../../records/record-registry';
import { computeActivityStatus, ActivityStatus } from '../activity-status';
import { labelForEvent } from '../activity-event-labels';
import type { DomainEvent } from '../../platform/events/domain-events';

/** Clé d'application du fil de discussion. */
export const ACTIVITY_APP_KEY = 'activity';

/** Nombre maximal de messages renvoyés par fil. */
const THREAD_MESSAGE_LIMIT = 200;

/** Auteur d'une action (utilisateur connecté). */
export interface ActivityActor {
  id?: string;
  type?: string;
}

/** Activité enrichie de son statut calculé. */
export type ActivityView = Record<string, unknown> & { status: ActivityStatus };

/** Création d'une activité par le code (automatisations). */
export interface CreateActivityInput {
  model: string;
  id: string;
  property_id?: string | null;
  activity_type?: RecordActivityType;
  summary: string;
  note?: string;
  due_date: Date;
  assigned_to?: string;
  created_by?: string;
  created_by_rule_id?: string;
}

/** Message système posté par le code (automatisations). */
export interface SystemMessageInput {
  model: string;
  id: string;
  body: string;
  property_id?: string | null;
  author_type?: string;
  author_id?: string;
}

/** Résultat du suivi automatique d'un événement. */
export type TrackingOutcome = 'created' | 'duplicate' | 'skipped';

const objectIdOrUndefined = (value: unknown): Types.ObjectId | undefined =>
  typeof value === 'string' && Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : undefined;

/**
 * Fil de discussion des fiches : messages, abonnés et activités planifiées,
 * plus le suivi automatique des événements métier.
 */
@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectModel(RecordMessage.name)
    private readonly messageModel: Model<RecordMessage>,
    @InjectModel(RecordFollower.name)
    private readonly followerModel: Model<RecordFollower>,
    @InjectModel(RecordActivity.name)
    private readonly activityModel: Model<RecordActivity>,
    private readonly records: RecordsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Fil de discussion
  // ---------------------------------------------------------------------------

  /** Messages (récents d'abord), abonnés et activités planifiées d'une fiche. */
  async getThread(model: string, id: string) {
    const ref = await this.resolveRecord(model, id);
    const filter = { res_model: ref.definition.model, res_id: ref.id };
    const [messages, followers, activities] = await Promise.all([
      this.messageModel
        .find({ ...filter, is_deleted: { $ne: true } })
        .sort({ created_at: -1 })
        .limit(THREAD_MESSAGE_LIMIT)
        .lean()
        .exec(),
      this.followerModel.find(filter).sort({ created_at: 1 }).lean().exec(),
      this.activityModel
        .find({
          ...filter,
          state: RecordActivityState.PLANNED,
          is_deleted: { $ne: true },
        })
        .sort({ due_date: 1 })
        .lean()
        .exec(),
    ]);
    return {
      res_model: ref.definition.model,
      res_id: String(ref.id),
      label: ref.definition.label,
      property_id: ref.property_id,
      messages,
      followers,
      activities: activities.map((activity) => this.withStatus(activity)),
    };
  }

  /** Publie une note ou un commentaire ; l'auteur devient abonné. */
  async postMessage(
    model: string,
    id: string,
    dto: PostMessageDto,
    actor: ActivityActor,
  ) {
    const ref = await this.resolveRecord(model, id);
    const message = await this.messageModel.create({
      property_id: objectIdOrUndefined(ref.property_id),
      res_model: ref.definition.model,
      res_id: ref.id,
      message_type: dto.message_type ?? RecordMessageType.NOTE,
      body: dto.body,
      author_id: objectIdOrUndefined(actor.id),
      author_type: actor.type,
    });
    if (actor.id) {
      await this.upsertFollower(ref, actor).catch((error: unknown) =>
        this.logger.warn(
          `Abonnement automatique impossible : ${(error as Error).message}`,
        ),
      );
    }
    return message;
  }

  /** Abonne l'utilisateur courant au fil de la fiche. */
  async follow(model: string, id: string, actor: ActivityActor) {
    const ref = await this.resolveRecord(model, id);
    this.requireActor(actor);
    await this.upsertFollower(ref, actor);
    return this.listFollowers(ref);
  }

  /** Désabonne l'utilisateur courant. */
  async unfollow(model: string, id: string, actor: ActivityActor) {
    const ref = await this.resolveRecord(model, id);
    const userId = this.requireActor(actor);
    await this.followerModel
      .deleteOne({
        res_model: ref.definition.model,
        res_id: ref.id,
        user_id: userId,
      })
      .exec();
    return this.listFollowers(ref);
  }

  // ---------------------------------------------------------------------------
  // Activités
  // ---------------------------------------------------------------------------

  /** Planifie une activité (par défaut assignée à son auteur). */
  async scheduleActivity(
    model: string,
    id: string,
    dto: ScheduleActivityDto,
    actor: ActivityActor,
  ): Promise<ActivityView> {
    const ref = await this.resolveRecord(model, id);
    const dueDate = new Date(dto.due_date);
    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException("Date d'échéance invalide");
    }
    const activity = await this.insertActivity(ref, {
      activity_type: dto.activity_type,
      summary: dto.summary,
      note: dto.note,
      due_date: dueDate,
      assigned_to: dto.assigned_to ?? actor.id,
      created_by: actor.id,
    });
    return this.withStatus(activity.toObject());
  }

  /**
   * Création d'activité par le code (automatisations). Vérifie la fiche et
   * l'installation de l'application `activity`.
   */
  async createActivity(input: CreateActivityInput): Promise<ActivityView> {
    const ref = await this.resolveRecord(input.model, input.id);
    const activity = await this.insertActivity(ref, input);
    return this.withStatus(activity.toObject());
  }

  /** Marque une activité comme faite et l'inscrit dans le fil. */
  async markDone(
    activityId: string,
    dto: MarkActivityDoneDto,
    actor: ActivityActor,
  ): Promise<ActivityView> {
    const updated = await this.transition(
      activityId,
      RecordActivityState.DONE,
      {
        done_at: new Date(),
        done_by: objectIdOrUndefined(actor.id),
        feedback: dto.feedback,
      },
    );
    const body = dto.feedback?.trim()
      ? `Activité « ${updated.summary} » terminée.\n${dto.feedback.trim()}`
      : `Activité « ${updated.summary} » terminée.`;
    await this.messageModel.create({
      property_id: updated.property_id,
      res_model: updated.res_model,
      res_id: updated.res_id,
      message_type: RecordMessageType.SYSTEM,
      body: body.slice(0, 10000),
      author_id: objectIdOrUndefined(actor.id),
      author_type: actor.type,
    });
    return this.withStatus(updated);
  }

  /** Annule une activité planifiée. */
  async cancelActivity(
    activityId: string,
    actor: ActivityActor,
  ): Promise<ActivityView> {
    const updated = await this.transition(
      activityId,
      RecordActivityState.CANCELLED,
      { done_by: objectIdOrUndefined(actor.id) },
    );
    return this.withStatus(updated);
  }

  /** Activités planifiées assignées à l'utilisateur, groupées par échéance. */
  async myActivities(userId: string | undefined, propertyId?: string) {
    const assignee = this.requireActor({ id: userId });
    const filter: Record<string, unknown> = {
      assigned_to: assignee,
      state: RecordActivityState.PLANNED,
      is_deleted: { $ne: true },
    };
    if (propertyId) filter.property_id = new Types.ObjectId(propertyId);
    const rows = await this.activityModel
      .find(filter)
      .sort({ due_date: 1 })
      .limit(500)
      .lean()
      .exec();
    const now = new Date();
    const overdue: ActivityView[] = [];
    const today: ActivityView[] = [];
    const upcoming: ActivityView[] = [];
    for (const row of rows) {
      const view = this.withStatus(row, now);
      if (view.status === 'overdue') overdue.push(view);
      else if (view.status === 'today') today.push(view);
      else upcoming.push(view);
    }
    return {
      overdue,
      today,
      upcoming,
      counts: {
        overdue: overdue.length,
        today: today.length,
        upcoming: upcoming.length,
        total: rows.length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Messages système et suivi automatique
  // ---------------------------------------------------------------------------

  /** Note système postée par le code (automatisations). */
  async postSystemMessage(input: SystemMessageInput) {
    const ref = await this.resolveRecord(input.model, input.id);
    return this.messageModel.create({
      property_id: objectIdOrUndefined(input.property_id ?? ref.property_id),
      res_model: ref.definition.model,
      res_id: ref.id,
      message_type: RecordMessageType.SYSTEM,
      body: input.body.slice(0, 10000),
      author_id: objectIdOrUndefined(input.author_id),
      author_type: input.author_type ?? 'system',
    });
  }

  /**
   * Ajoute un message de suivi pour un événement métier portant une fiche du
   * registre, si l'application est installée. Idempotent : un seul message
   * par identifiant d'événement (index unique `event_id`).
   */
  async trackEvent(event: DomainEvent<object>): Promise<TrackingOutcome> {
    const record = event.record;
    if (!record || !event.id) return 'skipped';
    const definition = findRecordModel(record.model);
    if (!definition || !Types.ObjectId.isValid(record.id)) return 'skipped';
    if (!(await this.records.isAppInstalledForEvent(event, ACTIVITY_APP_KEY))) {
      return 'skipped';
    }
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    try {
      await this.messageModel.create({
        property_id: objectIdOrUndefined(event.property_id),
        res_model: definition.model,
        res_id: new Types.ObjectId(record.id),
        message_type: RecordMessageType.TRACKING,
        body: labelForEvent(event.name),
        author_id: objectIdOrUndefined(event.actor_id),
        author_type: objectIdOrUndefined(event.actor_id) ? 'user' : 'system',
        tracking_values: buildTrackingValues(payload),
        event_name: event.name,
        event_id: event.id,
      });
      return 'created';
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return 'duplicate';
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Interne
  // ---------------------------------------------------------------------------

  private async resolveRecord(
    model: string,
    id: string,
  ): Promise<RecordReference> {
    const ref = await this.records.assertRecordExists(model, id);
    await this.records.assertAppInstalled(ref.property_id, ACTIVITY_APP_KEY);
    return ref;
  }

  private async insertActivity(
    ref: RecordReference,
    input: Omit<CreateActivityInput, 'model' | 'id'>,
  ) {
    return this.activityModel.create({
      property_id: objectIdOrUndefined(input.property_id ?? ref.property_id),
      res_model: ref.definition.model,
      res_id: ref.id,
      activity_type: input.activity_type ?? RecordActivityType.TODO,
      summary: input.summary,
      note: input.note,
      due_date: input.due_date,
      assigned_to: objectIdOrUndefined(input.assigned_to),
      created_by: objectIdOrUndefined(input.created_by),
      created_by_rule_id: objectIdOrUndefined(input.created_by_rule_id),
      state: RecordActivityState.PLANNED,
      due_notified: false,
    });
  }

  /** Transition atomique depuis l'état `planned`. */
  private async transition(
    activityId: string,
    state: RecordActivityState,
    extra: Record<string, unknown>,
  ) {
    const id = this.records.toObjectId(activityId, "Identifiant d'activité");
    const updated = await this.activityModel
      .findOneAndUpdate(
        {
          _id: id,
          state: RecordActivityState.PLANNED,
          is_deleted: { $ne: true },
        },
        { $set: { state, ...extra } },
        { new: true },
      )
      .lean()
      .exec();
    if (updated) return updated;
    const exists = await this.activityModel
      .exists({ _id: id, is_deleted: { $ne: true } })
      .exec();
    if (!exists) {
      throw new NotFoundException(`Activité introuvable (id : ${activityId})`);
    }
    throw new BadRequestException(
      "L'activité n'est plus planifiée (déjà terminée ou annulée)",
    );
  }

  private async upsertFollower(ref: RecordReference, actor: ActivityActor) {
    const userId = this.requireActor(actor);
    await this.followerModel
      .updateOne(
        { res_model: ref.definition.model, res_id: ref.id, user_id: userId },
        {
          $setOnInsert: {
            property_id: objectIdOrUndefined(ref.property_id),
            user_type: actor.type,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private listFollowers(ref: RecordReference) {
    return this.followerModel
      .find({ res_model: ref.definition.model, res_id: ref.id })
      .sort({ created_at: 1 })
      .lean()
      .exec();
  }

  private requireActor(actor: ActivityActor): Types.ObjectId {
    const id = objectIdOrUndefined(actor.id);
    if (!id) {
      throw new BadRequestException('Utilisateur courant non identifié');
    }
    return id;
  }

  private withStatus(activity: object, now = new Date()): ActivityView {
    const row = activity as Record<string, unknown> & {
      state: string;
      due_date: Date;
    };
    return { ...row, status: computeActivityStatus(row, now) };
  }
}

/**
 * Valeurs suivies déduites de la charge utile : `tracking_values` fournies
 * par l'émetteur, sinon le champ `status` (avec `previous_status` éventuel).
 */
export function buildTrackingValues(
  payload: Record<string, unknown>,
): TrackingValue[] | undefined {
  const provided = payload.tracking_values;
  if (Array.isArray(provided)) {
    const values = provided
      .filter(
        (item): item is Record<string, unknown> =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).field === 'string',
      )
      .slice(0, 50)
      .map((item) => ({
        field: String(item.field).slice(0, 100),
        old: item.old ?? null,
        new: item.new ?? null,
      }));
    return values.length ? values : undefined;
  }
  if (payload.status !== undefined && payload.status !== null) {
    return [
      {
        field: 'status',
        old: payload.previous_status ?? null,
        new: payload.status,
      },
    ];
  }
  return undefined;
}
