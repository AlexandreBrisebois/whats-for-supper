import { describe, it, expect, vi } from 'vitest';
import { claimSharedPdf, discardSharedPdf } from './pdfShare';

describe('PDF share ownership', () => {
  it('delegates to the atomic one-slot store and cannot discard a newer token', async () => {
    const discard = vi.fn().mockResolvedValue(undefined);
    const claim = vi
      .fn()
      .mockResolvedValue({ token: 'current', file: new File(['x'], 'supper.pdf') });
    Object.assign(window, { WfsPdfShare: { claim, discard } });
    await claimSharedPdf('current');
    expect(claim).toHaveBeenCalledWith('current');
    await discardSharedPdf('older');
    expect(discard).toHaveBeenCalledWith('older');
  });
});
