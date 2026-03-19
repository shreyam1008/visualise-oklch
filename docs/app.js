const presets = {
  cherry: { alpha: 100, chroma: 0.258, hue: 29.23, lightness: 62.8, name: 'Signal Red' },
  lagoon: { alpha: 100, chroma: 0.165, hue: 218, lightness: 74, name: 'Lagoon Blue' },
  citrus: { alpha: 100, chroma: 0.22, hue: 122, lightness: 84, name: 'Citrus Pop' },
  orchid: { alpha: 100, chroma: 0.2, hue: 328, lightness: 68, name: 'Orchid Glow' },
  slate: { alpha: 88, chroma: 0.03, hue: 255, lightness: 52, name: 'Slate Glass' },
};

const cloudTokens = [
  'oklch(98% 0.003 247 / 96%)',
  'oklch(76% 0.204 154)',
  'oklch(62.8% 0.258 29.23)',
  'oklch(72% 0.17 255)',
  'oklch(84% 0.14 122)',
  'oklch(68% 0.19 330)',
  'oklch(91% 0.04 98)',
  'oklch(58% 0.12 248)',
  'oklch(74% 0.21 65)',
  'oklch(69% 0.18 190 / 72%)',
];

const format = (value, digits = 2) => Number(value.toFixed(digits)).toString();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const selectors = {
  alpha: document.querySelector('[data-alpha-value]'),
  chroma: document.querySelector('[data-chroma-value]'),
  css: document.querySelector('[data-output-css]'),
  hue: document.querySelector('[data-hue-value]'),
  hsl: document.querySelector('[data-output-hsl]'),
  hex: document.querySelector('[data-output-hex]'),
  hexHero: document.querySelector('[data-live-hex]'),
  lightness: document.querySelector('[data-lightness-value]'),
  liveCode: document.querySelector('[data-live-code]'),
  name: document.querySelector('[data-output-name]'),
  oklch: document.querySelector('[data-output-oklch]'),
  oklchFull: document.querySelector('[data-output-oklch-full]'),
  previewSurface: document.querySelector('[data-preview-surface]'),
  rgb: document.querySelector('[data-output-rgb]'),
  rgbHero: document.querySelector('[data-live-rgb]'),
  tip: document.querySelector('[data-live-tip]'),
  year: document.querySelector('[data-current-year]'),
};

const controls = Array.from(document.querySelectorAll('[data-channel]'));
const presetButtons = Array.from(document.querySelectorAll('[data-preset]'));
const oklchRamp = document.querySelector('[data-oklch-ramp]');
const hslRamp = document.querySelector('[data-hsl-ramp]');
const tokenCloud = document.querySelector('[data-token-cloud]');

const state = { ...presets.cherry };

const linearToSrgb = (channel) => {
  const clamped = clamp(channel, 0, 1);
  if (clamped <= 0.0031308) {
    return 12.92 * clamped;
  }

  return (1.055 * (clamped ** (1 / 2.4))) - 0.055;
};

const srgbToLinear = (channel) => {
  if (channel <= 0.04045) {
    return channel / 12.92;
  }

  return ((channel + 0.055) / 1.055) ** 2.4;
};

const inGamut = ({ red, green, blue }) => (
  red >= 0 && red <= 1 && green >= 0 && green <= 1 && blue >= 0 && blue <= 1
);

const oklchToLinear = ({ lightness, chroma, hue, alpha }) => {
  const hueRadians = hue * (Math.PI / 180);
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

const gamutMap = (oklch) => {
  const start = oklchToLinear(oklch);
  if (oklch.chroma === 0 || inGamut(start)) {
    return start;
  }

  let low = 0;
  let high = oklch.chroma;
  let best = oklchToLinear({ ...oklch, chroma: 0 });

  for (let index = 0; index < 24; index += 1) {
    const chroma = (low + high) / 2;
    const candidate = oklchToLinear({ ...oklch, chroma });
    if (inGamut(candidate)) {
      best = candidate;
      low = chroma;
    } else {
      high = chroma;
    }
  }

  return best;
};

const oklchToSrgb = (oklch) => {
  const linear = gamutMap(oklch);
  return {
    alpha: linear.alpha,
    blue: linearToSrgb(linear.blue),
    green: linearToSrgb(linear.green),
    red: linearToSrgb(linear.red),
  };
};

const toByte = (value) => Math.round(clamp(value, 0, 1) * 255);
const toHexByte = (value) => toByte(value).toString(16).padStart(2, '0');

const rgbToHex = ({ alpha, blue, green, red }) => {
  const hex = `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`;
  return alpha < 1 ? `${hex}${toHexByte(alpha)}` : hex;
};

const rgbToHsl = ({ red, green, blue, alpha }) => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = ((blue - red) / delta) + 2;
    } else {
      hue = ((red - green) / delta) + 4;
    }
  }

  hue *= 60;
  if (hue < 0) {
    hue += 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs((2 * lightness) - 1));

  return { alpha, hue, lightness, saturation };
};

const hslToRgb = ({ hue, lightness, saturation, alpha }) => {
  const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = lightness - (chroma / 2);
  return {
    alpha,
    blue: blue + match,
    green: green + match,
    red: red + match,
  };
};

const oklchString = ({ alpha, chroma, hue, lightness }) => {
  const alphaPart = alpha < 1 ? ` / ${format(alpha * 100, 0)}%` : '';
  return `oklch(${format(lightness * 100, 1)}% ${format(chroma, 3)} ${format(hue, 2)}${alphaPart})`;
};

const rgbString = ({ alpha, blue, green, red }) => {
  const base = `rgb(${toByte(red)} ${toByte(green)} ${toByte(blue)})`;
  return alpha < 1 ? `${base.replace('rgb', 'rgb').replace(')', ` / ${format(alpha * 100, 0)}%)`)}` : base;
};

