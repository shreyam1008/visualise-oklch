import { describe, expect, test } from 'bun:test';

import { formatNormalizedOklch, isOklchInSrgbGamut, maxSrgbChroma, oklchToSrgb, parseOklch, resolveSwatch, rgbToHex } from '../src/color';

describe('parseOklch', () => {
  test('uses the CSS percentage reference range for chroma', () => {
    expect(parseOklch('oklch(50% 100% 20)')?.chroma).toBe(0.4);
    expect(parseOklch('oklch(50% 50% 20)')?.chroma).toBe(0.2);
  });

  test('clamps numeric lightness and rejects invalid modern syntax', () => {
    expect(parseOklch('oklch(2 0.2 20)')?.lightness).toBe(1);
    expect(parseOklch('oklch(-1 0.2 20)')?.lightness).toBe(0);
    for (const source of ['oklch(50%, 0.2, 20)', 'oklch(50% 0.2 20 /)', 'oklch(50% 0.2 20 / / 1)']) {
      expect(parseOklch(source)).toBeNull();
    }
  });
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

describe('sRGB gamut boundary', () => {
  test('finds the varying chroma limit while keeping lightness and hue', () => {
    for (const lightness of [0.1, 0.5, 0.9]) {
      for (const hueDegrees of [0, 90, 142, 260, 330]) {
        const chroma = maxSrgbChroma(lightness, hueDegrees);
        expect(chroma).toBeGreaterThan(0);
        expect(isOklchInSrgbGamut({ lightness, chroma, hueDegrees, alpha: 1 })).toBe(true);
        expect(isOklchInSrgbGamut({ lightness, chroma: chroma + 0.00001, hueDegrees, alpha: 1 })).toBe(false);
      }
    }
    expect(maxSrgbChroma(0, 20)).toBe(0);
    expect(maxSrgbChroma(1, 20)).toBe(0);
  });

  test('maps extreme chroma to finite RGB and lightness endpoints to black/white', () => {
    expect(resolveSwatch('oklch(0 100 30)')?.hex).toBe('#000000');
    expect(resolveSwatch('oklch(1 100 30)')?.hex).toBe('#ffffff');
    const rgb = oklchToSrgb({ lightness: 0.5, chroma: 1e300, hueDegrees: 20, alpha: 0.4 });
    expect([rgb.red, rgb.green, rgb.blue].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
    expect(rgb.alpha).toBe(0.4);
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
