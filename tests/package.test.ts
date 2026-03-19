import { describe, expect, test } from 'bun:test';

interface PackageJsonShape {
  contributes?: {
    configuration?: {
      properties?: Record<string, unknown>;
    };
  };
  packageManager?: string;
  scripts?: Record<string, string>;
}

const packageJson = await Bun.file(`${import.meta.dir}/../package.json`).json() as PackageJsonShape;

describe('package metadata', () => {
  test('uses a Bun-first toolchain and fast native type checking', () => {
    expect(packageJson.packageManager?.startsWith('bun@')).toBe(true);
    expect(packageJson.scripts?.build).toContain('bun build');
    expect(packageJson.scripts?.typecheck).toContain('tsgo');
    expect(packageJson.scripts?.typecheck).not.toContain('npm');
    expect(packageJson.scripts?.lint).toContain('oxlint');
  });

  test('keeps both publish targets wired', () => {
    expect(packageJson.scripts?.['publish:marketplace']).toContain('vsce');
    expect(packageJson.scripts?.['publish:openvsx']).toContain('ovsx');
  });

  test('exposes performance tuning settings', () => {
    const properties = packageJson.contributes?.configuration?.properties ?? {};

    expect(properties['visualiseOklch.enabled']).toBeDefined();
    expect(properties['visualiseOklch.fullScanMaxChars']).toBeDefined();
    expect(properties['visualiseOklch.linePadding']).toBeDefined();
    expect(properties['visualiseOklch.maxVisibleMatches']).toBeDefined();
    expect(properties['visualiseOklch.updateDelayMs']).toBeDefined();
  });
});
