'use client';

import { useState, useRef, useEffect } from 'react';
import { Ellipsis, Trash2, Pencil, Flag, Search } from 'lucide-react';
import { t } from '@/locales';

interface ActionGearMenuProps {
  hasImportIssue: boolean;
  onEdit?: () => void;
  onFindSimilar?: () => void;
  onMoveToBin: () => void;
  onReportImportIssue: () => void;
}

export function ActionGearMenu({
  hasImportIssue,
  onEdit,
  onFindSimilar,
  onMoveToBin,
  onReportImportIssue,
}: ActionGearMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMoveToBin = () => {
    onMoveToBin();
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEdit?.();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        data-testid="action-gear-menu"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 transition hover:bg-charcoal/10"
        aria-label={t('recipes.actions', 'Recipe actions')}
        title={t('recipes.actions', 'Recipe actions')}
      >
        <Ellipsis size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] origin-top-right animate-in fade-in zoom-in-95 duration-100">
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-[rgba(253,252,240,0.98)] shadow-xl backdrop-blur-md">
            <div className="py-1">
              {onEdit && (
                <button
                  type="button"
                  data-testid="action-edit-recipe"
                  onClick={handleEdit}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  <Pencil size={16} className="text-terracotta-600" />
                  {t('common.edit', 'Edit')}
                </button>
              )}
              {onFindSimilar && (
                <button
                  type="button"
                  data-testid="action-find-similar"
                  onClick={() => {
                    onFindSimilar();
                    setIsOpen(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  <Search size={16} className="text-terracotta-600" />
                  {t('recipes.findSimilar', 'Find Similar')}
                </button>
              )}
              <button
                type="button"
                data-testid="action-report-import-issue"
                onClick={() => {
                  onReportImportIssue();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
              >
                <Flag size={16} className="text-terracotta-600" />
                {hasImportIssue
                  ? t('recipes.reviewIssue', 'Review issue')
                  : t('recipes.reportIssue', 'Report issue')}
              </button>
              <button
                type="button"
                data-testid="action-move-to-bin"
                onClick={handleMoveToBin}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
              >
                <Trash2 size={16} className="text-terracotta-600" />
                {t('recipes.moveToBin', 'Move to Bin')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
