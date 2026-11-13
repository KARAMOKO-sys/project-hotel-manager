import { computeConversionStats } from './conversion-stats';
import {
  RecommendationStatus,
  RecommendationType,
} from '../schemas/recommendation.entity';

describe('computeConversionStats', () => {
  it('should compute conversion and acceptance rates and revenue', () => {
    const stats = computeConversionStats([
      {
        type: RecommendationType.UPSELL,
        status: RecommendationStatus.ACCEPTED,
        revenue_generated: 50000,
      },
      {
        type: RecommendationType.UPSELL,
        status: RecommendationStatus.DISMISSED,
      },
      {
        type: RecommendationType.SERVICE,
        status: RecommendationStatus.SHOWN,
      },
      {
        type: RecommendationType.SERVICE,
        status: RecommendationStatus.PENDING,
      },
    ]);
    expect(stats.total).toBe(4);
    expect(stats.exposed).toBe(3);
    expect(stats.conversion_rate).toBe(33.33);
    expect(stats.acceptance_rate).toBe(50);
    expect(stats.revenue_generated).toBe(50000);
    expect(stats.by_type.upsell).toEqual({
      exposed: 2,
      accepted: 1,
      conversion_rate: 50,
    });
    expect(stats.by_type.service?.conversion_rate).toBe(0);
    expect(stats.by_status.pending).toBe(1);
  });

  it('should return zero rates when nothing was exposed', () => {
    const stats = computeConversionStats([]);
    expect(stats.conversion_rate).toBe(0);
    expect(stats.acceptance_rate).toBe(0);
    expect(stats.revenue_generated).toBe(0);
    expect(stats.by_type).toEqual({});
  });
});
