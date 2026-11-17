import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import {
  NewsletterSubscription,
  NewsletterSubscriptionDocument,
} from '../schemas/newsletter-subscription.entity';
import { CreateNewsletterSubscriptionDto } from '../dto/create-newsletter-subscription.dto';

/** Service des inscriptions à la newsletter. */
@Injectable()
export class NewsletterSubscriptionService extends BaseCrudService<
  NewsletterSubscription,
  CreateNewsletterSubscriptionDto,
  Partial<NewsletterSubscription>
> {
  constructor(
    @InjectModel(NewsletterSubscription.name)
    private readonly subscriptionModel: Model<NewsletterSubscription>,
  ) {
    super(subscriptionModel, NewsletterSubscription.name);
  }

  /**
   * Inscrit un email. Une inscription désactivée est réactivée ;
   * une inscription active lève une 409.
   */
  async subscribe(
    dto: CreateNewsletterSubscriptionDto,
  ): Promise<NewsletterSubscription> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.subscriptionModel.findOne({ email }).exec();

    if (existing && existing.is_active && !existing.is_deleted) {
      throw new ConflictException(
        'Cet email est déjà inscrit à la newsletter.',
      );
    }

    if (existing) {
      existing.is_active = true;
      existing.is_deleted = false;
      existing.unsubscribed_at = undefined;
      return existing.save();
    }

    return this.create({ email });
  }

  /** Désinscrit un email (sans supprimer l'historique). */
  async unsubscribe(email: string): Promise<void> {
    await this.subscriptionModel
      .updateOne(
        { email: email.trim().toLowerCase() },
        { is_active: false, unsubscribed_at: new Date() },
      )
      .exec();
  }
}
