import { formatHslCss, formatNormalizedOklch, formatRgbCss, isOklchInSrgbGamut, oklchToSrgb, parseOklch, rgbToHex, rgbToHsl, srgbToOklch, type ParsedOklch, type RgbColor } from './color';

const clamp = (n: number, min = 0, max = 1): number => Math.max(min, Math.min(max, n));
const number = (token: string, scale = 1): number => token.endsWith('%') ? Number(token.slice(0, -1)) * scale / 100 : Number(token);
const scalar = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?%?$/i;
const fmt = (n: number): string => String(Number(n.toFixed(5)));
const hue = (token: string): number | undefined => parseOklch(`oklch(0.5 0.1 ${token})`)?.hueDegrees;

export const hslToRgb = (h: number, s: number, l: number, alpha: number): RgbColor => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const channels = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return { red: channels[0]! + m, green: channels[1]! + m, blue: channels[2]! + m, alpha };
};

// Standalone numeric CSS colors only; never evaluate CSS expressions or HTML.
export const parseColorInput = (input: string): ParsedOklch | null => {
  const text = input.trim();
  if (/^oklch\(/i.test(text)) { return parseOklch(text); }
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(text)?.[1];
  if (hex) {
    const expanded = hex.length < 5 ? [...hex].map((c) => c + c).join('') : hex;
    return srgbToOklch({ red: parseInt(expanded.slice(0, 2), 16) / 255, green: parseInt(expanded.slice(2, 4), 16) / 255, blue: parseInt(expanded.slice(4, 6), 16) / 255, alpha: expanded.length === 8 ? parseInt(expanded.slice(6), 16) / 255 : 1 });
  }
  const match = /^(rgb|rgba|hsl|hsla|hwb|oklab)\(([^()]*)\)$/i.exec(text);
  if (!match) { return null; }
  const kind = match[1]!.toLowerCase();
  const body = match[2]!;
  const legacy = body.includes(',');
  if (legacy && (kind === 'hwb' || kind === 'oklab' || body.includes('/'))) { return null; }
  const pieces = legacy ? body.split(',').map((p) => p.trim()) : body.replaceAll('/', ' / ').trim().split(/\s+/);
  let alpha = 1;
  if (legacy ? pieces.length === 4 : pieces.length === 5 && pieces[3] === '/') {
    const alphaToken = pieces.pop()!;
    if (!scalar.test(alphaToken) || !Number.isFinite(number(alphaToken))) { return null; }
    alpha = clamp(number(alphaToken));
    if (!legacy) { pieces.pop(); }
  }
  if (pieces.length !== 3 || !Number.isFinite(alpha)) { return null; }
  const [a, b, c] = pieces as [string, string, string];
  if (!scalar.test(b) || !scalar.test(c) || ![b, c].every((v) => Number.isFinite(number(v)))) { return null; }
  let rgb: RgbColor;
  if (kind.startsWith('rgb')) {
    if (!scalar.test(a) || !Number.isFinite(number(a))) { return null; }
    if (legacy && [a, b, c].some((v) => v.endsWith('%') !== a.endsWith('%'))) { return null; }
    rgb = { red: clamp(number(a, 255) / 255), green: clamp(number(b, 255) / 255), blue: clamp(number(c, 255) / 255), alpha };
  } else if (kind === 'oklab') {
    if (!scalar.test(a)) { return null; }
    const l = number(a), labA = number(b, 0.4), labB = number(c, 0.4);
    if (![l, labA, labB].every((v) => Number.isFinite(v))) { return null; }
    const chroma = Math.hypot(labA, labB);
    return { lightness: clamp(l), chroma, hueDegrees: (Math.atan2(labB, labA) * 180 / Math.PI + 360) % 360, alpha };
  } else {
    const h = hue(a);
    if (h === undefined || !b.endsWith('%') || !c.endsWith('%')) { return null; }
    const first = clamp(number(b)), second = clamp(number(c));
    if (kind === 'hwb') {
      if (first + second >= 1) {
        const gray = first / (first + second);
        rgb = { red: gray, green: gray, blue: gray, alpha };
      } else {
        const pure = hslToRgb(h, 1, 0.5, alpha);
        const scale = 1 - first - second;
        rgb = { red: pure.red * scale + first, green: pure.green * scale + first, blue: pure.blue * scale + first, alpha };
      }
    } else { rgb = hslToRgb(h, first, second, alpha); }
  }
  return [rgb.red, rgb.green, rgb.blue].every((v) => Number.isFinite(v)) ? srgbToOklch(rgb) : null;
};

export const colorFormats = (color: ParsedOklch): Record<string, string> => {
  const converted = oklchToSrgb(color);
  // Remove matrix round-trip noise before quantizing half-byte boundaries.
  const rgb = { ...converted, red: Number(converted.red.toFixed(6)), green: Number(converted.green.toFixed(6)), blue: Number(converted.blue.toFixed(6)) };
  const hsl = rgbToHsl(rgb);
  const angle = color.hueDegrees * Math.PI / 180;
  const alpha = color.alpha < 1 ? ` / ${fmt(color.alpha * 100)}%` : '';
  return {
    oklch: formatNormalizedOklch(color), hex: rgbToHex(rgb), rgb: formatRgbCss(rgb), hsl: formatHslCss(hsl),
    oklab: `oklab(${fmt(color.lightness)} ${fmt(color.chroma * Math.cos(angle))} ${fmt(color.chroma * Math.sin(angle))}${alpha})`,
    hwb: `hwb(${fmt(hsl.hueDegrees)} ${fmt(Math.min(rgb.red, rgb.green, rgb.blue) * 100)}% ${fmt((1 - Math.max(rgb.red, rgb.green, rgb.blue)) * 100)}%${alpha})`,
  };
};

export const lightnessSamples = (color: ParsedOklch) => Array.from({ length: 101 }, (_, i) => {
  const value = { ...color, lightness: i / 100, alpha: 1 };
  const rgb = oklchToSrgb(value);
  return { lightness: i, red: rgb.red * 255, green: rgb.green * 255, blue: rgb.blue * 255, hex: rgbToHex(rgb), inGamut: isOklchInSrgbGamut(value) };
});

export { isOklchInSrgbGamut, oklchToSrgb, rgbToHsl } from './color';
