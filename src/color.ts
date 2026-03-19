export interface ParsedOklch {
  alpha: number;
  chroma: number;
  hueDegrees: number;
  lightness: number;
}

export interface RgbColor {
  alpha: number;
  blue: number;
  green: number;
  red: number;
}

interface LinearRgbColor extends RgbColor {}

export interface ResolvedSwatch {
  darkBorderColor: string;
  hex: string;
  lightBorderColor: string;
  normalized: string;
  rgb: RgbColor;
}

const FUNCTION_PATTERN = /^\s*oklch\s*\(([\s\S]+)\)\s*$/i;
const NUMBER_PATTERN = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(%|deg|grad|rad|turn)?$/i;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const wrapDegrees = (value: number): number => {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const formatNumber = (value: number, digits = 4): string => {
  const fixed = value.toFixed(digits);
  return fixed.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, '$1');
};

const splitTopLevel = (input: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;

  for (const character of input) {
    if (character === '(') {
      depth += 1;
      current += character;
      continue;
    }

    if (character === ')') {
      depth = Math.max(0, depth - 1);
      current += character;
      continue;
    }

    if (depth === 0 && /\s/.test(character)) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        tokens.push(trimmed);
      }
      current = '';
      continue;
    }

    current += character;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    tokens.push(trimmed);
  }

  return tokens;
};

const splitAlpha = (input: string): [string, string | undefined] | null => {
  let depth = 0;
  let separatorIndex = -1;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '(') {
      depth += 1;
      continue;
    }

    if (character === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth === 0 && character === '/') {
      if (separatorIndex !== -1) {
        return null;
      }

      separatorIndex = index;
    }
  }

  if (separatorIndex === -1) {
    return [input.trim(), undefined];
  }

  return [input.slice(0, separatorIndex).trim(), input.slice(separatorIndex + 1).trim()];
};

const parseToken = (token: string): { unit: string; value: number } | null => {
  if (token.toLowerCase() === 'none') {
    return { value: 0, unit: '' };
  }

  const match = token.match(NUMBER_PATTERN);
  if (!match) {
    return null;
  }

  return {
    unit: match[2]?.toLowerCase() ?? '',
    value: Number(match[1]),
  };
};

const parseLightness = (token: string): number | null => {
  const parsed = parseToken(token);
  if (!parsed || !Number.isFinite(parsed.value)) {
    return null;
  }

  if (parsed.unit === '%') {
    return clamp(parsed.value / 100, 0, 1);
  }

  if (parsed.unit.length > 0) {
    return null;
  }

  return clamp(parsed.value > 1 ? parsed.value / 100 : parsed.value, 0, 1);
};

const parseChroma = (token: string): number | null => {
  const parsed = parseToken(token);
  if (!parsed || !Number.isFinite(parsed.value)) {
    return null;
  }

  if (parsed.unit === '%') {
    return Math.max(0, parsed.value / 100);
  }

  if (parsed.unit.length > 0) {
    return null;
  }

  return Math.max(0, parsed.value);
};

const parseHue = (token: string): number | null => {
  const parsed = parseToken(token);
  if (!parsed || !Number.isFinite(parsed.value)) {
    return null;
  }

  switch (parsed.unit) {
    case '':
    case 'deg':
      return wrapDegrees(parsed.value);
    case 'grad':
      return wrapDegrees(parsed.value * 0.9);
    case 'rad':
      return wrapDegrees(parsed.value * (180 / Math.PI));
    case 'turn':
      return wrapDegrees(parsed.value * 360);
    default:
      return null;
  }
};

const parseAlpha = (token: string): number | null => {
  const parsed = parseToken(token);
  if (!parsed || !Number.isFinite(parsed.value)) {
    return null;
  }

  if (parsed.unit === '%') {
    return clamp(parsed.value / 100, 0, 1);
  }

  if (parsed.unit.length > 0) {
    return null;
  }

  return clamp(parsed.value, 0, 1);
};

export const parseOklch = (input: string): ParsedOklch | null => {
  const functionMatch = input.match(FUNCTION_PATTERN);
  if (!functionMatch) {
    return null;
  }

  const body = functionMatch[1];
  if (body === undefined) {
    return null;
  }

  const split = splitAlpha(body);
  if (!split) {
    return null;
  }

  const [channelsSource, alphaSource] = split;
  const channels = splitTopLevel(channelsSource.replaceAll(',', ' '));
  if (channels.length !== 3) {
    return null;
  }

  const [lightnessToken, chromaToken, hueToken] = channels as [string, string, string];
  const lightness = parseLightness(lightnessToken);
  const chroma = parseChroma(chromaToken);
  const hueDegrees = parseHue(hueToken);
  const alpha = alphaSource ? parseAlpha(alphaSource) : 1;

  if (lightness === null || chroma === null || hueDegrees === null || alpha === null) {
    return null;
  }

  return {
    alpha,
    chroma,
    hueDegrees,
    lightness,
  };
};

const linearToSrgb = (channel: number): number => {
  const clamped = clamp(channel, 0, 1);
  if (clamped <= 0.0031308) {
    return 12.92 * clamped;
  }

  return (1.055 * (clamped ** (1 / 2.4))) - 0.055;
};

const isInLinearSrgbGamut = ({ blue, green, red }: LinearRgbColor): boolean => (
  red >= 0
  && red <= 1
  && green >= 0
  && green <= 1
  && blue >= 0
  && blue <= 1
);

