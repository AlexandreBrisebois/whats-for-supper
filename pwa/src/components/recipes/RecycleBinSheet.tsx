'use client';

import { useEffect, useState } from 'react';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import { getTrashItems, restoreRecipe, purgeRecipe, type TrashItem } from '@/lib/api/recipes';
import { t } from '@/locales';

interface RecycleBinSheetProps {
  onClose: () => void;
}

interface PinDialogState {
  recipeId: string;
  pin: string;
  error: string | null;
  isSubmitting: boolean;
}

export function RecycleBinSheet({ onClose }: RecycleBinSheetProps) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [pinDialog, setPinDialog] = useState<PinDialogState | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const result = await getTrashItems();
        if (!isActive) return;
        setItems(result);
      } catch (error) {
        if (!isActive) return;
        console.error('Failed to load trash items', error);
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const handleRestore = async (id: string) => {
    setRestoringIds((prev) => new Set(prev).add(id));
    try {
      await restoreRecipe(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to restore recipe', error);
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const openPinDialog = (recipeId: string) => {
    setPinDialog({ recipeId, pin: '', error: null, isSubmitting: false });
  };

  const closePinDialog = () => {
    setPinDialog(null);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinDialog) return;

    setPinDialog((prev) => prev && { ...prev, isSubmitting: true, error: null });

    try {
      await purgeRecipe(pinDialog.recipeId, pinDialog.pin);
      setItems((prev) => prev.filter((item) => item.id !== pinDialog.recipeId));
      setPinDialog(null);
    } catch (error: any) {
      console.error('Purge failed', error);
      setPinDialog((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isSubmitting: false,
          error: t('recipes.purgeError', 'Incorrect PIN or permanent delete is not available.'),
        };
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-[2rem] bg-white p-6 shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-black tracking-tight text-charcoal">
            {t('recipes.recycleBin', 'Recycle Bin')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-charcoal/5 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-charcoal/40 text-sm">
              {t('common.loading', 'Loading…')}
            </div>
          ) : (
            <ul data-testid="trash-list" className="flex flex-col gap-3">
              {items.length === 0 ? (
                <li
                  data-testid="trash-empty-state"
                  className="flex h-32 items-center justify-center text-center text-charcoal/40 text-sm"
                >
                  {t('recipes.trashEmpty', 'Your Recycle Bin is empty.')}
                </li>
              ) : (
                items.map((item) => (
                  <li
                    key={item.id}
                    data-testid={`trash-item-${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white/80 p-4"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-charcoal truncate">
                        {item.name ?? t('recipes.unknownRecipe', 'Unknown Recipe')}
                      </span>
                      <span className="text-xs text-charcoal/40">
                        {new Date(item.deletedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        data-testid={`action-restore-${item.id}`}
                        onClick={() => void handleRestore(item.id)}
                        disabled={restoringIds.has(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {t('recipes.restore', 'Restore')}
                      </button>
                      <button
                        type="button"
                        data-testid={`action-purge-${item.id}`}
                        onClick={() => openPinDialog(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={12} />
                        {t('recipes.purge', 'Delete')}
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {pinDialog && (
        <div
          className="absolute inset-0 z-60 flex items-center justify-center bg-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          <form
            data-testid="elevated-pin-dialog"
            onSubmit={(e) => void handlePinSubmit(e)}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl mx-4 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-base font-black tracking-tight text-charcoal">
              {t('recipes.confirmDelete', 'Permanently Delete Recipe')}
            </h3>
            <p className="text-sm text-charcoal/60">
              {t(
                'recipes.confirmDeleteDescription',
                'This action cannot be undone. Enter your PIN to confirm.'
              )}
            </p>
            <input
              data-testid="elevated-pin-input"
              type="password"
              value={pinDialog.pin}
              onChange={(e) =>
                setPinDialog((prev) => prev && { ...prev, pin: e.target.value, error: null })
              }
              placeholder={t('recipes.pinPlaceholder', 'Enter PIN')}
              className="w-full rounded-2xl border border-charcoal/10 bg-white/80 px-4 py-3 text-sm font-medium text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-terracotta/40"
              autoFocus
            />
            {pinDialog.error && (
              <p data-testid="elevated-pin-error" className="text-xs text-red-500">
                {pinDialog.error}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                data-testid="elevated-pin-cancel"
                onClick={closePinDialog}
                className="rounded-full px-4 py-2 text-sm font-bold text-charcoal/60 hover:bg-charcoal/5 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={pinDialog.isSubmitting || !pinDialog.pin}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50 hover:bg-red-600 transition-colors"
              >
                {pinDialog.isSubmitting
                  ? t('common.deleting', 'Deleting…')
                  : t('recipes.confirmDeleteButton', 'Delete Forever')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
