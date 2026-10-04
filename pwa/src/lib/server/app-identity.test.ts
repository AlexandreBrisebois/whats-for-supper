import { afterEach, describe, expect, it, vi } from 'vitest';
import base from '../baseManifest.json';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'outfit' }),
  Inter: () => ({ variable: 'inter' }),
}));
vi.mock('@/components/capture/PdfShareLifecycle', () => ({ PdfShareLifecycle: () => null }));
vi.mock('@/components/common/LocaleProvider', () => ({ LocaleProvider: () => null }));
vi.mock('@/components/identity/IdentityValidator', () => ({ IdentityValidator: () => null }));

async function load(channel: 'stable' | 'beta') {
  vi.resetModules();
  vi.doMock('./release-channel.json', () => ({ default: { channel } }));
  return import('./app-identity');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('runtime install identity', () => {
  it.each([
    undefined,
    '',
    ' ',
    'false',
    'FALSE',
    ' false ',
    'invalid',
    '1',
    'on',
    '\0',
    '\ufefftrue\ufeff',
  ])('disables demo for %s', async (raw) => {
    const { parseDemoMode } = await load('stable');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseDemoMode(raw)).toBe(false);
  });
  it.each(['true', 'TRUE', ' True ', '\ttrue\r\n', '\0true\0', '\u0085true\u0085'])(
    'enables demo for %s',
    async (raw) => {
      const { parseDemoMode } = await load('stable');
      expect(parseDemoMode(raw)).toBe(true);
    }
  );
  it('warns safely for invalid input without echoing configuration', async () => {
    const { resolveAppIdentity } = await load('stable');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('DEMO_MODE', 'sensitive-invalid-input');
    resolveAppIdentity();
    expect(warn).toHaveBeenCalledWith(
      'Invalid DEMO_MODE configuration; expected true or false. Defaulting to false.'
    );
    warn.mockClear();
    for (const raw of [undefined, '', ' ', 'false', 'TRUE']) {
      vi.stubEnv('DEMO_MODE', raw);
      resolveAppIdentity();
    }
    expect(warn).not.toHaveBeenCalled();
  });
  it.each([
    ['stable', 'false', "What's for Supper?", 'production'],
    ['stable', 'true', "What's for Supper?", 'demo'],
    ['beta', 'false', "What's for Supper?", 'beta'],
    ['beta', 'true', "What's for Supper?", 'beta-demo'],
  ] as const)(
    'agrees across resolver, manifest and metadata: %s / %s',
    async (channel, demo, name, variant) => {
      const { resolveAppIdentity } = await load(channel);
      vi.stubEnv('DEMO_MODE', demo);
      vi.stubEnv('WFS_RELEASE_CHANNEL', channel === 'beta' ? 'stable' : 'beta');
      const identity = resolveAppIdentity();
      expect(identity).toMatchObject({ channel, demo: demo === 'true', name, variant });
      const { GET } = await import('@/app/manifest.json/route');
      const { generateMetadata } = await import('@/app/layout');
      const manifest = await GET().json();
      const metadata = await generateMetadata();
      expect(manifest.name).toBe(name);
      expect(manifest.short_name).toBe(name);
      expect(metadata.title).toBe(name);
      expect(metadata.appleWebApp).toMatchObject({
        title: name,
        capable: true,
        statusBarStyle: 'black-translucent',
      });
      const prefix = variant === 'production' ? '' : `/icons/install-v1/${variant}`;
      expect(metadata.icons).toEqual({
        icon: manifest.icons[0].src,
        apple: manifest.icons[1].src,
        ...(prefix ? { shortcut: `${prefix}/favicon.ico` } : {}),
      });
      expect(metadata.description).toBe(
        'Capture recipes, plan your week, discover what to cook next.'
      );
      expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual(
        base.icons.map((icon) => prefix + icon.src)
      );
      expect(
        manifest.shortcuts.map((shortcut: { icons: { src: string }[] }) => shortcut.icons[0].src)
      ).toEqual(base.shortcuts.map((shortcut) => prefix + shortcut.icons[0].src));
      expect({ ...manifest, icons: base.icons, shortcuts: base.shortcuts }).toEqual({
        ...base,
        name,
        short_name: name,
      });
    }
  );
  it('does not memoize runtime DEMO_MODE or the independent PDF feature gate', async () => {
    await load('beta');
    const { GET } = await import('@/app/manifest.json/route');
    const { generateMetadata } = await import('@/app/layout');
    for (const demo of ['false', 'true', 'false']) {
      vi.stubEnv('DEMO_MODE', demo);
      for (const pdf of ['off', 'on', 'off']) {
        vi.stubEnv('WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT', pdf);
        const response = GET();
        expect(response.headers.get('content-type')).toBe('application/manifest+json');
        expect(response.headers.get('cache-control')).toContain('no-store');
        const manifest = await response.json();
        expect(manifest.name).toBe(base.name);
        expect((await generateMetadata()).title).toBe(manifest.name);
        expect(manifest.share_target.method).toBe(pdf === 'on' ? 'POST' : 'GET');
        expect(manifest.share_target.action).toBe(pdf === 'on' ? '/share-target' : '/capture');
      }
    }
  });
});
