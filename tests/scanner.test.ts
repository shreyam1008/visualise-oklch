import { describe, expect, test } from 'bun:test';

import { scanOklchFunctions } from '../src/scanner';

describe('scanOklchFunctions', () => {
  test('finds multiple matches and preserves the original source', () => {
    const source = 'background: oklch(62.8% 0.258 29.23); color: OKLCH(98% 0.01 255 / 96%);';
    const matches = scanOklchFunctions(source);

    expect(matches.map((match) => match.raw)).toEqual([
      'oklch(62.8% 0.258 29.23)',
      'OKLCH(98% 0.01 255 / 96%)',
    ]);
    expect(matches[0]?.start).toBe(source.indexOf('oklch('));
  });

  test('ignores identifier-prefixed false positives', () => {
    expect(scanOklchFunctions('const broken = prefixoklch(62.8% 0.258 29.23);')).toHaveLength(0);
  });

  test('supports multiline functions', () => {
    const source = '--hero: oklch(\n  72%\n  0.22\n  145\n);';
    const matches = scanOklchFunctions(source);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.raw).toContain('\n  0.22\n');
  });

  test('keeps scanning after an incomplete earlier candidate', () => {
    const source = 'oklch(62.8% 0.258 29.23 color: oklch(100% 0 0);';
    const matches = scanOklchFunctions(source);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.raw).toBe('oklch(100% 0 0)');
  });
});
