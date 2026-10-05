import { Injectable } from '@nestjs/common';
import { CreateIaPredictionDto } from '../dto/create-ia-prediction.dto';
import { UpdateIaPredictionDto } from '../dto/update-ia-prediction.dto';

@Injectable()
export class IaPredictionService {
  create(createIaPredictionDto: CreateIaPredictionDto) {
    return 'This action adds a new iaPrediction';
  }

  findAll() {
    return `This action returns all iaPrediction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} iaPrediction`;
  }

  update(id: number, updateIaPredictionDto: UpdateIaPredictionDto) {
    return `This action updates a #${id} iaPrediction`;
  }

  remove(id: number) {
    return `This action removes a #${id} iaPrediction`;
  }
}
