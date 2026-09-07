/// <reference lib="dom" />
/* eslint-disable unicorn/require-post-message-target-origin -- This is the VS Code webview bridge. */
import { isOklchInSrgbGamut, maxSrgbChroma, oklchToClippedSrgb, oklchToSrgb, parseOklch, rgbToHex, type ParsedOklch } from './color';
import { buildOklchEdit, isPickerColor } from './picker';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): { id: string; color: ParsedOklch } | undefined;
  setState(state: { id: string; color: ParsedOklch }): void;
};
const api = acquireVsCodeApi();
const element = <T extends HTMLElement>(id: string): T => document.querySelector(`#${id}`) as T;
const keys = ['lightness', 'chroma', 'hueDegrees', 'alpha'] as const;
const ranges = keys.map((key) => element<HTMLInputElement>(key));
const numbers = keys.map((key) => element<HTMLInputElement>(`${key}-number`));
const canvas = element<HTMLCanvasElement>('canvas');
const context = canvas.getContext('2d', { alpha: false })!;
const plane = element('plane');
const apply = element<HTMLButtonElement>('apply');
let color: ParsedOklch | undefined;
let source = '';
let id = '';
let frame = 0;
let busy = false;
let chromaScale = 0.4;
let planeKey = '';
let tracksKey = '';
let dragPointer: number | undefined;

