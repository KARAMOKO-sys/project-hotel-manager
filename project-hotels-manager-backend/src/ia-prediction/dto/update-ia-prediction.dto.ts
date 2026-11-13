import { PartialType } from '@nestjs/mapped-types';
import { CreateIaPredictionDto } from './create-ia-prediction.dto';

/** La valeur réelle s'enregistre via la route dédiée `PATCH :id/actual`. */
export class UpdateIaPredictionDto extends PartialType(CreateIaPredictionDto) {}
