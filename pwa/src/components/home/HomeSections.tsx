'use client';

import { Check, Camera, ChevronRight, Search, Clock, Utensils } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { t } from '@/locales';

export function SmartPivotCard({ onSelect }: { onSelect?: (choice: string) => void }) {
  const choices = [
    { id: '15min', label: t('home.fix15min', '15 Min Fix'), icon: Clock, color: 'bg-terracotta' },
    { id: 'pantry', label: t('home.pantryPasta', 'Pantry Pasta'), icon: Utensils, color: 'bg-sage' },
    { id: 'quick-find', label: t('home.quickFind', 'Quick Find'), icon: Search, color: 'bg-charcoal' },
  ];

  return (
    <div
      data-testid="smart-pivot-card"
      className="bg-ochre p-6 rounded-[2.5rem] shadow-ochre-floating flex flex-col gap-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex flex-col gap-1 relative z-10">
        <h2 className="font-heading text-xs font-black uppercase tracking-[0.2em] text-white/60">
          {t('home.nothingPlanned', 'Nothing Planned?')}
        </h2>
        <h3 className="font-heading text-3xl font-black text-white leading-none tracking-tighter">
          {t('home.quickFixes', 'Quick Fixes')}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3 relative z-10">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => onSelect?.(choice.id)}
            data-testid={`smart-pivot-choice-${choice.id}`}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 transition-all active:scale-90 hover:bg-white/30"
          >
            <choice.icon size={20} className="text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-tighter text-center leading-none">
              {choice.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickCaptureTrigger() {
  return (
    <Link
      href={ROUTES.CAPTURE}
      data-testid="quick-capture-trigger"
      className="group relative flex items-center justify-between w-full bg-white text-charcoal p-6 rounded-[2.5rem] border-2 border-charcoal/5 transition-all active:scale-[0.98] hover:border-terracotta/20"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta transition-colors group-hover:bg-terracotta group-hover:text-white">
          <Camera size={32} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-xl font-black tracking-tighter leading-none">
            {t('home.captureRecipe', 'Capture a Recipe')}
          </span>
          <span className="text-charcoal/40 text-[10px] font-black uppercase tracking-widest mt-1">
            {t('home.photoOrLink', 'Photo or Link')}
          </span>
        </div>
      </div>
      <div className="h-10 w-10 rounded-full border border-charcoal/10 flex items-center justify-center group-hover:border-terracotta/30">
        <ChevronRight
          size={20}
          className="text-charcoal/20 group-hover:text-terracotta transition-all group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

export function CookedSuccessCard({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <div
      data-testid="cooked-success-card"
      className="bg-sage p-8 rounded-[2.5rem] shadow-sage-floating flex flex-col items-center justify-center gap-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white mb-2">
        <Check size={48} strokeWidth={3} />
      </div>

      <div className="flex flex-col gap-2 items-center text-center relative z-10">
        <h3
          data-testid="cooked-success-title"
          className="font-heading text-4xl font-black text-white leading-none tracking-tighter"
        >
          {t('home.enjoyMeal', 'Enjoy your meal!')}
        </h3>
        <p className="text-white/70 text-xs font-black uppercase tracking-widest">
          {t('home.markedAsCooked', 'Recipe marked as cooked')}
        </p>
      </div>

      <button
        onClick={onDismiss}
        data-testid="cooked-success-dismiss"
        className="mt-2 px-8 h-12 rounded-2xl bg-white text-sage font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 hover:bg-white/90"
      >
        {t('home.dismiss', 'Dismiss')}
      </button>
    </div>
  );
}
