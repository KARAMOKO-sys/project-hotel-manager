import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationFilterQueryDto } from '../dto/recommendation-query.dto';
import { RecommendationStatus } from '../schemas/recommendation.entity';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let service: Record<string, jest.Mock>;
  const id = '507f1f77bcf86cd799439011';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            generateForGuest: jest.fn(),
            scoreCandidates: jest.fn(),
            expireOutdated: jest.fn(),
            getConversionStats: jest.fn(),
            findByGuest: jest.fn(),
            getActiveForGuest: jest.fn(),
            markAsShown: jest.fn(),
            accept: jest.fn(),
            dismiss: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(RecommendationController);
    service = module.get<RecommendationService, Record<string, jest.Mock>>(
      RecommendationService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate accept', () => {
    void controller.accept({ id }, { revenue: 10 });
    expect(service.accept).toHaveBeenCalledWith(id, { revenue: 10 });
  });

  it('should delegate dismiss with the reason', () => {
    void controller.dismiss({ id }, { reason: 'no' });
    expect(service.dismiss).toHaveBeenCalledWith(id, 'no');
  });

  it('should pass filters to findAll', () => {
    const query = Object.assign(new RecommendationFilterQueryDto(), {
      status: RecommendationStatus.SHOWN,
    });
    void controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query, {
      status: RecommendationStatus.SHOWN,
    });
  });
});
