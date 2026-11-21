'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { Ellipsis, Trash2, Pencil, Flag } from 'lucide-react';
import { t } from '@/locales';

interface ActionGearMenuProps {
  hasImportIssue: boolean;
  onEdit?: () => void;
  onOriginalQuantities?: () => void;
  originalQuantitiesDisabled?: boolean;
  onResetView?: () => void;
  onMoveToBin: () => void;
  onReportImportIssue: () => void;
}

export function ActionGearMenu({
  hasImportIssue,
  onEdit,
  onOriginalQuantities,
  originalQuantitiesDisabled,
  onResetView,
  onMoveToBin,
  onReportImportIssue,
}: ActionGearMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };
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

  useEffect(() => {
    if (isOpen)
      dropdownRef.current
        ?.querySelector<HTMLButtonElement>('[data-action-item]:not(:disabled)')
        ?.focus();
  }, [isOpen]);

  const handleMoveToBin = () => {
    closeMenu();
    onMoveToBin();
  };

  const handleEdit = () => {
    closeMenu();
    onEdit?.();
  };

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            return;
          }
          const buttons = Array.from(
            dropdownRef.current?.querySelectorAll<HTMLButtonElement>(
              '[data-action-item]:not(:disabled)'
            ) ?? []
          );
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls={menuId}
        data-testid="action-gear-menu"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-charcoal/5 text-charcoal/70 transition hover:bg-charcoal/10"
        aria-label={t('recipes.actions', 'Recipe actions')}
        title={t('recipes.actions', 'Recipe actions')}
      >
        <Ellipsis size={20} />
      </button>

      {isOpen && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] origin-top-right animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-[rgba(253,252,240,0.98)] shadow-xl backdrop-blur-md">
            <div className="py-1">
              {onOriginalQuantities && (
                <button
                  type="button"
                  data-action-item
                  data-testid="action-original-quantities"
                  disabled={originalQuantitiesDisabled}
                  onClick={() => {
                    closeMenu();
                    onOriginalQuantities();
                  }}
                  className="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  {t('recipes.viewOriginalIngredients', 'View original ingredients')}
                </button>
              )}
              {onResetView && (
                <button
                  type="button"
                  data-action-item
                  data-testid="action-reset-view"
                  onClick={() => {
                    closeMenu();
                    onResetView();
                  }}
                  className="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  {t('recipes.resetView', 'Reset view')}
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  data-action-item
                  data-testid="action-edit-recipe"
                  onClick={handleEdit}
                  className="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
                >
                  <Pencil size={16} className="text-terracotta-600" />
                  {t('common.edit', 'Edit')}
                </button>
              )}

              <button
                type="button"
                data-action-item
                data-testid="action-report-import-issue"
                onClick={() => {
                  closeMenu();
                  onReportImportIssue();
                }}
                className="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
              >
                <Flag size={16} className="text-terracotta-600" />
                {hasImportIssue
                  ? t('recipes.reviewIssue', 'Review issue')
                  : t('recipes.reportIssue', 'Report issue')}
              </button>
              <button
                type="button"
                data-action-item
                data-testid="action-move-to-bin"
                onClick={handleMoveToBin}
                className="flex min-h-[48px] w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-charcoal transition hover:bg-charcoal/5"
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
