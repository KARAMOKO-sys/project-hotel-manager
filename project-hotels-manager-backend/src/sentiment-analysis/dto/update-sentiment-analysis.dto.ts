import { PartialType } from '@nestjs/mapped-types';
import { CreateSentimentAnalysisDto } from './create-sentiment-analysis.dto';

export class UpdateSentimentAnalysisDto extends PartialType(
  CreateSentimentAnalysisDto,
) {}
