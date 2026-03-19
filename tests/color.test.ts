import { describe, expect, test } from 'bun:test';

import { formatNormalizedOklch, oklchToSrgb, parseOklch, resolveSwatch, rgbToHex } from '../src/color';

describe('parseOklch', () => {
  test('parses percentage lightness with percentage alpha', () => {
    expect(parseOklch('oklch(62.8% 0.258 29.23 / 80%)')).toEqual({
      alpha: 0.8,
      chroma: 0.258,
      hueDegrees: 29.23,
      lightness: 0.628,
    });
  });

  test('parses angle units and bare decimal lightness', () => {
    expect(parseOklch('OKLCH(0.72 0.19 0.5turn / .5)')).toEqual({
      alpha: 0.5,
      chroma: 0.19,
      hueDegrees: 180,
      lightness: 0.72,
    });
  });

  test('rejects invalid hue percentages', () => {
    expect(parseOklch('oklch(62% 0.258 45%)')).toBeNull();
  });
});

describe('resolveSwatch', () => {
  test('resolves neutral white and transparent black exactly', () => {
    expect(resolveSwatch('oklch(100% 0 0)')?.hex).toBe('#ffffff');
    expect(resolveSwatch('oklch(0% 0 0 / 25%)')?.hex).toBe('#00000040');
  });

  test('formats a stable normalized string', () => {
    const parsed = parseOklch('oklch(62.8% 0.258 29.23 / 80%)');
    expect(parsed).not.toBeNull();
    expect(formatNormalizedOklch(parsed!)).toBe('oklch(62.8% 0.258 29.23 / 80%)');
  });

  test('produces a visible swatch for vivid colors', () => {
    const parsed = parseOklch('oklch(72% 0.22 145)');
    expect(parsed).not.toBeNull();
    expect(rgbToHex(oklchToSrgb(parsed!))).toMatch(/^#[0-9a-f]{6}$/);
    expect(resolveSwatch('oklch(72% 0.22 145)')).toMatchObject({
      darkBorderColor: expect.any(String),
      hex: expect.stringMatching(/^#[0-9a-f]{6}$/),
      lightBorderColor: expect.any(String),
      normalized: 'oklch(72% 0.22 145)',
    });
  });

  test('keeps low-alpha neutrals visible in dark and light themes', () => {
    expect(resolveSwatch('oklch(0 0 0 / 0.08)')).toMatchObject({
      darkBorderColor: 'rgba(255, 255, 255, 0.94)',
      hex: '#00000014',
      lightBorderColor: 'rgba(15, 23, 42, 0.94)',
    });
  });
});
