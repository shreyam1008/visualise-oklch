import * as colorTools from './color-tools.js?v=20260908-lch';
const header = document.querySelector('.topbar');
const moreNavigation = document.querySelector('.nav-more');
new ResizeObserver(([entry]) => {
  document.documentElement.style.setProperty('--header-height', `${entry.target.getBoundingClientRect().height}px`);
}).observe(header);
moreNavigation.addEventListener('click', event => {
  if (event.target.closest('a')) moreNavigation.open = false;
});
document.addEventListener('click', event => {
  if (!moreNavigation.contains(event.target)) moreNavigation.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && moreNavigation.open) {
    moreNavigation.open = false;
    moreNavigation.querySelector('summary').focus();
  }
});
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
  hslRow: document.querySelector('[data-output-hsl-row]'),
  hex: document.querySelector('[data-output-hex]'),
  hexRow: document.querySelector('[data-output-hex-row]'),
  hexHero: document.querySelector('[data-live-hex]'),
  lightness: document.querySelector('[data-lightness-value]'),
  liveCode: document.querySelector('[data-live-code]'),
  name: document.querySelector('[data-output-name]'),
  oklch: document.querySelector('[data-output-oklch]'),
  oklchFull: document.querySelector('[data-output-oklch-full]'),
  oklchRow: document.querySelector('[data-output-oklch-row]'),
  previewSurface: document.querySelector('[data-preview-surface]'),
  rgb: document.querySelector('[data-output-rgb]'),
  rgbRow: document.querySelector('[data-output-rgb-row]'),
  rgbHero: document.querySelector('[data-live-rgb]'),
  tip: document.querySelector('[data-live-tip]'),
  year: document.querySelector('[data-current-year]'),
};

const controls = Array.from(document.querySelectorAll('[data-channel]'));
const presetButtons = Array.from(document.querySelectorAll('[data-preset]'));
const oklchRamp = document.querySelector('[data-oklch-ramp]');
const hslRamp = document.querySelector('[data-hsl-ramp]');
const tokenCloud = document.querySelector('[data-token-cloud]');
const rampStops = [0.94, 0.82, 0.7, 0.58, 0.46, 0.34];
const rampNodes = { hsl: [], oklch: [] };

const state = { ...presets.cherry };
let renderFrame = 0;
const livingGlow = document.querySelector('[data-living-glow]');
const ambientToggle = document.querySelector('[data-ambient-toggle]');
let ambientTimer = 0;
function paintAmbient() {
  ambientTimer = 0;
  if (!ambientToggle.checked || document.hidden) return;
  const rgb = colorTools.oklchToSrgb({ lightness: state.lightness / 100, chroma: state.chroma, hueDegrees: state.hue, alpha: 1 });
  livingGlow.style.backgroundColor = `rgb(${Math.round(rgb.red * 255)} ${Math.round(rgb.green * 255)} ${Math.round(rgb.blue * 255)})`;
  livingGlow.style.opacity = String(.045 + state.lightness / 100 * .075);
}
function scheduleAmbient() {
  if (!ambientTimer && ambientToggle.checked && !document.hidden) ambientTimer = window.setTimeout(paintAmbient, 120);
}
ambientToggle.addEventListener('change', () => {
  livingGlow.hidden = !ambientToggle.checked;
  if (ambientToggle.checked) paintAmbient();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleAmbient(); });

const oklchToSrgb = (color) => colorTools.oklchToSrgb({ ...color, hueDegrees: color.hue });

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
    return 'Try reducing chroma for a pale surface. High lightness does not guarantee readable text: check contrast against the actual background.';
  }

  if (lightness < 0.38) {
    return 'Try a low-chroma dark tone for text or a dark surface. Very dark colors have less room for chroma within sRGB.';
  }

  return 'This is the OKLCH sweet spot: tweak lightness for perceived brightness, then tune chroma for intensity without rewriting the entire color.';
};

const createRampNode = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'ladder-swatch';
  const swatch = document.createElement('span');
  const code = document.createElement('code');
  wrapper.append(swatch, code);
  return { code, swatch, wrapper };
};

const updateRampNode = (node, color, label) => {
  node.swatch.style.setProperty('--swatch', color);
  node.code.textContent = label;
};

