import 'server-only';
import release from './release-channel.json';

export type ReleaseChannel = 'stable' | 'beta';
export type AppIdentity = {
  demo: boolean;
  channel: ReleaseChannel;
  variant: 'production' | 'demo' | 'beta' | 'beta-demo';
  name: string;
  icons: { favicon: string; apple: string; prefix: string; shortcut?: string };
  hint: 'demo' | 'beta' | null;
};

// Imported into the server bundle at build time, never selected by runtime env.
if (release.channel !== 'stable' && release.channel !== 'beta') {
  throw new Error('Invalid baked WFS release channel; expected stable or beta.');
}
const channel: ReleaseChannel = release.channel;

export function parseDemoMode(raw: string | undefined): boolean {
  // Match .NET bool.TryParse whitespace/null trimming, including Unicode whitespace.
  const blank = raw === undefined || /^\p{White_Space}*$/u.test(raw);
  const normalized = raw
    ?.replace(/^[\p{White_Space}\0]+|[\p{White_Space}\0]+$/gu, '')
    .toLowerCase();
  const demo = normalized === 'true';
  if (!blank && normalized !== 'true' && normalized !== 'false') {
    console.warn('Invalid DEMO_MODE configuration; expected true or false. Defaulting to false.');
  }
  return demo;
}

export function resolveAppIdentity(): AppIdentity {
  const demo = parseDemoMode(process.env.DEMO_MODE);
  const variant = channel === 'beta' ? (demo ? 'beta-demo' : 'beta') : demo ? 'demo' : 'production';
  const prefix = variant === 'production' ? '' : `/icons/install-v1/${variant}`;
  return {
    demo,
    channel,
    variant,
    name: "What's for Supper?",
    icons: {
      prefix,
      favicon: `${prefix}/favicon-32x32.png`,
      apple: `${prefix}/apple-touch-icon.png`,
      ...(prefix ? { shortcut: `${prefix}/favicon.ico` } : {}),
    },
    hint: demo ? 'demo' : channel === 'beta' ? 'beta' : null,
  };
}