const oklchToLinearSrgb = ({ alpha, chroma, hueDegrees, lightness }: ParsedOklch): LinearRgbColor => {
  const hueRadians = hueDegrees * (Math.PI / 180);
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lComponent = lightness + (0.3963377774 * a) + (0.2158037573 * b);
  const mComponent = lightness - (0.1055613458 * a) - (0.0638541728 * b);
  const sComponent = lightness - (0.0894841775 * a) - (1.291485548 * b);

  const l = lComponent ** 3;
  const m = mComponent ** 3;
  const s = sComponent ** 3;

  return {
    alpha,
    blue: (-0.0041960863 * l) - (0.7034186147 * m) + (1.707614701 * s),
    green: (-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s),
    red: (4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s),
  };
};

const gamutMappedLinearSrgb = (parsed: ParsedOklch): LinearRgbColor => {
  const initial = oklchToLinearSrgb(parsed);
  if (parsed.chroma === 0 || isInLinearSrgbGamut(initial)) {
    return initial;
  }

  let low = 0;
  let high = parsed.chroma;
  let best = oklchToLinearSrgb({
    ...parsed,
    chroma: 0,
  });

  for (let iteration = 0; iteration < 24; iteration += 1) {
    const candidateChroma = (low + high) / 2;
    const candidate = oklchToLinearSrgb({
      ...parsed,
      chroma: candidateChroma,
    });

    if (isInLinearSrgbGamut(candidate)) {
      best = candidate;
      low = candidateChroma;
    } else {
      high = candidateChroma;
    }
  }

  return best;
};

export const oklchToSrgb = (parsed: ParsedOklch): RgbColor => {
  const mapped = gamutMappedLinearSrgb(parsed);

  return {
    alpha: mapped.alpha,
    blue: linearToSrgb(mapped.blue),
    green: linearToSrgb(mapped.green),
    red: linearToSrgb(mapped.red),
  };
};

const toHexByte = (value: number): string => Math.round(clamp(value, 0, 1) * 255).toString(16).padStart(2, '0');

export const rgbToHex = ({ alpha, blue, green, red }: RgbColor): string => {
  const hex = `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`;
  return alpha < 1 ? `${hex}${toHexByte(alpha)}` : hex;
};

const srgbChannelToLinear = (value: number): number => {
  if (value <= 0.04045) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
};

const DARK_EDITOR_LUMINANCE = 0.045;
const LIGHT_EDITOR_LUMINANCE = 0.985;
const DARK_OUTLINE_RGB = '15, 23, 42';
const LIGHT_OUTLINE_RGB = '255, 255, 255';

const relativeLuminanceFor = ({ blue, green, red }: RgbColor): number => {
  const linearRed = srgbChannelToLinear(red);
  const linearGreen = srgbChannelToLinear(green);
  const linearBlue = srgbChannelToLinear(blue);
  return (0.2126 * linearRed) + (0.7152 * linearGreen) + (0.0722 * linearBlue);
};

const compositeLuminanceFor = (foregroundLuminance: number, alpha: number, backgroundLuminance: number): number => (
  (foregroundLuminance * alpha) + (backgroundLuminance * (1 - alpha))
);

const outlineStrengthFor = (alpha: number): number => {
  if (alpha <= 0.08) {
    return 0.92;
  }

  if (alpha <= 0.16) {
    return 0.82;
  }

  if (alpha <= 0.3) {
    return 0.72;
  }

  if (alpha <= 0.5) {
    return 0.58;
  }

  return 0.42;
};

const outlineColorForTheme = (rgb: RgbColor, editorBackgroundLuminance: number): string => {
  const swatchLuminance = relativeLuminanceFor(rgb);
  const compositedLuminance = compositeLuminanceFor(swatchLuminance, rgb.alpha, editorBackgroundLuminance);
  const prefersDarkOutline = compositedLuminance > 0.56;
  const outlineRgb = prefersDarkOutline ? DARK_OUTLINE_RGB : LIGHT_OUTLINE_RGB;

  const contrastGap = Math.abs(compositedLuminance - editorBackgroundLuminance);
  const outlineStrength = contrastGap < 0.12
    ? Math.min(0.94, outlineStrengthFor(rgb.alpha) + 0.18)
    : outlineStrengthFor(rgb.alpha);

  return `rgba(${outlineRgb}, ${formatNumber(outlineStrength, 2)})`;
};

export const formatNormalizedOklch = ({ alpha, chroma, hueDegrees, lightness }: ParsedOklch): string => {
  const lightnessPart = `${formatNumber(lightness * 100, 2)}%`;
  const chromaPart = formatNumber(chroma, 4);
  const huePart = formatNumber(hueDegrees, 2);
  const alphaPart = alpha < 1 ? ` / ${formatNumber(alpha * 100, 2)}%` : '';
  return `oklch(${lightnessPart} ${chromaPart} ${huePart}${alphaPart})`;
};

export const resolveSwatch = (input: string): ResolvedSwatch | null => {
  const parsed = parseOklch(input);
  if (!parsed) {
    return null;
  }

  const rgb = oklchToSrgb(parsed);
  return {
    darkBorderColor: outlineColorForTheme(rgb, DARK_EDITOR_LUMINANCE),
    hex: rgbToHex(rgb),
    lightBorderColor: outlineColorForTheme(rgb, LIGHT_EDITOR_LUMINANCE),
    normalized: formatNormalizedOklch(parsed),
    rgb,
  };
};
