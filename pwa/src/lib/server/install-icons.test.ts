import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import base from '../baseManifest.json';

describe('versioned install assets', () => {
  it.each(['demo', 'beta', 'beta-demo'])(
    'supplies all manifest/shortcut/favicon formats for %s',
    async (variant) => {
      for (const icon of base.icons) {
        const path = `public/icons/install-v1/${variant}${icon.src}`;
        expect(existsSync(path), path).toBe(true);
        const size = Number(icon.sizes.split('x')[0]);
        expect(await sharp(path).metadata()).toMatchObject({
          width: size,
          height: size,
          format: 'png',
        });
      }
      for (const shortcut of base.shortcuts) {
        expect(existsSync(`public/icons/install-v1/${variant}${shortcut.icons[0].src}`)).toBe(true);
      }
      expect(
        await sharp(`public/icons/install-v1/${variant}/favicon-16x16.png`).metadata()
      ).toMatchObject({ width: 16, height: 16 });
      expect(readFileSync(`public/icons/install-v1/${variant}/favicon.ico`).subarray(0, 4)).toEqual(
        Buffer.from([0, 0, 1, 0])
      );
    }
  );
  it.each(['demo', 'beta-demo'])(
    'keeps the DEMO mark inside the maskable safe circle: %s',
    async (variant) => {
      for (const size of [192, 512]) {
        const basePath =
          variant === 'demo'
            ? `public/maskable-icon-${size}x${size}.png`
            : `public/icons/install-v1/beta/maskable-icon-${size}x${size}.png`;
        const original = await sharp(basePath).ensureAlpha().raw().toBuffer();
        const marked = await sharp(
          `public/icons/install-v1/${variant}/maskable-icon-${size}x${size}.png`
        )
          .ensureAlpha()
          .raw()
          .toBuffer();
        let changed = 0;
        for (let p = 0; p < original.length; p += 4) {
          if (original.subarray(p, p + 4).equals(marked.subarray(p, p + 4))) continue;
          changed++;
          const pixel = p / 4;
          expect(
            Math.hypot((pixel % size) + 0.5 - size / 2, Math.floor(pixel / size) + 0.5 - size / 2)
          ).toBeLessThan(size * 0.4);
        }
        expect(changed).toBeGreaterThan(0);
        expect(changed / (size * size)).toBeLessThan(0.03);
      }
    }
  );

  it('changes only a small corner of the normal demo artwork', async () => {
    const original = await sharp('public/android-chrome-512x512.png')
      .ensureAlpha()
      .raw()
      .toBuffer();
    const marked = await sharp('public/icons/install-v1/demo/android-chrome-512x512.png')
      .ensureAlpha()
      .raw()
      .toBuffer();
    let changed = 0;
    for (let p = 0; p < original.length; p += 4) {
      if (original.subarray(p, p + 4).equals(marked.subarray(p, p + 4))) continue;
      changed++;
      const pixel = p / 4;
      expect(pixel % 512).toBeGreaterThan(256);
      expect(Math.floor(pixel / 512)).toBeLessThan(256);
    }
    expect(changed).toBeGreaterThan(0);
    expect(changed / (512 * 512)).toBeLessThan(0.03);
  });
  it.each(['beta', 'beta-demo'])(
    'preserves the original textured background in every PNG: %s',
    async (variant) => {
      const files = [...base.icons.map((icon) => icon.src.slice(1)), 'favicon-16x16.png'];
      for (const file of files) {
        const originalPath = `public/${file}`;
        const { width } = await sharp(originalPath).metadata();
        // This background region is clear of the flame and identity markings at every size.
        const background = {
          left: 0,
          top: 0,
          width: Math.floor(width! / 4),
          height: Math.floor(width! / 2),
        };
        const original = await sharp(originalPath)
          .extract(background)
          .ensureAlpha()
          .raw()
          .toBuffer();
        const variantBackground = await sharp(`public/icons/install-v1/${variant}/${file}`)
          .extract(background)
          .ensureAlpha()
          .raw()
          .toBuffer();
        expect(variantBackground.equals(original), file).toBe(true);
      }
    }
  );
});
