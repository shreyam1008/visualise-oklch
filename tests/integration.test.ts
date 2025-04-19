import { describe, expect, test } from 'bun:test';

import { resolveSwatch } from '../src/color';
import { scanOklchFunctions } from '../src/scanner';

const fixturePath = `${import.meta.dir}/fixtures/showcase.css`;

describe('showcase fixture', () => {
  test('resolves all valid OKLCH samples in the fixture', async () => {
    const source = await Bun.file(fixturePath).text();
    const matches = scanOklchFunctions(source);
    const resolved = matches.map((match) => resolveSwatch(match.raw)).filter(Boolean);

    expect(matches).toHaveLength(5);
    expect(resolved).toHaveLength(4);
    expect(resolved.map((swatch) => swatch!.hex)).toEqual([
      '#ff0000',
      '#f7f9faf5',
      '#00d376',
      '#000000',
    ]);
  });
});
