'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, Trash2, RefreshCw, Pencil, Flag } from 'lucide-react';
import { t } from '@/locales';

interface ActionGearMenuProps {
  canReimport: boolean;
  hasImportIssue: boolean;
  onEdit?: () => void;
  onMoveToBin: () => void;
  onReimport: () => void;
  onReportImportIssue: () => void;
}

export function ActionGearMenu({
  canReimport,
  hasImportIssue,
  onEdit,
  onMoveToBin,
  onReimport,
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

  const handleReimport = () => {
    onReimport();
    setIsOpen(false);
  };

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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 transition hover:bg-charcoal/10"
        aria-label={t('common.settings', 'Settings')}
        title={t('common.settings', 'Settings')}
      >
        <Settings size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right animate-in fade-in zoom-in-95 duration-100">
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-[rgba(253,252,240,0.98)] shadow-xl backdrop-blur-md">
            <div className="py-1">
              {onEdit && (
                <button
                  type="button"
                  data-testid="action-edit-recipe"
                  onClick={handleEdit}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  <Pencil size={16} className="text-terracotta/70" />
                  {t('common.edit', 'Edit')}
                </button>
              )}
              {canReimport && (
                <button
                  type="button"
                  data-testid="action-report-import-issue"
                  onClick={() => {
                    onReportImportIssue();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  <Flag size={16} className="text-terracotta/70" />
                  {hasImportIssue ? 'Update report' : 'Report issue'}
                </button>
              )}
              {canReimport && (
                <button
                  type="button"
                  data-testid="action-reimport-recipe"
                  onClick={handleReimport}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  <RefreshCw size={16} className="text-terracotta/70" />
                  {t('recipes.reimportRecipe', 'Reimport Recipe')}
                </button>
              )}
              <button
                type="button"
                data-testid="action-move-to-bin"
                onClick={handleMoveToBin}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
              >
                <Trash2 size={16} className="text-terracotta/70" />
                {t('recipes.moveToBin', 'Move to Bin')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
