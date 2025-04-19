import { describe, expect, test } from 'bun:test';

import { resolveSwatch } from '../src/color';
import { buildDecorationRenderOptions } from '../src/render';

describe('buildDecorationRenderOptions', () => {
  test('uses theme-aware borders for transparent dark neutrals', () => {
    const swatch = resolveSwatch('oklch(0 0 0 / 0.05)');
    expect(swatch).not.toBeNull();

    const options = buildDecorationRenderOptions(swatch!);
    expect(options.before?.backgroundColor).toBe('#0000000d');
    expect(options.before?.border).toBe('1px solid rgba(255, 255, 255, 0.94)');
    expect(options.dark?.before?.border).toBe('1px solid rgba(255, 255, 255, 0.94)');
    expect(options.light?.before?.border).toBe('1px solid rgba(15, 23, 42, 0.94)');
  });
});
