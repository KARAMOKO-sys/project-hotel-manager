import { PartialType } from '@nestjs/mapped-types';
import { CreateRecommendationDto } from './create-recommendation.dto';

/**
 * Mise à jour du contenu d'une recommandation. Le statut évolue uniquement
 * via les routes `shown`, `accept` et `dismiss`.
 */
export class UpdateRecommendationDto extends PartialType(
  CreateRecommendationDto,
) {}
