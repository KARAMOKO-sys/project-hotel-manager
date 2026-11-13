import {
  labelFromScore,
  LexiconSentimentScorer,
} from './lexicon-sentiment.scorer';
import {
  ReviewAspect,
  ReviewEmotion,
  SentimentLabel,
  SentimentLanguage,
} from '../schemas/sentiment-analysis.entity';

describe('LexiconSentimentScorer', () => {
  const scorer = new LexiconSentimentScorer();

  it('should score a clearly positive French review', () => {
    const r = scorer.score(
      'Séjour parfait, personnel très accueillant et chambre impeccable !',
    );
    expect(r.label).toBe(SentimentLabel.POSITIVE);
    expect(r.score).toBeGreaterThan(0.5);
    expect(r.score).toBeLessThan(1);
    expect(r.language).toBe(SentimentLanguage.FR);
  });

  it('should score a clearly negative English review', () => {
    const r = scorer.score(
      'The room was dirty and the staff was rude. Terrible.',
    );
    expect(r.label).toBe(SentimentLabel.NEGATIVE);
    expect(r.score).toBeLessThan(-0.5);
    expect(r.language).toBe(SentimentLanguage.EN);
  });

  it('should return neutral with zero confidence for text without sentiment words', () => {
    const r = scorer.score('Nous sommes arrivés mardi.');
    expect(r.score).toBe(0);
    expect(r.label).toBe(SentimentLabel.NEUTRAL);
    expect(r.confidence).toBe(0);
    expect(r.aspects).toEqual([]);
  });

  it('should handle empty text', () => {
    const r = scorer.score('');
    expect(r.score).toBe(0);
    expect(r.language).toBeNull();
  });

  it('should invert sentiment on negation', () => {
    expect(scorer.score('La chambre n’était pas propre').label).toBe(
      SentimentLabel.NEGATIVE,
    );
    expect(scorer.score("The room wasn't clean").label).toBe(
      SentimentLabel.NEGATIVE,
    );
    expect(scorer.score('No problem at all').score).toBeGreaterThan(0);
  });

  it('should amplify with intensifiers', () => {
    const plain = scorer.score('good').score;
    const boosted = scorer.score('very good').score;
    expect(boosted).toBeGreaterThan(plain);
  });

  it('should score aspects separately in a mixed review', () => {
    const r = scorer.score(
      'Great location, but the room was dirty and the street very noisy.',
    );
    const byAspect = Object.fromEntries(r.aspects.map((a) => [a.aspect, a]));
    expect(byAspect[ReviewAspect.LOCATION].label).toBe(SentimentLabel.POSITIVE);
    expect(byAspect[ReviewAspect.CLEANLINESS].label).toBe(
      SentimentLabel.NEGATIVE,
    );
    expect(byAspect[ReviewAspect.NOISE].label).toBe(SentimentLabel.NEGATIVE);
  });

  it('should produce a near-neutral overall score for balanced mixed sentiment', () => {
    const r = scorer.score(
      'Le petit-déjeuner était bon mais le prix trop cher.',
    );
    expect(Math.abs(r.score)).toBeLessThan(0.5);
    const food = r.aspects.find((a) => a.aspect === ReviewAspect.FOOD);
    const price = r.aspects.find((a) => a.aspect === ReviewAspect.PRICE);
    expect(food?.score).toBeGreaterThan(0);
    expect(price?.score).toBeLessThan(0);
  });

  it('should extract aspects and emotions', () => {
    expect(scorer.extractAspects('Le personnel et le quartier')).toEqual([
      ReviewAspect.STAFF,
      ReviewAspect.LOCATION,
    ]);
    expect(
      scorer.detectEmotions('Très déçu, inacceptable et frustrant'),
    ).toEqual([
      ReviewEmotion.ANGER,
      ReviewEmotion.FRUSTRATION,
      ReviewEmotion.DISAPPOINTMENT,
    ]);
  });

  it('should expose contributions for explainability', () => {
    const r = scorer.score('not good');
    expect(r.contributions).toEqual([{ word: 'good', value: -1.5 }]);
  });

  it('should map scores to labels with a neutral band', () => {
    expect(labelFromScore(0.1)).toBe(SentimentLabel.NEUTRAL);
    expect(labelFromScore(0.15)).toBe(SentimentLabel.POSITIVE);
    expect(labelFromScore(-0.2)).toBe(SentimentLabel.NEGATIVE);
  });
});