const hslString = ({ alpha, hue, lightness, saturation }) => {
  const base = `hsl(${format(hue, 0)} ${format(saturation * 100, 1)}% ${format(lightness * 100, 1)}%)`;
  return alpha < 1 ? base.replace(')', ` / ${format(alpha * 100, 0)}%)`) : base;
};

const tipFor = ({ chroma, lightness }) => {
  if (chroma < 0.035) {
    return 'Low chroma behaves like an intentional neutral, which is why OKLCH is excellent for glass, surfaces, and grayscale token systems.';
  }

  if (lightness > 0.82) {
    return 'High OKLCH lightness keeps bright colors readable while making the brightness move feel more perceptually even than HSL.';
  }

  if (lightness < 0.38) {
    return 'Dark OKLCH colors tend to hold character better than HSL darks, which often collapse into muddy or oversaturated results.';
  }

  return 'This is the OKLCH sweet spot: tweak lightness for perceived brightness, then tune chroma for intensity without rewriting the entire color.';
};

const renderSwatch = (target, color, label) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'ladder-swatch';
  const swatch = document.createElement('span');
  swatch.style.setProperty('--swatch', color);
  const code = document.createElement('code');
  code.textContent = label;
  wrapper.append(swatch, code);
  target.append(wrapper);
};

const renderRamps = (hslBase) => {
  if (!oklchRamp || !hslRamp) {
    return;
  }

  oklchRamp.textContent = '';
  hslRamp.textContent = '';

  [0.94, 0.82, 0.7, 0.58, 0.46, 0.34].forEach((lightness) => {
    renderSwatch(
      oklchRamp,
      oklchString({ ...state, alpha: 1, lightness }),
      `${format(lightness * 100, 0)}%`
    );
  });

  [0.94, 0.82, 0.7, 0.58, 0.46, 0.34].forEach((lightness) => {
    const rgb = hslToRgb({ ...hslBase, alpha: 1, lightness });
    renderSwatch(
      hslRamp,
      rgbToHex(rgb),
      `${format(lightness * 100, 0)}%`
    );
  });
};

const updatePresetButtons = (activeKey) => {
  presetButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.preset === activeKey);
  });
};

const updateControls = () => {
  controls.forEach((input) => {
    const channel = input.dataset.channel;
    if (channel === 'lightness') {
      input.value = String(state.lightness);
    } else if (channel === 'chroma') {
      input.value = String(state.chroma);
    } else if (channel === 'hue') {
      input.value = String(state.hue);
    } else if (channel === 'alpha') {
      input.value = String(state.alpha);
    }
  });
};

const applyState = () => {
  const normalized = {
    alpha: state.alpha / 100,
    chroma: state.chroma,
    hue: state.hue,
    lightness: state.lightness / 100,
  };

  const oklch = oklchString(normalized);
  const rgb = oklchToSrgb(normalized);
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const hslEquivalent = hslString(hsl);
  const rgbEquivalent = rgbString(rgb);

  document.documentElement.style.setProperty('--live-color', oklch);
  document.documentElement.style.setProperty('--live-color-soft', oklchString({ ...normalized, alpha: 0.24 }));

  selectors.name.textContent = state.name;
  selectors.oklch.textContent = oklch;
  selectors.oklchFull.textContent = oklch;
  selectors.hex.textContent = hex;
  selectors.hexHero.textContent = hex;
  selectors.rgb.textContent = rgbEquivalent;
  selectors.rgbHero.textContent = rgbEquivalent;
  selectors.hsl.textContent = hslEquivalent;
  selectors.liveCode.textContent = `background: ${oklch};`;
  selectors.css.textContent = `:root {\n  --brand: ${oklch};\n  --brand-hex: ${hex};\n}`;
  selectors.previewSurface.style.background =
    `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.18), transparent 18%), linear-gradient(135deg, rgba(255,255,255,0.12), transparent 70%), ${oklch}`;
  selectors.lightness.textContent = `${format(state.lightness, 1)}%`;
  selectors.chroma.textContent = format(state.chroma, 3);
  selectors.hue.textContent = `${format(state.hue, 2)}deg`;
  selectors.alpha.textContent = `${format(state.alpha, 0)}%`;
  selectors.tip.textContent = tipFor(normalized);

  renderRamps(hsl);
};

const buildCloud = () => {
  if (!tokenCloud) {
    return;
  }

  cloudTokens.forEach((token, index) => {
    const span = document.createElement('span');
    span.textContent = token;
    span.style.left = `${6 + ((index * 11.5) % 86)}%`;
    span.style.top = `${7 + ((index * 8.5) % 78)}%`;
    span.style.transform = `rotate(${(-18 + (index * 7)) % 24}deg)`;
    tokenCloud.append(span);
  });
};

controls.forEach((input) => {
  input.addEventListener('input', () => {
    const channel = input.dataset.channel;
    const numeric = Number(input.value);

    if (channel === 'lightness') {
      state.lightness = numeric;
    } else if (channel === 'chroma') {
      state.chroma = numeric;
    } else if (channel === 'hue') {
      state.hue = numeric;
    } else if (channel === 'alpha') {
      state.alpha = numeric;
    }

    updatePresetButtons('');
    applyState();
  });
});

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const key = button.dataset.preset;
    if (!key || !presets[key]) {
      return;
    }

    Object.assign(state, presets[key]);
    updateControls();
    updatePresetButtons(key);
    applyState();
  });
});

if (selectors.year) {
  selectors.year.textContent = String(new Date().getFullYear());
}

buildCloud();
updateControls();
updatePresetButtons('cherry');
applyState();
