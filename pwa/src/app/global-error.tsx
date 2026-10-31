'use client';

import { getLocale, t } from '@/locales';

// This replaces the root document; it must carry its own styling and cannot
// depend on root providers, router context, downloaded fonts or global CSS.
export default function GlobalError({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <html lang={getLocale()}>
      <head>
        <title>{t('errors.genericTitle', 'Something went wrong')}</title>
        <style>{`body{margin:0;background:#FDFCF0;color:#1F2937;font-family:system-ui,sans-serif}main{min-height:100dvh;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;padding:3rem 1.5rem;text-align:center}h2,p{margin:0}button,a{font:inherit;min-height:44px;box-sizing:border-box;padding:.75rem 1.5rem;border-radius:.75rem}button{border:0;background:#B85542;color:white;font-weight:600;cursor:pointer}a{color:#1F2937}button:focus-visible,a:focus-visible{outline:3px solid #1F2937;outline-offset:4px}`}</style>
      </head>
      <body>
        <main>
          <h2>{t('errors.genericTitle', 'Something went wrong')}</h2>
          <p>{t('errors.genericDescription', 'An unexpected error occurred. Please try again.')}</p>
          <button
            onClick={() => {
              reset();
            }}
          >
            {t('errors.tryAgain', 'Try again')}
          </button>
          <a href="/home">{t('navigation.home', 'Home')}</a>
        </main>
      </body>
    </html>
  );
}
