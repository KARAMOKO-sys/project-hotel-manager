import { PartialType } from '@nestjs/mapped-types';
import { CreateSentimentAnalysisDto } from './create-sentiment-analysis.dto';

/** Mise à jour : si `text` change, l'analyse est recalculée. */
export class UpdateSentimentAnalysisDto extends PartialType(
  CreateSentimentAnalysisDto,
) {}
