import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NewsletterSubscriptionService } from '../services/newsletter-subscription.service';
import { CreateNewsletterSubscriptionDto } from '../dto/create-newsletter-subscription.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('newsletter-subscriptions')
export class NewsletterSubscriptionController {
  constructor(
    private readonly newsletterSubscriptionService: NewsletterSubscriptionService,
  ) {}

  @Post()
  @Public()
  async subscribe(@Body() dto: CreateNewsletterSubscriptionDto) {
    await this.newsletterSubscriptionService.subscribe(dto);
    return {
      success: true,
      message: 'Inscription confirmée ! Merci de votre confiance.',
    };
  }

  @Post('unsubscribe')
  @Public()
  async unsubscribe(@Body() dto: CreateNewsletterSubscriptionDto) {
    await this.newsletterSubscriptionService.unsubscribe(dto.email);
    return { success: true, message: 'Désinscription prise en compte.' };
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.newsletterSubscriptionService.findAll(query);
  }
}
