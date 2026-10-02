'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { discardSharedPdf } from '@/lib/pdfShare';

// Public unlock/onboarding routes discard delivery rather than recovering a draft.
export function PdfShareLifecycle() {
  const pathname = usePathname();
  const params = useSearchParams();
  const token = params.get('share');
  useEffect(() => {
    if (token && pathname !== '/capture') {
      void discardSharedPdf(token);
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }, [pathname, token]);
  return null;
}
