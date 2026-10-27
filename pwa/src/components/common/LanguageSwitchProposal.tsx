'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import { DEFAULT_LOCALE, Locale } from '@/lib/i18n';

const PROPOSAL_STORAGE_KEY = 'wfs_lang_proposal_dismissed';

export function LanguageSwitchProposal() {
  const { locale, setCurrentLocale } = useLocale();
  const [browserLocale, setBrowserLocale] = useState<Locale | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Stay quiet if this browser cannot remember the optional proposal.
      if (localStorage.getItem('locale') || localStorage.getItem(PROPOSAL_STORAGE_KEY)) return;
    } catch {
      return;
    }

    // Detect browser language
    const lang = navigator.language.split('-')[0] as Locale;

    // Propose only if browser language is supported AND different from current (default) locale
    if ((lang === 'en' || lang === 'fr') && lang !== locale) {
      // Wait a bit before showing to avoid visual overload on initial load
      const timer = setTimeout(() => {
        setBrowserLocale(lang);
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [locale]);

  const handleSwitch = () => {
    if (browserLocale) {
      setCurrentLocale(browserLocale);
      try {
        localStorage.setItem(PROPOSAL_STORAGE_KEY, 'true');
      } catch {
        /* Current visit still dismisses it. */
      }
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(PROPOSAL_STORAGE_KEY, 'true');
    } catch {
      /* Current visit still dismisses it. */
    }
    setIsVisible(false);
  };

  if (!isVisible || !browserLocale) return null;

  const labels: Record<Locale, { message: string; switch: string; dismiss: string }> = {
    fr: {
      message: 'Passer en Français ?',
      switch: 'Oui',
      dismiss: 'Non',
    },
    en: {
      message: 'Switch to English?',
      switch: 'Yes',
      dismiss: 'No',
    },
  };

  const content = labels[browserLocale];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full max-w-sm pointer-events-auto"
        data-testid="language-proposal"
      >
        <div className="w-full overflow-hidden rounded-2xl border border-sage/30 border-l-4 border-l-sage bg-white/95 shadow-glass backdrop-blur-md">
          <div className="flex items-center gap-3 p-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-sage/15 flex items-center justify-center text-sage">
                <Globe size={16} />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-charcoal">{content.message}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSwitch}
                className="rounded-xl bg-sage px-4 py-1.5 text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
                data-testid="language-proposal-switch"
              >
                {content.switch}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal/70"
                data-testid="language-proposal-dismiss"
              >
                {content.dismiss}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