const ensureRampNodes = () => {
  if (!oklchRamp || !hslRamp || rampNodes.oklch.length > 0 || rampNodes.hsl.length > 0) {
    return;
  }

  const oklchFragment = document.createDocumentFragment();
  const hslFragment = document.createDocumentFragment();

  rampStops.forEach(() => {
    const oklchNode = createRampNode();
    const hslNode = createRampNode();
    rampNodes.oklch.push(oklchNode);
    rampNodes.hsl.push(hslNode);
    oklchFragment.append(oklchNode.wrapper);
    hslFragment.append(hslNode.wrapper);
  });

  oklchRamp.append(oklchFragment);
  hslRamp.append(hslFragment);
};

const renderRamps = (hslBase) => {
  if (!oklchRamp || !hslRamp) {
    return;
  }

  ensureRampNodes();

  rampStops.forEach((lightness, index) => {
    updateRampNode(
      rampNodes.oklch[index],
      oklchString({ ...state, alpha: 1, lightness }),
      `${format(lightness * 100, 0)}%`
    );
  });

  rampStops.forEach((lightness, index) => {
    const rgb = hslToRgb({ ...hslBase, alpha: 1, lightness });
    updateRampNode(
      rampNodes.hsl[index],
      rgbToHex(rgb),
      `${format(lightness * 100, 0)}%`
    );
  });
};

const updatePresetButtons = (activeKey) => {
  presetButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.preset === activeKey);
    button.setAttribute('aria-pressed', String(button.dataset.preset === activeKey));
  });
};

