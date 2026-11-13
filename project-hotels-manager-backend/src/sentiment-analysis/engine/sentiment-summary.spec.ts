import {
  buildSentimentTrend,
  improvementSuggestions,
  periodKey,
  summarizeSentiments,
} from './sentiment-summary';
import {
  ReviewAspect,
  SentimentLabel,
} from '../schemas/sentiment-analysis.entity';

describe('sentiment-summary', () => {
  const samples = [
    {
      score: 0.8,
      label: SentimentLabel.POSITIVE,
      analyzed_at: new Date('2026-01-10T10:00:00Z'),
      aspects: [
        {
          aspect: ReviewAspect.STAFF,
          score: 0.8,
          label: SentimentLabel.POSITIVE,
          mentions: 1,
        },
      ],
    },
    {
      score: -0.6,
      label: SentimentLabel.NEGATIVE,
      is_alert: true,
      analyzed_at: new Date('2026-02-03T10:00:00Z'),
      aspects: [
        {
          aspect: ReviewAspect.CLEANLINESS,
          score: -0.7,
          label: SentimentLabel.NEGATIVE,
          mentions: 1,
        },
      ],
    },
    {
      score: 0,
      label: SentimentLabel.NEUTRAL,
      analyzed_at: new Date('2026-02-20T10:00:00Z'),
    },
    { score: 0.4, label: SentimentLabel.POSITIVE },
  ];

  it('should summarize distribution, average and aspects', () => {
    const s = summarizeSentiments(samples);
    expect(s.total).toBe(4);
    expect(s.average_score).toBe(0.15);
    expect(s.distribution).toEqual({ positive: 2, neutral: 1, negative: 1 });
    expect(s.percentages.positive).toBe(50);
    expect(s.net_sentiment).toBe(25);
    expect(s.alerts).toBe(1);
    expect(s.top_positive_aspects[0].aspect).toBe(ReviewAspect.STAFF);
    expect(s.top_negative_aspects[0].aspect).toBe(ReviewAspect.CLEANLINESS);
  });

  it('should return zeros for an empty list', () => {
    const s = summarizeSentiments([]);
    expect(s.total).toBe(0);
    expect(s.average_score).toBe(0);
    expect(s.percentages).toEqual({ positive: 0, neutral: 0, negative: 0 });
    expect(s.aspects).toEqual([]);
  });

  it('should build a monthly trend ignoring undated samples', () => {
    expect(buildSentimentTrend(samples, 'month')).toEqual([
      { period: '2026-01', count: 1, average_score: 0.8, negative_share: 0 },
      { period: '2026-02', count: 2, average_score: -0.3, negative_share: 50 },
    ]);
  });

  it('should compute ISO week keys starting on monday', () => {
    expect(periodKey(new Date('2026-10-04T12:00:00Z'), 'week')).toBe(
      '2026-09-28',
    );
    expect(periodKey(new Date('2026-10-05T12:00:00Z'), 'week')).toBe(
      '2026-10-05',
    );
    expect(periodKey(new Date('2026-10-05T12:00:00Z'), 'day')).toBe(
      '2026-10-05',
    );
  });

  it('should suggest improvements only for negative aspects', () => {
    const suggestions = improvementSuggestions(summarizeSentiments(samples));
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].aspect).toBe(ReviewAspect.CLEANLINESS);
    expect(suggestions[0].suggestion).toContain('ménage');
  });
});
