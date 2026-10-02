import { pdfManifest } from '@/lib/pdfManifest';

export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json(pdfManifest(process.env.WFS_FEATURE_PREVIEW_PDF_RECIPE_IMPORT), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store, max-age=0' },
  });
}
