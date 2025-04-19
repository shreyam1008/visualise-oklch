import { describe, expect, test } from 'bun:test';

import { buildColorPresentationEntries, detectDocumentColors } from '../src/picker';

describe('picker helpers', () => {
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
