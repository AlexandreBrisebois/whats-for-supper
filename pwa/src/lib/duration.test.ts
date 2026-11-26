import { describe, expect, it } from 'vitest';
import { formatRecipeTime, minutesToIsoDuration, parseRecipeTimeMinutes } from './duration';

describe('duration helpers', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['PT0M', null],
    ['PT35M', 35],
    ['PT1H', 60],
    ['PT1H30M', 90],
    ['45 min', 45],
    ['15', 15],
    ['unknown', null],
  ])('parseRecipeTimeMinutes(%j) -> %j', (input, expected) => {
    expect(parseRecipeTimeMinutes(input)).toBe(expected);
  });

  it.each([
    [35, 'PT35M'],
    [60, 'PT1H'],
    [90, 'PT1H30M'],
    [135, 'PT2H15M'],
  ])('minutesToIsoDuration(%i) -> %s', (minutes, expected) => {
    expect(minutesToIsoDuration(minutes)).toBe(expected);
  });

  it.each([
    ['PT35M', '35 MINS'],
    ['PT1H', '1H'],
    ['PT1H30M', '1H 30 MINS'],
    ['45 min', '45 MINS'],
    ['PT0M', ''],
    [null, ''],
  ])('formatRecipeTime(%j) -> %j', (input, expected) => {
    expect(formatRecipeTime(input)).toBe(expected);
  });
});
