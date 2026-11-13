import { Test, TestingModule } from '@nestjs/testing';
import { IaPredictionController } from './ia-prediction.controller';
import { IaPredictionService } from '../services/ia-prediction.service';
import { ForecastDto } from '../dto/forecast.dto';

describe('IaPredictionController', () => {
  let controller: IaPredictionController;
  let service: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IaPredictionController],
      providers: [
        {
          provide: IaPredictionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            forecast: jest.fn(),
            getAccuracy: jest.fn(),
            findByProperty: jest.fn(),
            getPendingEvaluation: jest.fn(),
            recordActual: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(IaPredictionController);
    service = module.get<IaPredictionService, Record<string, jest.Mock>>(
      IaPredictionService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate recordActual', () => {
    void controller.recordActual({ id: 'a' }, { actual_value: 12 });
    expect(service.recordActual).toHaveBeenCalledWith('a', 12);
  });

  it('should delegate forecast', () => {
    const dto = Object.assign(new ForecastDto(), { history: [1] });
    void controller.forecast(dto);
    expect(service.forecast).toHaveBeenCalledWith(dto);
  });
});
