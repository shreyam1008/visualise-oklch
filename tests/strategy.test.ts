import { describe, expect, test } from 'bun:test';

import { expandRanges, mergeRanges, shouldUseCustomDecorations } from '../src/strategy';

describe('strategy helpers', () => {
  test('expands ranges within bounds', () => {
    expect(expandRanges([{ end: 7, start: 5 }], 4, 10)).toEqual([{ end: 10, start: 1 }]);
  });

  test('merges overlapping and adjacent ranges', () => {
    expect(mergeRanges([
      { end: 8, start: 4 },
      { end: 3, start: 1 },
      { end: 10, start: 9 },
      { end: 16, start: 14 },
    ])).toEqual([
      { end: 10, start: 1 },
      { end: 16, start: 14 },
    ]);
  });

  test('defers to native editor color decorators when they are enabled', () => {
    expect(shouldUseCustomDecorations(true, true)).toBe(false);
    expect(shouldUseCustomDecorations(true, false)).toBe(true);
    expect(shouldUseCustomDecorations(false, false)).toBe(false);
  });
});
