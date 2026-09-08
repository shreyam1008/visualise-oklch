import { expect, test } from 'bun:test';

test('background gamut raster returns transferable pixels and correct neutral endpoints', async () => {
  const worker = new Worker(new URL('../docs/gamut-worker.js', import.meta.url).href);
  try {
    const result = await new Promise<{ key: string; pixels: Uint8ClampedArray; boundary: string }>((resolve, reject) => {
      worker.addEventListener('message', event => resolve(event.data));
      worker.addEventListener('error', event => reject(new Error(event.message)));
      // A dedicated Worker is not a Window; targetOrigin does not apply.
      // eslint-disable-next-line unicorn/require-post-message-target-origin
      worker.postMessage({ key: '270/0.4', hue: 270, scale: .4, width: 64, height: 44 });
    });
    expect(result.key).toBe('270/0.4');
    expect(result.pixels).toBeInstanceOf(Uint8ClampedArray);
    expect(result.pixels.length).toBe(64 * 44 * 4);
    expect(Array.from(result.pixels.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(result.pixels.slice(43 * 64 * 4, 43 * 64 * 4 + 4))).toEqual([0, 0, 0, 255]);
    expect(result.boundary.startsWith('M')).toBe(true);
    expect(result.boundary.split(' ')).toHaveLength(44);
    expect(result.boundary).not.toMatch(/NaN|Infinity/);
  } finally { worker.terminate(); }
});
