import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const docsRoot = resolve(import.meta.dir, '..', 'docs');
const indexHtml = readFileSync(resolve(docsRoot, 'index.html'), 'utf8');

describe('docs site', () => {
  test('ships essential crawler assets', () => {
    expect(existsSync(resolve(docsRoot, '.nojekyll'))).toBe(true);
    expect(existsSync(resolve(docsRoot, 'logo-mark.svg'))).toBe(true);
    expect(existsSync(resolve(docsRoot, 'robots.txt'))).toBe(true);
    expect(existsSync(resolve(docsRoot, 'sitemap.xml'))).toBe(true);
    expect(existsSync(resolve(docsRoot, 'site.webmanifest'))).toBe(true);
    expect(existsSync(resolve(docsRoot, 'og.svg'))).toBe(true);
  });

  test('contains canonical SEO metadata', () => {
    expect(indexHtml).toContain('https://shreyam1008.github.io/visualise-oklch/');
    expect(indexHtml).toContain('Visualise OKLCH');
    expect(indexHtml).toContain('Open VSX');
    expect(indexHtml).toContain('"@type": "SoftwareApplication"');
    expect(indexHtml).toContain('name="description"');
    expect(indexHtml).toContain('property="og:image"');
  });

  test('includes the interactive playground hooks', () => {
    expect(indexHtml).toContain('data-channel="lightness"');
    expect(indexHtml).toContain('data-output-oklch-full');
    expect(indexHtml).toContain('data-output-hex-row');
    expect(indexHtml).toContain('data-oklch-ramp');
    expect(indexHtml).toContain('data-hsl-ramp');
    expect(indexHtml).toContain('data-token-cloud');
  });
});
