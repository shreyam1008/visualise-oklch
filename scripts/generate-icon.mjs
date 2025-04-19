import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const width = 256;
const height = 256;
const scale = width / 512;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (left, right, amount) => left + ((right - left) * amount);
const smooth = (value) => value * value * (3 - (2 * value));
const s = (value) => value * scale;

const mixColor = (from, to, amount) => [
  mix(from[0], to[0], amount),
  mix(from[1], to[1], amount),
  mix(from[2], to[2], amount),
];

const angleProgress = (angle, start, end) => {
  const normalizedAngle = (angle + 360) % 360;
  const normalizedStart = (start + 360) % 360;
  const normalizedEnd = (end + 360) % 360;
  const span = normalizedEnd >= normalizedStart
    ? normalizedEnd - normalizedStart
    : (360 - normalizedStart) + normalizedEnd;
  const delta = normalizedAngle >= normalizedStart
    ? normalizedAngle - normalizedStart
    : (360 - normalizedStart) + normalizedAngle;

  if (delta < 0 || delta > span) {
    return null;
  }

  return delta / span;
};

const backgroundAt = (x, y) => {
  const nx = x / width;
  const ny = y / height;
  const vignette = clamp(1 - (((nx - 0.5) ** 2) + ((ny - 0.52) ** 2)) * 1.7, 0, 1);
  const base = [
    mix(7, 12, nx * 0.9),
    mix(17, 26, ny * 0.9),
    mix(30, 46, ((nx + ny) * 0.5)),
  ];

  return base.map((channel) => mix(channel * 0.82, channel, vignette));
};

const segments = [
  {
    end: 330,
    innerGlow: [255, 140, 100],
    radius: s(170),
    start: 205,
    thickness: s(62),
    to: [255, 67, 129],
    from: [255, 128, 88],
  },
  {
    end: 105,
    innerGlow: [118, 202, 255],
    radius: s(146),
    start: 338,
    thickness: s(56),
    to: [100, 231, 255],
    from: [82, 152, 255],
  },
  {
    end: 245,
    innerGlow: [156, 255, 168],
    radius: s(122),
    start: 114,
    thickness: s(50),
    to: [80, 222, 168],
    from: [188, 255, 102],
  },
];

const pixels = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4;
    const dx = x - (width / 2);
    const dy = y - (height / 2);
    const distance = Math.hypot(dx, dy);
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

    let [red, green, blue] = backgroundAt(x, y);

    const warmGlow = clamp(1 - (Math.hypot(x - s(172), y - s(146)) / s(148)), 0, 1);
    const coolGlow = clamp(1 - (Math.hypot(x - s(356), y - s(164)) / s(150)), 0, 1);
    const limeGlow = clamp(1 - (Math.hypot(x - s(208), y - s(344)) / s(158)), 0, 1);

    red += warmGlow * 22;
    green += warmGlow * 8;
    blue += warmGlow * 6;

    red += coolGlow * 5;
    green += coolGlow * 12;
    blue += coolGlow * 25;

    red += limeGlow * 7;
    green += limeGlow * 24;
    blue += limeGlow * 12;

    for (const segment of segments) {
      const progress = angleProgress(angle, segment.start, segment.end);
      if (progress === null) {
        continue;
      }

      const radialDistance = Math.abs(distance - segment.radius);
      const body = clamp(1 - (radialDistance / (segment.thickness * 0.5)), 0, 1);
      const feather = clamp(1 - (radialDistance / segment.thickness), 0, 1);
      const edgeFade = smooth(clamp(progress < 0.08 ? progress / 0.08 : (progress > 0.92 ? (1 - progress) / 0.08 : 1), 0, 1));

      if (body <= 0 && feather <= 0) {
        continue;
      }

      const color = mixColor(segment.from, segment.to, progress);
      const intensity = (smooth(body) * 0.96) + ((feather ** 3) * 0.28);
      const glowStrength = feather ** 2 * 0.18;

      red += color[0] * intensity * edgeFade;
      green += color[1] * intensity * edgeFade;
      blue += color[2] * intensity * edgeFade;

      red += segment.innerGlow[0] * glowStrength;
      green += segment.innerGlow[1] * glowStrength;
      blue += segment.innerGlow[2] * glowStrength;
    }

    if (distance < s(76)) {
      red = mix(red, 8, 0.82);
      green = mix(green, 17, 0.82);
      blue = mix(blue, 31, 0.82);
    }

    const rx = (dx + dy) / Math.SQRT2;
    const ry = (dx - dy) / Math.SQRT2;
    const diamond = Math.max(Math.abs(rx), Math.abs(ry));
    if (diamond < s(30)) {
      const highlight = smooth(clamp(1 - (diamond / s(30)), 0, 1));
      red = mix(red, 244, highlight * 0.92);
      green = mix(green, 248, highlight * 0.92);
      blue = mix(blue, 255, highlight * 0.92);
    }

    const highlightA = clamp(1 - (Math.hypot(x - s(326), y - s(130)) / s(18)), 0, 1);
    const highlightB = clamp(1 - (Math.hypot(x - s(360), y - s(354)) / s(14)), 0, 1);

    red = mix(red, 255, highlightA * 0.35);
    green = mix(green, 255, highlightA * 0.35);
    blue = mix(blue, 255, highlightA * 0.35);

    red = mix(red, 255, highlightB * 0.3);
    green = mix(green, 255, highlightB * 0.3);
    blue = mix(blue, 255, highlightB * 0.3);

    pixels[index] = clamp(Math.round(red), 0, 255);
    pixels[index + 1] = clamp(Math.round(green), 0, 255);
    pixels[index + 2] = clamp(Math.round(blue), 0, 255);
    pixels[index + 3] = 255;
  }
}

const crcTable = new Uint32Array(256).map((_, slot) => {
  let value = slot;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return new Uint32Array([value])[0];
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return new Uint32Array([crc ^ 0xffffffff])[0];
};

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
};

const raw = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y += 1) {
  const rowStart = y * (width * 4 + 1);
  raw[rowStart] = 0;
  pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(resolve('icon.png'), png);
