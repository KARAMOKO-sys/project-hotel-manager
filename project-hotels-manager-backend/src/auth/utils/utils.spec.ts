/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { parseDurationToSeconds } from './duration.util';
import { generateRandomToken, hashToken, safeCompare } from './crypto.util';

describe('auth utils', () => {
  it.each([
    ['15m', 900],
    ['30d', 2592000],
    ['12h', 43200],
    ['45s', 45],
    ['3600', 3600],
    [120, 120],
    ['1w', 604800],
  ])('parses %s', (input, expected) => {
    expect(parseDurationToSeconds(input as any, 1)).toBe(expected);
  });

  it.each([undefined, '', 'abc', '-5m', 0])('falls back on %s', (input) => {
    expect(parseDurationToSeconds(input as any, 42)).toBe(42);
  });

  it('generates unique url-safe tokens and stable hashes', () => {
    const a = generateRandomToken();
    const b = generateRandomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).toHaveLength(64);
    expect(safeCompare('abc', 'abc')).toBe(true);
    expect(safeCompare('abc', 'abd')).toBe(false);
    expect(safeCompare('abc', 'abcd')).toBe(false);
  });
});
