import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContactMessageService } from '../services/contact-message.service';
import { CreateContactMessageDto } from '../dto/create-contact-message.dto';
import { UpdateContactMessageDto } from '../dto/update-contact-message.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('contact-messages')
export class ContactMessageController {
  constructor(private readonly contactMessageService: ContactMessageService) {}

  @Post()
  @Public()
  async create(@Body() createContactMessageDto: CreateContactMessageDto) {
    await this.contactMessageService.create(createContactMessageDto);
    return {
      success: true,
      message: 'Message envoyé avec succès. Nous vous recontacterons bientôt.',
    };
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.contactMessageService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.contactMessageService.findOne(params.id);
  }

  @Patch(':id')
  update(
    @Param() params: IdParamDto,
    @Body() updateContactMessageDto: UpdateContactMessageDto,
  ) {
    return this.contactMessageService.update(
      params.id,
      updateContactMessageDto,
    );
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.contactMessageService.remove(params.id);
  }
}
