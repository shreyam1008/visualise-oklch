import { describe, expect, test } from 'bun:test';

import { buildColorPresentationEntries, buildOklchEdit, detectDocumentColors, findOklchAtOffset, isPickerColor } from '../src/picker';
import { oklchToSrgb, parseOklch } from '../src/color';

describe('picker helpers', () => {
  test('preserves authored wide-gamut colors and alpha-only native edits', () => {
    const source = 'oklch(0.620001 0.35 260.12345 / 90%)';
    const rgb = oklchToSrgb(parseOklch(source)!);
    expect(buildColorPresentationEntries(rgb, source)[0]?.text).toBe(source);
    const quantized = { ...rgb, red: Math.round(rgb.red * 255) / 255, green: Math.round(rgb.green * 255) / 255, blue: Math.round(rgb.blue * 255) / 255 };
    expect(buildColorPresentationEntries(quantized, source)[0]?.text).toBe(source);
    expect(buildColorPresentationEntries({ ...rgb, alpha: 0.5 }, source)[0]?.text).toBe('oklch(0.620001 0.35 260.12345 / 50%)');
    expect(buildColorPresentationEntries({ red: 1, green: 0, blue: 0, alpha: 1 }, source)[0]?.text).not.toBe(source);
  });

  test('changes only the requested OKLCH channel, preserving missing components', () => {
    const source = 'oklch(72.12345% 0.25 none / none)';
    const parsed = parseOklch(source)!;
    expect(buildOklchEdit(source, parsed)).toBe(source);
    expect(buildOklchEdit(source, { ...parsed, chroma: 0.2 })).toBe('oklch(72.12345% 0.2 none / none)');
    expect(buildOklchEdit(source, { ...parsed, alpha: 1 })).toBe('oklch(72.12345% 0.25 none)');
  });

  test('locates only the literal under the cursor, including multiline values', () => {
    const source = 'red: oklch(0.7\n 0.2 30); blue: oklch(0.6 0.2 260);';
    expect(findOklchAtOffset(source, 16)?.source).toBe('oklch(0.7\n 0.2 30)');
    expect(findOklchAtOffset(source, 0)).toBeNull();
    expect(findOklchAtOffset(source, source.indexOf('260'))?.parsed.hueDegrees).toBe(260);
    expect(detectDocumentColors(source, 1)).toHaveLength(1);
  });

  test('rejects malformed or nonfinite webview edits', () => {
    const valid = { lightness: 0.6, chroma: 0.8, hueDegrees: 300, alpha: 0.2 };
    expect(isPickerColor(valid)).toBe(true);
    for (const value of [null, {}, { ...valid, chroma: NaN }, { ...valid, lightness: 2 }, { ...valid, alpha: '1' }, { ...valid, chroma: -1 }]) {
      expect(isPickerColor(value)).toBe(false);
    }
  });
  test('detects editable OKLCH literals in document text', () => {
    const source = [
      '--brand: oklch(62.8% 0.258 29.23);',
      '--shadow: oklch(0 0 0 / 8%);',
      '--skip: notoklch(1 0 0);',
    ].join('\n');

    const matches = detectDocumentColors(source);

    expect(matches).toHaveLength(2);
    expect(matches.map((match) => match.source)).toEqual([
      'oklch(62.8% 0.258 29.23)',
      'oklch(0 0 0 / 8%)',
    ]);
  });

  test('builds OKLCH-first presentations with traditional fallbacks', () => {
    const entries = buildColorPresentationEntries({
      alpha: 1,
      blue: 0,
      green: 0,
      red: 1,
    });

    expect(entries[0]?.text).toMatch(/^oklch\(/);
    expect(entries.map((entry) => entry.text)).toContain('#ff0000');
    expect(entries.map((entry) => entry.text)).toContain('rgb(255 0 0)');
    expect(entries.map((entry) => entry.text)).toContain('hsl(0 100% 50%)');
  });

  test('preserves alpha in all picker presentations', () => {
    const entries = buildColorPresentationEntries({
      alpha: 0.08,
      blue: 0,
      green: 0,
      red: 0,
    });

    expect(entries.map((entry) => entry.text)).toEqual([
      'oklch(0% 0 0 / 8%)',
      '#00000014',
      'rgb(0 0 0 / 8%)',
      'hsl(0 0% 0% / 8%)',
    ]);
  });
});
