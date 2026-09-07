import { describe, expect, test } from 'bun:test';
import { colorFormats, lightnessSamples, parseColorInput } from '../src/siteColor';

describe('linked CSS color converter', () => {
  test.each(['#f00', '#ff0000', 'rgb(255 0 0)', 'rgb(100%, 0%, 0%)', 'hsl(0 100% 50%)', 'hwb(0 0% 0%)'])('red in %s', (input) => {
    expect(colorFormats(parseColorInput(input)!).hex).toBe('#ff0000');
  });
  test('alpha is preserved through every format', () => {
    const source = parseColorInput('#33669980')!;
    for (const value of Object.values(colorFormats(source))) {
      expect(parseColorInput(value)!.alpha).toBeCloseTo(source.alpha, 3);
    }
  });
  test('OKLab conversion preserves out-of-sRGB chroma', () => {
    const source = parseColorInput('oklch(70% 0.4 150 / 30%)')!;
    const roundtrip = parseColorInput(colorFormats(source).oklab!)!;
    expect(roundtrip.chroma).toBeCloseTo(0.4, 4);
    expect(roundtrip.hueDegrees).toBeCloseTo(150, 2);
  });
  test.each(['#12', 'rgb(1, 2 3)', 'hsl(10 20 30)', 'oklab(1 2)', 'rgb(0 0 0 /)', '<script>', 'var(--color)', 'rgb(1e999 0 0)', 'rgb(0 0 0 / 1e999)'])('rejects incomplete/unsupported %s', (input) => {
    expect(parseColorInput(input)).toBeNull();
  });
  test('HWB normalization and hue wrapping', () => {
    expect(colorFormats(parseColorInput('hwb(720 100% 100%)')!).hex).toBe('#808080');
    expect(colorFormats(parseColorInput('hsl(-120 100% 50%)')!).hex).toBe('#0000ff');
  });
  test('lightness sweep is bounded with black and white endpoints', () => {
    const samples = lightnessSamples(parseColorInput('oklch(60% 0.2 260)')!);
    expect(samples).toHaveLength(101);
    expect(samples[0]!.hex).toBe('#000000');
    expect(samples[100]!.hex).toBe('#ffffff');
    expect(samples.every((s) => [s.red, s.green, s.blue].every((v) => Number.isFinite(v) && v >= 0 && v <= 255))).toBe(true);
    expect(samples.some((s) => !s.inGamut)).toBe(true);
    expect(samples[50]!.red - samples[40]!.red).not.toBeCloseTo(samples[50]!.blue - samples[40]!.blue, 0);
  });
});
