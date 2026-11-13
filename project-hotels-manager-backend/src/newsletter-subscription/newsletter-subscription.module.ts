import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsletterSubscriptionService } from './services/newsletter-subscription.service';
import { NewsletterSubscriptionController } from './controllers/newsletter-subscription.controller';
import {
  NewsletterSubscription,
  NewsletterSubscriptionSchema,
} from './schemas/newsletter-subscription.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NewsletterSubscription.name,
        schema: NewsletterSubscriptionSchema,
      },
    ]),
  ],
  controllers: [NewsletterSubscriptionController],
  providers: [NewsletterSubscriptionService],
  exports: [NewsletterSubscriptionService],
})
export class NewsletterSubscriptionModule {}