const updateControls = () => {
  controls.forEach((input) => {
    const channel = input.dataset.channel;
    if (channel === 'lightness') {
      input.value = String(state.lightness);
    } else if (channel === 'chroma') {
      input.max = String(Math.max(0.4, state.chroma));
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
  const canonical = { ...normalized, hueDegrees: normalized.hue };
  const rgb = colorTools.oklchToSrgb(canonical);
  scheduleAmbient();
  document.querySelector('[data-shared-swatch]').style.background = oklch;
  document.querySelector('[data-shared-color]').textContent = oklch;
  updateControls();
  renderWheel(canonical);
  renderConverter(canonical);
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const hslEquivalent = hslString(hsl);
  const rgbEquivalent = rgbString(rgb);

  document.querySelector('#playground').style.setProperty('--live-color', oklch);
  document.querySelector('#playground').style.setProperty('--live-color-soft', oklchString({ ...normalized, alpha: 0.24 }));

  selectors.name.textContent = state.name;
  selectors.oklch.textContent = oklch;
  selectors.oklchFull.textContent = oklch;
  selectors.oklchRow.textContent = oklch;
  selectors.hex.textContent = hex;
  selectors.hexHero.textContent = hex;
  selectors.hexRow.textContent = `hex ${hex}`;
  selectors.rgb.textContent = rgbEquivalent;
  selectors.rgbHero.textContent = rgbEquivalent;
  selectors.rgbRow.textContent = rgbEquivalent;
  selectors.hsl.textContent = hslEquivalent;
  selectors.hslRow.textContent = hslEquivalent;
  selectors.liveCode.textContent = `background: ${oklch};`;
  selectors.css.textContent = `:root {\n  --brand: ${oklch};\n  --brand-hex: ${hex};\n}`;
  selectors.previewSurface.style.background =
    `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.18), transparent 18%), linear-gradient(135deg, rgba(255,255,255,0.12), transparent 70%), ${oklch}`;
  selectors.lightness.textContent = `${format(state.lightness, 1)}%`;
  selectors.chroma.textContent = format(state.chroma, 3);
  selectors.hue.textContent = `${format(state.hue, 2)}deg`;
  selectors.alpha.textContent = `${format(state.alpha, 0)}%`;
  selectors.tip.textContent = tipFor(normalized);

  document.querySelectorAll('[data-formula]').forEach((element) => {
    element.textContent = selectors[element.dataset.formula].textContent;
  });
  document.querySelector('[data-gamut-note]').textContent = colorTools.isOklchInSrgbGamut(canonical)
    ? 'Within sRGB. HEX, RGB and HSL are rounded representations of this color.'
    : 'Outside sRGB. HEX, RGB and HSL reduce chroma to fit sRGB while keeping lightness and hue. Your browser’s OKLCH preview may differ.';
  document.querySelectorAll('.color-anatomy[open] [data-lesson-ramp]').forEach((ramp) => {
    const channel = ramp.dataset.lessonRamp;
    const maximum = { lightness: 1, chroma: 0.3, hue: 360 }[channel];
    const stops = Array.from({ length: 25 }, (_, index) =>
      rgbString(oklchToSrgb({ ...normalized, alpha: 1, [channel]: maximum * index / 24 })));
    ramp.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
  });

  renderRamps(hsl);
};

const scheduleApplyState = () => {
  if (renderFrame !== 0) {
    return;
  }

  renderFrame = window.requestAnimationFrame(() => {
    renderFrame = 0;
    applyState();
  });
};

const buildCloud = () => {
  if (!tokenCloud || tokenCloud.childElementCount > 0) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    tokenCloud.hidden = true;
    return;
  }

  const tokenLimit = window.matchMedia('(max-width: 900px)').matches ? 5 : cloudTokens.length;
  const fragment = document.createDocumentFragment();

  cloudTokens.slice(0, tokenLimit).forEach((token, index) => {
    const span = document.createElement('span');
    span.textContent = token;
    span.style.left = `${6 + ((index * 11.5) % 86)}%`;
    span.style.top = `${7 + ((index * 8.5) % 78)}%`;
    span.style.setProperty('--rotate', `${(-18 + (index * 7)) % 24}deg`);
    span.style.setProperty('--dur', `${11 + ((index * 1.3) % 7)}s`);
    span.style.setProperty('--delay', `${(index % 5) * -1.4}s`);
    fragment.append(span);
  });

  tokenCloud.append(fragment);
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
    state.name = 'Your custom color';
    scheduleApplyState();
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

const formatInputs = [...document.querySelectorAll('[data-format-input]')];
const converterStatus = document.querySelector('[data-converter-status]');
let currentFormats = {};
let sampleKey = '';
let samples = [];
const signed = (value) => `${value >= 0 ? '+' : ''}${Math.round(value)}`;
const channelNames = ['red', 'green', 'blue'];
const gamutMap = document.querySelector('[data-gamut-map]');
const gamutCanvas = document.querySelector('[data-gamut-canvas]');
const gamutContext = gamutCanvas.getContext('2d');
let gamutCacheKey = '';
let gamutScale = 0.4;
let pendingRaster = null, rasterBusy = false, rasterWorker;
try {
  rasterWorker = new Worker(new URL('./gamut-worker.js', import.meta.url), { type: 'module' });
  rasterWorker.onmessage = ({ data }) => {
    rasterBusy = false;
    if (data.key === gamutCacheKey) {
      gamutContext.putImageData(new ImageData(data.pixels, data.width, data.height), 0, 0);
      document.querySelector('[data-map-boundary]').setAttribute('d', data.boundary);
      gamutCanvas.hidden = false;
      gamutMap.setAttribute('aria-busy', 'false');
    }
    sendRaster();
  };
  rasterWorker.onerror = () => {
    rasterWorker.terminate(); rasterWorker = null; rasterBusy = false;
    gamutCanvas.hidden = true;
    gamutMap.setAttribute('aria-busy', 'false');
    document.querySelector('[data-map-boundary]').setAttribute('d', '');
    document.querySelector('[data-raster-note]').textContent = 'Map shading unavailable. Coordinates, wheel and conversions still work.';
  };
} catch {
  document.querySelector('[data-raster-note]').textContent = 'Map shading unavailable. Coordinates, wheel and conversions still work.';
}
function sendRaster() {
  // At most one running job and one latest request; no stale drag backlog.
  if (!rasterWorker || rasterBusy || !pendingRaster) return;
  rasterBusy = true; rasterWorker.postMessage(pendingRaster); pendingRaster = null;
}
function renderGamutMap(color) {
  gamutScale = Math.max(0.4, Math.ceil(Math.min(color.chroma, 1) * 10) / 10);
  const key = `${color.hueDegrees}/${gamutScale}`;
  if (key !== gamutCacheKey && gamutContext) {
    gamutCacheKey = key;
    gamutMap.setAttribute('aria-busy', String(Boolean(rasterWorker)));
    pendingRaster = { key, hue: color.hueDegrees, scale: gamutScale, width: gamutCanvas.width, height: gamutCanvas.height };
    sendRaster();
  }
  const boundaryC = colorTools.maxSrgbChroma(color.lightness, color.hueDegrees);
  const x = Math.min(1, color.chroma / gamutScale) * 256, y = (1 - color.lightness) * 176;
  const fallbackX = Math.min(color.chroma, boundaryC) / gamutScale * 256;
  for (const [selector, position] of [['[data-map-marker]', x], ['[data-map-fallback]', fallbackX]]) {
    const node = document.querySelector(selector); node.setAttribute('cx', position); node.setAttribute('cy', y);
  }
  const guide = document.querySelector('[data-map-guide]');
  guide.setAttribute('x1', x); guide.setAttribute('x2', fallbackX); guide.setAttribute('y1', y); guide.setAttribute('y2', y);
  document.querySelector('[data-map-hue]').textContent = `Hue ${format(color.hueDegrees)}°`;
  document.querySelector('[data-map-scale]').textContent = `Vivid · C ${format(gamutScale)} →`;
  const inside = colorTools.isOklchInSrgbGamut(color);
  document.querySelector('[data-map-status]').textContent = `L ${format(color.lightness * 100, 1)}% · C ${format(color.chroma, 4)} · ${inside ? 'Inside sRGB' : `Outside sRGB — fallback C ${format(boundaryC, 4)}`}${color.chroma > gamutScale ? ' · Marker pinned: chroma exceeds map scale' : ''}`;
  document.querySelector('[data-fit-gamut]').disabled = inside;
}
function customColorChanged() {
  state.name = 'Your custom color'; updatePresetButtons(''); scheduleApplyState();
}
let mapRect;
function mapPointer(event) {
  const rect = mapRect;
  state.chroma = clamp((event.clientX - rect.left) / rect.width, 0, 1) * gamutScale;
  state.lightness = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1) * 100;
  customColorChanged();
}
gamutMap.addEventListener('pointerdown', (event) => { if (event.button !== 0) return; mapRect = gamutMap.getBoundingClientRect(); gamutMap.focus({ preventScroll: true }); gamutMap.setPointerCapture(event.pointerId); mapPointer(event); });
gamutMap.addEventListener('pointermove', (event) => { if (gamutMap.hasPointerCapture(event.pointerId)) mapPointer(event); });
gamutMap.addEventListener('pointerup', (event) => { if (gamutMap.hasPointerCapture(event.pointerId)) gamutMap.releasePointerCapture(event.pointerId); });
gamutMap.addEventListener('keydown', (event) => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault(); const step = event.shiftKey ? 10 : 1;
  if (event.key === 'ArrowUp') state.lightness = Math.min(100, state.lightness + step);
  if (event.key === 'ArrowDown') state.lightness = Math.max(0, state.lightness - step);
  if (event.key === 'ArrowRight') state.chroma = Math.min(gamutScale, state.chroma + step * 0.001);
  if (event.key === 'ArrowLeft') state.chroma = Math.max(0, state.chroma - step * 0.001);
  customColorChanged();
});
document.querySelector('[data-fit-gamut]').addEventListener('click', () => {
  state.chroma = Math.min(state.chroma, colorTools.maxSrgbChroma(state.lightness / 100, state.hue)); customColorChanged();
});
const rgbChart = document.querySelector('.rgb-chart');
let chartRect;
function chartPointer(event) {
  const rect = chartRect;
  state.lightness = clamp(((event.clientX - rect.left) / rect.width * 600 - 50) / 500, 0, 1) * 100;
  customColorChanged();
}
rgbChart.addEventListener('pointerdown', (event) => { if (event.button !== 0) return; chartRect = rgbChart.getBoundingClientRect(); rgbChart.setPointerCapture(event.pointerId); chartPointer(event); });
rgbChart.addEventListener('pointermove', (event) => { if (rgbChart.hasPointerCapture(event.pointerId)) chartPointer(event); });
rgbChart.addEventListener('pointerup', (event) => { if (rgbChart.hasPointerCapture(event.pointerId)) rgbChart.releasePointerCapture(event.pointerId); });
const hueWheel = document.querySelector('[data-hue-wheel]');
const wheelMarker = document.querySelector('[data-wheel-marker]');
const wheelSwatch = document.querySelector('[data-wheel-swatch]');
const wheelValue = document.querySelector('[data-wheel-value]');
const wheelStops = Array.from({ length: 73 }, (_, i) => {
  const hue = i * 5;
  return `${rgbToHex(colorTools.oklchToSrgb({ lightness: .72, chroma: .14, hueDegrees: hue, alpha: 1 }))} ${hue}deg`;
});
hueWheel.style.background = `conic-gradient(${wheelStops.join(',')})`;
function renderWheel(color) {
  const angle = color.hueDegrees * Math.PI / 180;
  wheelMarker.style.left = `${50 + 42 * Math.sin(angle)}%`;
  wheelMarker.style.top = `${50 - 42 * Math.cos(angle)}%`;
  wheelSwatch.style.background = oklchString({ ...color, hue: color.hueDegrees });
  wheelValue.textContent = `${format(color.hueDegrees, 1)}°`;
  hueWheel.setAttribute('aria-valuenow', format(color.hueDegrees, 2));
  hueWheel.setAttribute('aria-valuetext', `${format(color.hueDegrees, 1)} degrees OKLCH hue`);
  const rgb = colorTools.oklchToSrgb(color);
  for (const channel of channelNames) {
    document.querySelector(`[data-mini-value="${channel}"]`).textContent = Math.round(rgb[channel] * 255);
    document.querySelector(`[data-mini-bar="${channel}"]`).style.transform = `scaleX(${rgb[channel]})`;
  }
}
let wheelRect;
function wheelPointer(event) {
  const x = event.clientX - wheelRect.left - wheelRect.width / 2;
  const y = event.clientY - wheelRect.top - wheelRect.height / 2;
  if (Math.hypot(x, y) < wheelRect.width * .25) return;
  state.hue = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
  customColorChanged();
}
hueWheel.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  wheelRect = hueWheel.getBoundingClientRect();
  hueWheel.focus({ preventScroll: true }); hueWheel.setPointerCapture(event.pointerId); wheelPointer(event);
});
hueWheel.addEventListener('pointermove', (event) => { if (hueWheel.hasPointerCapture(event.pointerId)) wheelPointer(event); });
hueWheel.addEventListener('pointerup', (event) => { if (hueWheel.hasPointerCapture(event.pointerId)) hueWheel.releasePointerCapture(event.pointerId); });
hueWheel.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const step = event.shiftKey ? 10 : 1;
  state.hue = event.key === 'Home' ? 0 : event.key === 'End' ? 359 : (state.hue + (['ArrowRight', 'ArrowUp'].includes(event.key) ? step : -step) + 360) % 360;
  customColorChanged();
});
let labVisible = false;
new IntersectionObserver(([entry]) => { labVisible = entry.isIntersecting; if (labVisible) scheduleApplyState(); }, { rootMargin: '150px' }).observe(document.querySelector('#lightness-lab'));
function renderConverter(color) {
  renderGamutMap(color);
  currentFormats = colorTools.colorFormats(color);
  const fallbackC = colorTools.isOklchInSrgbGamut(color) ? color.chroma : Math.min(color.chroma, colorTools.maxSrgbChroma(color.lightness, color.hueDegrees));
  document.querySelector('[data-original-preview]').style.backgroundColor = currentFormats.oklch;
  document.querySelector('[data-fallback-preview]').style.backgroundColor = currentFormats.rgb;
  document.querySelector('[data-fallback-change]').textContent = `C ${format(color.chroma, 4)} → ${format(fallbackC, 4)} · L and H unchanged · ${currentFormats.hex}`;
  document.querySelector('[data-fallback-css]').textContent = `.brand {\n  color: ${currentFormats.rgb};\n  color: ${currentFormats.oklch};\n}`;
  document.querySelector('[data-lch-output]').value = colorTools.srgbFallbackLch(color);
  formatInputs.forEach((input) => {
    if (input !== document.activeElement) {
      input.value = currentFormats[input.dataset.formatInput];
      input.removeAttribute('aria-invalid');
    }
  });
  if (!formatInputs.some((input) => input.getAttribute('aria-invalid') === 'true')) {
    converterStatus.textContent = 'All six formats are linked. Numeric CSS colors only; conversions stay in your browser. Rounded sRGB formats may lose wide-gamut color and precision.';
  }
  if (!labVisible) return;
  document.querySelector('[data-lab-value]').textContent = `${format(state.lightness, 1)}%`;
  document.querySelector('[data-fixed-channels]').textContent = `Fixed C ${format(state.chroma, 4)} · H ${format(state.hue, 2)}° · opaque samples`;
  const key = `${color.chroma}/${color.hueDegrees}`;
  if (key !== sampleKey) {
    sampleKey = key;
    samples = colorTools.lightnessSamples(color);
    for (const channel of channelNames) {
      document.querySelector(`[data-rgb-curve="${channel}"]`).setAttribute('d', samples.map((s, i) => `${i ? 'L' : 'M'}${50 + s.lightness * 5},${205 - s[channel] / 255 * 180}`).join(' '));
    }
    document.querySelector('[data-experiment-ramp]').style.background = `linear-gradient(to right, ${samples.map((s) => s.hex).join(',')})`;
    const rows = samples.filter((s) => s.lightness % 10 === 0).map((s, i, stops) => {
      const row = document.createElement('tr');
      const delta = i ? channelNames.map((c) => signed(s[c] - stops[i - 1][c])).join(' / ') : '—';
      [`${s.lightness}%`, s.hex, channelNames.map((c) => Math.round(s[c])).join(' / '), delta, s.inGamut ? 'In gamut' : 'Chroma reduced'].forEach((text) => {
        const cell = document.createElement('td'); cell.textContent = text; row.append(cell);
      });
      return row;
    });
    document.querySelector('[data-lightness-table]').replaceChildren(...rows);
  }
  const rgb = colorTools.oklchToSrgb({ ...color, alpha: 1 });
  const previous = colorTools.oklchToSrgb({ ...color, lightness: Math.max(0, color.lightness - 0.1), alpha: 1 });
  const x = 50 + color.lightness * 500;
  const cursor = document.querySelector('[data-chart-cursor]');
  cursor.setAttribute('x1', x); cursor.setAttribute('x2', x);
  const beforeX = 50 + Math.max(0, color.lightness - 0.1) * 500;
  const beforeLine = document.querySelector('[data-chart-before]'); beforeLine.setAttribute('x1', beforeX); beforeLine.setAttribute('x2', beforeX);
  const band = document.querySelector('[data-chart-band]'); band.setAttribute('x', beforeX); band.setAttribute('width', x - beforeX);
  for (const [which, value, lightness] of [['before', previous, Math.max(0, state.lightness - 10)], ['after', rgb, state.lightness]]) {
    document.querySelector(`[data-compare-${which}]`).style.background = rgbToHex(value);
    document.querySelector(`[data-compare-${which}-label]`).textContent = `L ${format(lightness, 1)}%`;
    document.querySelector(`[data-compare-${which}-hex]`).textContent = rgbToHex(value);
  }
  document.querySelector('[data-chart-takeaway]').textContent = `One lightness change. Watch each RGB channel respond: R ${signed((rgb.red - previous.red) * 255)}, G ${signed((rgb.green - previous.green) * 255)}, B ${signed((rgb.blue - previous.blue) * 255)}.`;
  document.querySelector('[data-channel-readouts]').replaceChildren(...channelNames.map((channel) => {
    const point = document.querySelector(`[data-channel-point="${channel}"]`);
    point.setAttribute('cx', x); point.setAttribute('cy', 205 - rgb[channel] * 180);
    const card = document.createElement('div'); card.className = `channel-readout ${channel}`;
    const label = document.createElement('span'); label.textContent = channel.toUpperCase();
    const values = document.createElement('strong'); values.textContent = `${Math.round(previous[channel] * 255)} → ${Math.round(rgb[channel] * 255)}`;
    const delta = document.createElement('span'); delta.textContent = `Δ ${signed((rgb[channel] - previous[channel]) * 255)} / 255`;
    card.append(label, values, delta);
    return card;
  }));
  document.querySelector('[data-step-note]').textContent = `Channel changes from L ${format(Math.max(0, state.lightness - 10), 1)}% to ${format(state.lightness, 1)}%, with identical C and H. Curves use chroma-reduced sRGB where needed; they are not raw OKLCH channels.`;
}
formatInputs.forEach((input) => {
  input.addEventListener('input', () => {
    const parsed = colorTools.parseColorInput(input.value);
    input.setAttribute('aria-invalid', String(!parsed));
    if (!parsed) { converterStatus.textContent = 'Enter a complete numeric HEX, RGB, HSL, HWB, Oklab or OKLCH color. Your last valid color is kept.'; return; }
    Object.assign(state, { lightness: parsed.lightness * 100, chroma: parsed.chroma, hue: parsed.hueDegrees, alpha: parsed.alpha * 100, name: 'Your custom color' });
    converterStatus.textContent = 'All formats updated. OKLCH and Oklab preserve wide-gamut color; HEX, RGB, HSL and HWB use sRGB.';
    updateControls(); updatePresetButtons(''); scheduleApplyState();
  });
  input.addEventListener('blur', () => { if (input.getAttribute('aria-invalid') !== 'true') input.value = currentFormats[input.dataset.formatInput]; });
});
document.querySelectorAll('[data-copy-format]').forEach((button) => button.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(currentFormats[button.dataset.copyFormat]); converterStatus.textContent = `${button.dataset.copyFormat.toUpperCase()} copied.`; }
  catch { converterStatus.textContent = 'Clipboard unavailable. Select the value and copy it manually.'; }
}));
document.querySelector('.color-anatomy').addEventListener('toggle', scheduleApplyState);
// Keep decorative backgrounds still while the color tool is in use.

updateControls();
updatePresetButtons('cherry');
applyState();
