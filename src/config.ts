import * as vscode from 'vscode';

export const CONFIG_NAMESPACE = 'visualiseOklch';

export interface ExtensionConfig {
  enabled: boolean;
  fullScanMaxChars: number;
  linePadding: number;
  maxVisibleMatches: number;
  updateDelayMs: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const getConfig = (): ExtensionConfig => {
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

  return {
    enabled: config.get<boolean>('enabled', true),
    fullScanMaxChars: clamp(config.get<number>('fullScanMaxChars', 250_000), 25_000, 2_000_000),
    linePadding: clamp(config.get<number>('linePadding', 40), 0, 500),
    maxVisibleMatches: clamp(config.get<number>('maxVisibleMatches', 500), 25, 5_000),
    updateDelayMs: clamp(config.get<number>('updateDelayMs', 120), 0, 1_000),
  };
};
