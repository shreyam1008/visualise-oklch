import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const docsRoot = resolve(import.meta.dir, '..', 'docs');
const repoRoot = resolve(import.meta.dir, '..');
const indexHtml = readFileSync(resolve(docsRoot, 'index.html'), 'utf8');
const rootIndexHtml = readFileSync(resolve(repoRoot, 'index.html'), 'utf8');

describe('docs site', () => {
  test('ships essential crawler assets', () => {
    expect(existsSync(resolve(repoRoot, '.nojekyll'))).toBe(true);
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
    expect(indexHtml).toContain('Native picker editing');
    expect(indexHtml).toContain('google-site-verification');
    expect(indexHtml).toContain('Shreyam Adhikari');
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
    expect(indexHtml).toContain('built-in picker');
  });

  test('keeps attribution compact in the footer', () => {
    expect(indexHtml).toContain('shreyam1008.com.np');
    expect(indexHtml).toContain('SwiftlyDaniel/oklch-color-visualiser');
    expect(indexHtml).toContain('Original idea credit:');
    expect(indexHtml).not.toContain('section class="section credit-section"');
    expect(indexHtml).not.toContain('maintained fork of SwiftlyDaniel');
  });

  test('routes the repo root to the interactive docs site', () => {
    expect(rootIndexHtml).toContain('window.location.replace("./docs/")');
    expect(rootIndexHtml).toContain('Open the site');
    expect(rootIndexHtml).toContain('./docs/logo-mark.svg');
  });
});
