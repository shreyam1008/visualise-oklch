import {
  formatHslCss,
  formatNormalizedOklch,
  formatRgbCss,
  oklchToSrgb,
  parseOklch,
  rgbToHex,
  rgbToHsl,
  srgbToOklch,
  type ParsedOklch,
  type RgbColor,
} from './color';
import { scanOklchFunctions } from './scanner';

export interface ColorPresentationEntry {
  label: string;
  text: string;
}

export interface DetectedDocumentColor {
  end: number;
  parsed: ParsedOklch;
  rgb: RgbColor;
  source: string;
  start: number;
}

export const detectDocumentColors = (text: string): DetectedDocumentColor[] => {
  const matches: DetectedDocumentColor[] = [];

  for (const candidate of scanOklchFunctions(text)) {
    const parsed = parseOklch(candidate.raw);
    if (!parsed) {
      continue;
    }

    matches.push({
      end: candidate.end,
      parsed,
      rgb: oklchToSrgb(parsed),
      source: candidate.raw,
      start: candidate.start,
    });
  }

  return matches;
};

export const buildColorPresentationEntries = (rgb: RgbColor): ColorPresentationEntry[] => {
  const seen = new Set<string>();
  const entries = [
    formatNormalizedOklch(srgbToOklch(rgb)),
    rgbToHex(rgb),
    formatRgbCss(rgb),
    formatHslCss(rgbToHsl(rgb)),
  ];

  return entries.flatMap((text) => {
    if (seen.has(text)) {
      return [];
    }

    seen.add(text);
    return [{ label: text, text }];
  });
};
