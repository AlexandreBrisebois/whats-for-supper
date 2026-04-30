'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, Languages } from 'lucide-react';
import { FamilyManagement } from '@/components/profile/FamilyManagement';
import { FamilyGOTOSettings } from '@/components/profile/FamilyGOTOSettings';
import { useLocale } from '@/components/common/LocaleProvider';
import { t } from '@/locales';
import { ROUTES } from '@/lib/constants/routes';

export default function SettingsPage() {
  const router = useRouter();
  const { locale, setCurrentLocale } = useLocale();

  return (
    <div className="flex flex-col gap-8 py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(ROUTES.PROFILE)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 border border-white/40 shadow-glass hover:bg-white/60 transition-colors active:scale-90"
          aria-label={t('buttons.back', 'Back')}
        >
          <ChevronLeft className="h-6 w-6 text-indigo" />
        </button>
        <div>
          <h2 className="font-outfit text-2xl font-bold text-charcoal tracking-tight">
            {t('profile.settings', 'Settings')}
          </h2>
          <p className="text-sm font-medium text-charcoal-300">
            {t('profile.settingsSubtitle', 'Family & app preferences')}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Family Management */}
        <FamilyManagement />

        {/* Family GOTO */}
        <FamilyGOTOSettings />

        {/* Language Selection */}
        <div className="w-full rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
          <div className="flex items-center gap-2 mb-6">
            <Languages className="h-4 w-4 text-indigo/60" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo/60">
              {t('profile.language', 'Language')}
            </h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentLocale('en')}
              className={[
                'flex-1 rounded-2xl py-3 text-sm font-bold transition-all',
                locale === 'en'
                  ? 'bg-indigo text-lavender shadow-card'
                  : 'bg-white/60 text-charcoal hover:bg-indigo/5 border border-transparent',
              ].join(' ')}
            >
              {t('profile.english', 'English')}
            </button>
            <button
              onClick={() => setCurrentLocale('fr')}
              className={[
                'flex-1 rounded-2xl py-3 text-sm font-bold transition-all',
                locale === 'fr'
                  ? 'bg-indigo text-lavender shadow-card'
                  : 'bg-white/60 text-charcoal hover:bg-indigo/5 border border-transparent',
              ].join(' ')}
            >
              {t('profile.french', 'French')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
