import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readme = readFileSync(resolve(import.meta.dir, '..', 'README.md'), 'utf8');

describe('README listing copy', () => {
  test('uses public maintainer links instead of local workspace paths', () => {
    expect(readme).toContain('Shreyam Adhikari');
    expect(readme).toContain('https://shreyam1008.com.np');
    expect(readme).not.toContain('/vsk/PM/');
  });

  test('keeps credit present without leading the page', () => {
    expect(readme).toContain('## Credit');
    expect(readme).toContain('## Editing colors');
    expect(readme).toContain('native color picker');
    expect(readme).toContain('SwiftlyDaniel/oklch-color-visualiser');
    expect(readme).not.toContain('This repository is a maintained fork');
  });
});
