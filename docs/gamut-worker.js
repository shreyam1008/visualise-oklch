import { maxSrgbChroma, oklchToSrgb } from './color-tools.js';

// Rasterization never blocks pointer handling or the linked format fields.
self.onmessage = ({ data: { key, hue, scale, width, height } }) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const boundary = [];
  for (let y = 0; y < height; y++) {
    const lightness = 1 - y / (height - 1);
    const limit = maxSrgbChroma(lightness, hue, 0.5);
    boundary.push(`${y ? 'L' : 'M'}${limit / scale * 256},${y / (height - 1) * 176}`);
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const chroma = x / (width - 1) * scale;
      const stripe = (x + y) % 12 < 3;
      const rgb = chroma <= limit ? oklchToSrgb({ lightness, chroma, hueDegrees: hue, alpha: 1 }) : null;
      pixels[offset] = rgb ? rgb.red * 255 : stripe ? 47 : 19;
      pixels[offset + 1] = rgb ? rgb.green * 255 : stripe ? 58 : 27;
      pixels[offset + 2] = rgb ? rgb.blue * 255 : stripe ? 76 : 42;
      pixels[offset + 3] = 255;
    }
  }
  self.postMessage({ key, width, height, pixels, boundary: boundary.join(' ') }, [pixels.buffer]);
};
