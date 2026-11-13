import { ContentBasedScorer, WEIGHTS } from './content-based.scorer';
import { RecommendationType } from '../schemas/recommendation.entity';

describe('ContentBasedScorer', () => {
  const scorer = new ContentBasedScorer();
  const spa = {
    title: 'Massage relaxant',
    type: RecommendationType.CROSS_SELL,
    category: 'spa',
    tags: ['spa', 'wellness', 'leisure'],
    price: 30000,
  };
  const upgrade = {
    title: 'Suite vue mer',
    type: RecommendationType.UPSELL,
    category: 'room_upgrade',
    tags: ['sea_view', 'premium'],
    price: 80000,
  };
  const meeting = {
    title: 'Salle de réunion',
    type: RecommendationType.SERVICE,
    category: 'business_center',
    tags: ['business'],
    price: 50000,
  };

  it('should give a high, explained score to a matching candidate', () => {
    const r = scorer.score(
      {
        preferences: ['spa', 'wellness'],
        past_categories: ['spa', 'spa', 'restaurant'],
        average_spend: 30000,
        stay_purpose: 'leisure',
      },
      spa,
    );
    // préférences 2/3, historique 1, budget 1, motif 1
    expect(r.score).toBeCloseTo(
      WEIGHTS.preferences * (2 / 3) +
        WEIGHTS.history +
        WEIGHTS.budget +
        WEIGHTS.purpose,
      3,
    );
    expect(r.reasons).toHaveLength(4);
    expect(r.breakdown.history).toBe(1);
  });

  it('should fall back to a neutral budget when spend is unknown', () => {
    const r = scorer.score({}, upgrade);
    expect(r.score).toBe(WEIGHTS.budget * 0.5);
    expect(r.reasons).toEqual([]);
  });

  it('should not divide by zero with zero average spend or empty tags', () => {
    const r = scorer.score(
      { average_spend: 0, preferences: ['x'] },
      { title: 'Eau', type: RecommendationType.SERVICE },
    );
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.breakdown.budget).toBe(0.5);
  });

  it('should treat free items as perfect budget fit', () => {
    const r = scorer.score({ average_spend: 10000 }, { ...meeting, price: 0 });
    expect(r.breakdown.budget).toBe(1);
  });

  it('should rank, filter excluded categories and apply min score and limit', () => {
    const profile = {
      preferences: ['sea_view', 'business'],
      stay_purpose: 'business',
      excluded_categories: ['SPA'],
    };
    const ranked = scorer.rank(profile, [spa, upgrade, meeting], {
      min_score: 0.3,
      limit: 1,
    });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].title).toBe('Salle de réunion');
    expect(ranked.find((r) => r.category === 'spa')).toBeUndefined();
  });

  it('should return an empty list for no candidates', () => {
    expect(scorer.rank({ preferences: ['spa'] }, [])).toEqual([]);
  });

  it('should order ties alphabetically for determinism', () => {
    const a = { title: 'B', type: RecommendationType.SERVICE };
    const b = { title: 'A', type: RecommendationType.SERVICE };
    const ranked = scorer.rank({}, [a, b], { min_score: 0 });
    expect(ranked.map((r) => r.title)).toEqual(['A', 'B']);
  });
});
