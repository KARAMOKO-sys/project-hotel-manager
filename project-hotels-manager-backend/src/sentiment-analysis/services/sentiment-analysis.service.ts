import { Injectable } from '@nestjs/common';
import { CreateSentimentAnalysisDto } from '../dto/create-sentiment-analysis.dto';
import { UpdateSentimentAnalysisDto } from '../dto/update-sentiment-analysis.dto';

@Injectable()
export class SentimentAnalysisService {
  create(createSentimentAnalysisDto: CreateSentimentAnalysisDto) {
    return 'This action adds a new sentimentAnalysis';
  }

  findAll() {
    return `This action returns all sentimentAnalysis`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sentimentAnalysis`;
  }

  update(id: number, updateSentimentAnalysisDto: UpdateSentimentAnalysisDto) {
    return `This action updates a #${id} sentimentAnalysis`;
  }

  remove(id: number) {
    return `This action removes a #${id} sentimentAnalysis`;
  }
}
