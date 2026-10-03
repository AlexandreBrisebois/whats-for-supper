export interface SharedPdf { token: string; file: File; }
export interface PdfShareBridge {
  cleanup?: () => Promise<void>;
  claim: (token: string) => Promise<SharedPdf | null>;
  discard: (token: string) => Promise<void>;
}
declare global { interface Window { WfsPdfShare?: PdfShareBridge; } }

export async function claimSharedPdf(token: string): Promise<SharedPdf | null> {
  if (!window.WfsPdfShare) throw new Error('PDF sharing is unavailable.');
  return window.WfsPdfShare.claim(token);
}
export async function discardSharedPdf(token: string): Promise<void> {
  try { await window.WfsPdfShare?.discard(token); }
  catch { /* A storage failure cannot restore a draft; the bounded slot expires. */ }
}
