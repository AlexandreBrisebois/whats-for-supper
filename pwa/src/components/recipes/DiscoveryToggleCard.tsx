'use client';

import React from 'react';
import { t } from '@/locales';

interface DiscoveryToggleCardProps {
  isDiscoverable: boolean;
  onToggle: () => Promise<void>;
  isLoading?: boolean;
  testId?: string;
}

export const DiscoveryToggleCard: React.FC<DiscoveryToggleCardProps> = ({
  isDiscoverable,
  onToggle,
  isLoading = false,
  testId = 'action-toggle-discovery',
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      className={`flex w-full min-h-[5rem] items-center justify-between gap-4 rounded-[1.5rem] border px-6 py-4 text-left transition-all duration-300 backdrop-blur-2xl shadow-glass ${
        isDiscoverable
          ? 'bg-sage/15 text-charcoal border-sage/30 shadow-sm shadow-sage/10'
          : 'bg-white/85 text-charcoal/65 border-charcoal/8 hover:bg-white/95 hover:text-charcoal'
      } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      data-testid={testId}
      aria-label={
        isDiscoverable
          ? t('recipes.turnOffDiscovery', 'Turn off Discovery for this recipe')
          : t('recipes.turnOnDiscovery', 'Turn on Discovery for this recipe')
      }
    >
      <span className="flex flex-col gap-0.5 leading-tight">
        <span className="text-sm font-black tracking-wide text-charcoal">
          {t('planner.askFamily', 'Ask the Family')}
        </span>
        <span className="text-[11px] font-bold text-charcoal/50">
          {t('discovery.showsInDiscovery', 'Shows in Discovery voting')}
        </span>
      </span>
      <div
        className={`relative h-8 w-14 rounded-full transition-colors duration-300 ${
          isDiscoverable ? 'bg-sage' : 'bg-charcoal/20'
        }`}
        aria-hidden="true"
      >
        <div
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
            isDiscoverable ? 'translate-x-7' : 'translate-x-1'
          }`}
          data-testid="discovery-switch"
        />
      </div>
    </button>
  );
};
