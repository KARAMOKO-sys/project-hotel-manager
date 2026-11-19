import { BadRequestException } from '@nestjs/common';
import {
  crossesBelowThreshold,
  escapeRegex,
  reorderQuantity,
  roundMoney,
  toObjectId,
  weightedAverageCost,
} from './inventory.utils';

describe('inventory.utils', () => {
  describe('weightedAverageCost', () => {
    it('pondère le coût existant et le coût entrant', () => {
      // 10 × 400 + 30 × 500 = 19 000 / 40 = 475
      expect(weightedAverageCost(10, 400, 30, 500)).toBe(475);
    });

    it('prend le coût entrant quand le stock est nul ou négatif', () => {
      expect(weightedAverageCost(0, 400, 5, 650)).toBe(650);
      expect(weightedAverageCost(-3, 400, 5, 650)).toBe(650);
    });

    it('arrondit à 2 décimales et ignore une entrée nulle', () => {
      expect(weightedAverageCost(3, 100, 1, 200)).toBe(125);
      expect(weightedAverageCost(1, 100, 2, 101)).toBe(100.67);
      expect(weightedAverageCost(4, 100, 0, 999)).toBe(100);
    });
  });

  describe('crossesBelowThreshold', () => {
    it('ne déclenche qu’au franchissement', () => {
      expect(crossesBelowThreshold(10, 4, 5)).toBe(true);
      expect(crossesBelowThreshold(5, 4, 5)).toBe(true);
      expect(crossesBelowThreshold(4, 3, 5)).toBe(false);
      expect(crossesBelowThreshold(10, 5, 5)).toBe(false);
      expect(crossesBelowThreshold(10, 0, 0)).toBe(false);
    });
  });

  describe('reorderQuantity', () => {
    it('vise le stock maximum, déduction faite des commandes en cours', () => {
      expect(reorderQuantity(3, 5, 20)).toBe(17);
      expect(reorderQuantity(3, 5, 20, 10)).toBe(7);
      expect(reorderQuantity(3, 5, 20, 30)).toBe(0);
    });

    it('vise le minimum lorsque le maximum n’est pas défini', () => {
      expect(reorderQuantity(2, 5, 0)).toBe(3);
    });
  });

  it('roundMoney arrondit à 2 décimales', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(10 / 3)).toBe(3.33);
  });

  it('toObjectId refuse un identifiant invalide (400)', () => {
    expect(() => toObjectId('abc')).toThrow(BadRequestException);
    expect(String(toObjectId('507f1f77bcf86cd799439011'))).toBe(
      '507f1f77bcf86cd799439011',
    );
  });

  it('escapeRegex neutralise les métacaractères', () => {
    expect(escapeRegex('a.b*(c)')).toBe('a\\.b\\*\\(c\\)');
  });
});
