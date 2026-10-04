import { resolveAppIdentity } from '@/lib/server/app-identity';
import { pdfManifest } from '@/lib/pdfManifest';

export const dynamic = 'force-dynamic';
export function GET() {
  const identity = resolveAppIdentity();
  const manifest = pdfManifest(process.env.WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT);
  const icons = manifest.icons.map((icon) => ({ ...icon, src: identity.icons.prefix + icon.src }));
  const shortcuts = manifest.shortcuts.map((shortcut) => ({
    ...shortcut,
    icons: shortcut.icons.map((icon) => ({ ...icon, src: identity.icons.prefix + icon.src })),
  }));
  return Response.json(
    { ...manifest, name: identity.name, short_name: identity.name, icons, shortcuts },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
