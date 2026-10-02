export interface SharedPdf { token: string; file: File; }
export interface PdfShareBridge {
  claim: (token: string) => Promise<SharedPdf | null>;
  discard: (token: string) => Promise<void>;
}
declare global { interface Window { WfsPdfShare?: PdfShareBridge; } }

export async function claimSharedPdf(token: string): Promise<SharedPdf | null> {
  if (!window.WfsPdfShare) throw new Error('PDF sharing is unavailable.');
  return window.WfsPdfShare.claim(token);
}
export async function discardSharedPdf(token: string): Promise<void> {
  await window.WfsPdfShare?.discard(token);
}
