import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { Model } from 'mongoose';
import {
  RecordActivity,
  RecordActivityState,
} from '../schemas/record-activity.entity';
import { DomainEventPublisher } from '../../platform/events/domain-event.publisher';
import { DomainEvents } from '../../platform/events/domain-events';
import { RecordsService } from '../../records/services/records.service';
import { ACTIVITY_APP_KEY } from './activity.service';

/** Nombre maximal d'activités traitées par passage. */
const BATCH_SIZE = 500;

/**
 * Toutes les 15 minutes : publie `platform.activity.due` une seule fois pour
 * chaque activité planifiée dont l'échéance est dépassée (`due_notified`).
 */
@Injectable()
export class ActivityDueScheduler {
  private readonly logger = new Logger(ActivityDueScheduler.name);
  private running = false;

  constructor(
    @InjectModel(RecordActivity.name)
    private readonly activityModel: Model<RecordActivity>,
    private readonly events: DomainEventPublisher,
    private readonly records: RecordsService,
  ) {}

  @Cron('0 */15 * * * *')
  async handleCron(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const published = await this.notifyDueActivities();
      if (published > 0) {
        this.logger.log(`${published} activité(s) arrivée(s) à échéance`);
      }
    } catch (error) {
      this.logger.error(
        `Échec du contrôle des échéances : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Retourne le nombre d'événements publiés. */
  async notifyDueActivities(now: Date = new Date()): Promise<number> {
    const candidates = await this.activityModel
      .find({
        state: RecordActivityState.PLANNED,
        due_notified: { $ne: true },
        due_date: { $lt: now },
        is_deleted: { $ne: true },
      })
      .sort({ due_date: 1 })
      .limit(BATCH_SIZE)
      .lean()
      .exec();

    let published = 0;
    for (const candidate of candidates) {
      // Réservation atomique : une seule instance publie l'événement.
      const claimed = await this.activityModel
        .findOneAndUpdate(
          { _id: candidate._id, due_notified: { $ne: true } },
          { $set: { due_notified: true } },
          { new: true },
        )
        .lean()
        .exec();
      if (!claimed) continue;

      const propertyId = claimed.property_id
        ? String(claimed.property_id)
        : undefined;
      const event = { property_id: propertyId };
      if (
        !(await this.records.isAppInstalledForEvent(event, ACTIVITY_APP_KEY))
      ) {
        continue;
      }
      await this.events.publish(DomainEvents.ACTIVITY_DUE, {
        property_id: propertyId,
        record: { model: claimed.res_model, id: String(claimed.res_id) },
        payload: {
          activity_id: String(claimed._id),
          activity_type: claimed.activity_type,
          summary: claimed.summary,
          due_date: claimed.due_date,
          assigned_to: claimed.assigned_to ? String(claimed.assigned_to) : null,
          created_by_rule_id: claimed.created_by_rule_id
            ? String(claimed.created_by_rule_id)
            : null,
        },
      });
      published += 1;
    }
    return published;
  }
}
