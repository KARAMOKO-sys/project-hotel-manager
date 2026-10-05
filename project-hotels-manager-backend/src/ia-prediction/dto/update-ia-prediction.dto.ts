import { PartialType } from '@nestjs/mapped-types';
import { CreateIaPredictionDto } from './create-ia-prediction.dto';

export class UpdateIaPredictionDto extends PartialType(CreateIaPredictionDto) {}
