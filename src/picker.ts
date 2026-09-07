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

export interface LocatedOklchLiteral {
  end: number;
  parsed: ParsedOklch;
  source: string;
  start: number;
}

export const detectDocumentColors = (text: string, maxMatches = Number.POSITIVE_INFINITY): DetectedDocumentColor[] => {
  const matches: DetectedDocumentColor[] = [];
  const literals = new Map<string, { parsed: ParsedOklch; rgb: RgbColor } | null>();

  for (const candidate of scanOklchFunctions(text, 0, maxMatches)) {
    let resolved = literals.get(candidate.raw);
    if (resolved === undefined) {
      const parsed = parseOklch(candidate.raw);
      resolved = parsed ? { parsed, rgb: oklchToSrgb(parsed) } : null;
      if (literals.size < 1024) { literals.set(candidate.raw, resolved); }
    }
    if (!resolved) {
      continue;
    }

    matches.push({
      end: candidate.end,
      parsed: resolved.parsed,
      rgb: resolved.rgb,
      source: candidate.raw,
      start: candidate.start,
    });
  }

  return matches;
};

export const isPickerColor = (value: unknown): value is ParsedOklch => {
  if (!value || typeof value !== 'object') { return false; }
  const color = value as ParsedOklch;
  return [color.lightness, color.chroma, color.hueDegrees, color.alpha].every((channel) => Number.isFinite(channel))
    && color.lightness >= 0 && color.lightness <= 1 && color.chroma >= 0
    && color.hueDegrees >= 0 && color.hueDegrees <= 360 && color.alpha >= 0 && color.alpha <= 1;
};

export const findOklchAtOffset = (
  text: string,
  offset: number,
  searchRadius = Number.POSITIVE_INFINITY,
): LocatedOklchLiteral | null => {
  const safeOffset = Math.max(0, Math.min(text.length, offset));
  const bounded = Number.isFinite(searchRadius);
  const radius = bounded ? Math.max(0, searchRadius) : text.length;
  const windowStart = Math.max(0, safeOffset - radius);
  const windowEnd = Math.min(text.length, safeOffset + radius);

  for (const candidate of scanOklchFunctions(text.slice(windowStart, windowEnd), windowStart)) {
    if (candidate.start > safeOffset || candidate.end < safeOffset) {
      continue;
    }

    const parsed = parseOklch(candidate.raw);
    if (parsed) {
      return {
        end: candidate.end,
        parsed,
        source: candidate.raw,
        start: candidate.start,
      };
    }
  }

  return null;
};

export const buildColorPresentationEntries = (rgb: RgbColor, source?: string): ColorPresentationEntry[] => {
  const original = source ? parseOklch(source) : null;
  const preview = original ? oklchToSrgb(original) : null;
  // The native picker works in sRGB. Merely opening it (or changing alpha)
  // must not destroy authored chroma, hue, precision, or missing components.
  // VS Code's picker quantizes the supplied RGB channels to 8-bit values.
  const sameRgb = preview && Math.round(preview.red * 255) === Math.round(rgb.red * 255)
    && Math.round(preview.green * 255) === Math.round(rgb.green * 255)
    && Math.round(preview.blue * 255) === Math.round(rgb.blue * 255);
  const oklch = sameRgb && original && source
    ? buildOklchEdit(source, { ...original, alpha: rgb.alpha })
    : formatNormalizedOklch(srgbToOklch(rgb));
  const seen = new Set<string>();
  const entries = [
    oklch,
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

export const buildOklchEdit = (source: string, next: ParsedOklch): string => {
  const original = parseOklch(source);
  if (!original) {
    return formatNormalizedOklch(next);
  }
  if (Object.keys(next).every((key) => next[key as keyof ParsedOklch] === original[key as keyof ParsedOklch])) {
    return source;
  }
  const body = source.slice(source.indexOf('(') + 1, source.lastIndexOf(')'));
  const [channels = '', alphaToken] = body.split('/');
  const tokens = channels.trim().split(/\s+/);
  const formatted = formatNormalizedOklch(next);
  const [newChannels = '', newAlpha] = formatted.slice(6, -1).split('/');
  const fresh = newChannels.trim().split(/\s+/);
  const keys = ['lightness', 'chroma', 'hueDegrees'] as const;
  const result = keys.map((key, index) => next[key] === original[key] ? tokens[index] : fresh[index]).join(' ');
  const alpha = next.alpha === original.alpha ? alphaToken?.trim() : newAlpha?.trim();
  return `oklch(${result}${alpha === undefined ? '' : ` / ${alpha}`})`;
};
