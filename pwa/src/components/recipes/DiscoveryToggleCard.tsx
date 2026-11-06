'use client';

import React from 'react';
import { t } from '@/locales';

interface DiscoveryToggleCardProps {
  isDiscoverable: boolean;
  onToggle: () => Promise<void>;
  isLoading?: boolean;
  testId?: string;
  descriptionClassName?: string;
  compactReading?: boolean;
}

export const DiscoveryToggleCard: React.FC<DiscoveryToggleCardProps> = ({
  isDiscoverable,
  onToggle,
  isLoading = false,
  testId = 'action-toggle-discovery',
  descriptionClassName = 'text-charcoal/50',
  compactReading = false,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      className={`flex w-full items-center justify-between rounded-[1.5rem] border text-left transition-all duration-300 backdrop-blur-2xl shadow-glass ${compactReading ? 'min-h-[80px] flex-wrap gap-[12px] px-[16px] py-[12px]' : 'min-h-[5rem] gap-4 px-6 py-4'} ${
        isDiscoverable
          ? 'bg-sage/15 text-charcoal border-sage/30 shadow-sm shadow-sage/10'
          : 'bg-white/85 text-charcoal/65 border-charcoal/8 hover:bg-white/95 hover:text-charcoal'
      } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      data-testid={testId}
      aria-pressed={isDiscoverable}
      aria-label={
        isDiscoverable
          ? t('recipes.turnOffDiscovery', 'Turn off Discovery for this recipe')
          : t('recipes.turnOnDiscovery', 'Turn on Discovery for this recipe')
      }
    >
      <span
        className={`flex min-w-0 flex-1 flex-col gap-0.5 leading-tight ${compactReading ? 'basis-[192px]' : ''}`}
      >
        <span className="text-sm font-black tracking-wide text-charcoal">
          {t('planner.askFamily', 'Ask the Family')}
        </span>
        <span className={`text-[11px] font-bold ${descriptionClassName}`}>
          {t('discovery.showsInDiscovery', 'Shows in Discovery voting')}
        </span>
      </span>
      <div
        className={`relative shrink-0 rounded-full transition-colors duration-300 ${compactReading ? 'h-[32px] w-[56px]' : 'h-8 w-14'} ${
          isDiscoverable ? 'bg-sage' : 'bg-charcoal/20'
        }`}
        aria-hidden="true"
      >
        <div
          className={`absolute rounded-full bg-white shadow-md transition-transform duration-300 ${compactReading ? 'top-[4px] h-[24px] w-[24px]' : 'top-1 h-6 w-6'} ${
            isDiscoverable
              ? compactReading
                ? 'translate-x-[28px]'
                : 'translate-x-7'
              : compactReading
                ? 'translate-x-[4px]'
                : 'translate-x-1'
          }`}
          data-testid="discovery-switch"
        />
      </div>
    </button>
  );
};