const displayValue = (key: keyof ParsedOklch, value: number): number => key === 'lightness' || key === 'alpha' ? value * 100 : value;
const normalizedValue = (key: keyof ParsedOklch, value: number): number => key === 'lightness' || key === 'alpha' ? value / 100 : value;
const valid = (): boolean => numbers.every((input) => input.value !== '' && input.validity.valid && Number.isFinite(input.valueAsNumber));
const status = (text: string): void => { element('status').textContent = text; };
const setControls = (): void => {
  if (!color) { return; }
  chromaScale = Math.max(0.4, color.chroma);
  element<HTMLInputElement>('chroma').max = String(chromaScale);
  keys.forEach((key, index) => {
    const value = String(Number(displayValue(key, color![key]).toFixed(6)));
    ranges[index]!.value = value;
    numbers[index]!.value = value;
    // Arbitrary authored precision is valid; step affects arrow-key increments.
    numbers[index]!.step = 'any';
  });
};
const gradient = (key: keyof ParsedOklch, max: number): string => {
  const stops: string[] = [];
  for (let index = 0; index <= 32; index += 1) {
    stops.push(rgbToHex(oklchToSrgb({ ...color!, alpha: 1, [key]: index / 32 * max })));
  }
  return `linear-gradient(to right,${stops.join(',')})`;
};
const drawPlane = (): void => {
  const nextKey = `${color!.hueDegrees}:${chromaScale}`;
  if (planeKey === nextKey) { return; }
  planeKey = nextKey;
  const pixels = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const sample = { lightness: 1 - y / (canvas.height - 1), chroma: x / (canvas.width - 1) * chromaScale, hueDegrees: color!.hueDegrees, alpha: 1 };
      const rgb = oklchToClippedSrgb(sample);
      const striped = !isOklchInSrgbGamut(sample);
      const stripe = (x + y) % 8 < 3;
      const offset = (y * canvas.width + x) * 4;
      const channels = [rgb.red, rgb.green, rgb.blue];
      for (let channel = 0; channel < 3; channel += 1) {
        const value = channels[channel]! * 255;
        pixels.data[offset + channel] = striped ? value * 0.4 + (stripe ? 30 : 90) : value;
      }
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
};
const render = (): void => {
  frame = 0;
  if (!color) { return; }
  drawPlane();
  const nextTracksKey = `${color.lightness}:${color.chroma}:${color.hueDegrees}:${chromaScale}`;
  if (tracksKey !== nextTracksKey) {
    tracksKey = nextTracksKey;
    element('lightness-track').style.background = gradient('lightness', 1);
    element('chroma-track').style.background = gradient('chroma', chromaScale);
    element('hueDegrees-track').style.background = gradient('hueDegrees', 360);
    const opaque = rgbToHex(oklchToSrgb({ ...color, alpha: 1 }));
    element('alpha-track').style.background = `linear-gradient(to right,transparent,${opaque}),repeating-conic-gradient(#888 0% 25%,#bbb 0% 50%) 0/12px 12px`;
  }
  element('preview').style.background = rgbToHex(oklchToSrgb(color));
  element('output').textContent = buildOklchEdit(source, color);
  const marker = element('marker');
  marker.style.left = `${color.chroma / chromaScale * 100}%`;
  marker.style.top = `${(1 - color.lightness) * 100}%`;
  const boundary = maxSrgbChroma(color.lightness, color.hueDegrees);
  const percent = `${Math.min(100, boundary / chromaScale * 100)}%`;
  element('boundary').style.left = percent;
  element('outside').style.left = percent;
  const inGamut = isOklchInSrgbGamut(color);
  const gamut = element('gamut');
  gamut.dataset.out = String(!inGamut);
  gamut.textContent = `${inGamut ? 'Inside sRGB' : 'Outside sRGB — original chroma is preserved'}. Chroma limit at this L and H: ${boundary.toFixed(4)}.`;
  element<HTMLButtonElement>('fit').disabled = inGamut || busy;
  apply.disabled = busy || !valid() || buildOklchEdit(source, color) === source;
  api.setState({ id, color });
};
const schedule = (): void => { if (!frame) { frame = requestAnimationFrame(render); } };
keys.forEach((key, index) => {
  const range = ranges[index]!;
  const number = numbers[index]!;
  const change = (input: HTMLInputElement): void => {
    if (!color) { return; }
    if (input.value === '' || !input.validity.valid || !Number.isFinite(input.valueAsNumber)) {
      apply.disabled = true;
      return;
    }
    color = { ...color, [key]: normalizedValue(key, input.valueAsNumber) };
    if (key === 'chroma' && color.chroma > chromaScale) {
      chromaScale = color.chroma;
      range.max = String(chromaScale);
    }
    range.value = input.value;
    number.value = input.value;
    status('Changes preview here. Apply writes one undoable edit.');
    schedule();
  };
  range.addEventListener('input', () => change(range));
  number.addEventListener('input', () => change(number));
  number.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') { return; }
    if (!Number.isFinite(number.valueAsNumber)) { return; }
    event.preventDefault();
    const step = key === 'chroma' ? 0.0001 : 0.01;
    const max = number.max ? Number(number.max) : Infinity;
    number.value = String(Number(Math.max(0, Math.min(max, number.valueAsNumber + (event.key === 'ArrowUp' ? step : -step))).toFixed(6)));
    change(number);
  });
});
const pickPlane = (event: PointerEvent): void => {
  if (!color || busy) { return; }
  const bounds = plane.getBoundingClientRect();
  color = { ...color,
    lightness: Math.round(Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height)) * 10000) / 10000,
    chroma: Math.round(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * chromaScale * 10000) / 10000,
  };
  // Keep the displayed plane scale stable while dragging.
  const scale = chromaScale;
  setControls();
  chromaScale = scale;
  element<HTMLInputElement>('chroma').max = String(scale);
  status('Changes preview here. Apply writes one undoable edit.');
  schedule();
};
plane.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) { return; }
  dragPointer = event.pointerId;
  plane.setPointerCapture(event.pointerId);
  pickPlane(event);
});
plane.addEventListener('pointermove', (event) => { if (dragPointer === event.pointerId) { pickPlane(event); } });
plane.addEventListener('pointerup', () => { dragPointer = undefined; });
plane.addEventListener('pointercancel', () => { dragPointer = undefined; });
element('fit').addEventListener('click', () => {
  if (!color) { return; }
  // Round down so four-decimal CSS output stays inside the boundary.
  color = { ...color, chroma: Math.floor(maxSrgbChroma(color.lightness, color.hueDegrees) * 10000) / 10000 };
  setControls(); schedule();
});
element('reset').addEventListener('click', () => {
  color = parseOklch(source) ?? undefined;
  setControls(); schedule(); status('Reset to the document color.');
});
apply.addEventListener('click', () => {
  if (!color || !valid() || busy) { return; }
  busy = true;
  apply.disabled = true;
  status('Applying…');
  api.postMessage({ type: 'apply', color });
});
window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data as { type: string; id?: string; source?: string; text?: string };
  if (message.type === 'init' && message.source && message.id) {
    source = message.source; id = message.id;
    const saved = api.getState();
    color = saved?.id === id && isPickerColor(saved.color) ? saved.color : parseOklch(source) ?? undefined;
    setControls(); schedule();
  } else if (message.type === 'applied' && message.source) {
    source = message.source;
    busy = false;
    // Keep any subsequent slider changes as the next pending edit.
    status('Applied to the document. Undo in the text editor to revert. Save the file when ready.');
    schedule();
  } else if (message.type === 'error') {
    busy = false;
    status(message.text ?? 'Unable to apply the color.');
    apply.disabled = true;
  }
});
api.postMessage({ type: 'ready' });
