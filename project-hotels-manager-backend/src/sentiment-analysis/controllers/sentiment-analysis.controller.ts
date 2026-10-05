import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SentimentAnalysisService } from '../services/sentiment-analysis.service';
import { CreateSentimentAnalysisDto } from '../dto/create-sentiment-analysis.dto';
import { UpdateSentimentAnalysisDto } from '../dto/update-sentiment-analysis.dto';

@Controller('sentiment-analysis')
export class SentimentAnalysisController {
  constructor(
    private readonly sentimentAnalysisService: SentimentAnalysisService,
  ) {}

  @Post()
  create(@Body() createSentimentAnalysisDto: CreateSentimentAnalysisDto) {
    return this.sentimentAnalysisService.create(createSentimentAnalysisDto);
  }

  @Get()
  findAll() {
    return this.sentimentAnalysisService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sentimentAnalysisService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSentimentAnalysisDto: UpdateSentimentAnalysisDto,
  ) {
    return this.sentimentAnalysisService.update(
      +id,
      updateSentimentAnalysisDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sentimentAnalysisService.remove(+id);
  }
}
