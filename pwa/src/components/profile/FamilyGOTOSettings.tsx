'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { t, tWithVars } from '@/locales';
import { useFamilyStore } from '@/store/familyStore';
import { useGotoStore } from '@/store/gotoStore';
import type { GoToListDto } from '@/lib/api/generated/models/index';

/** The complete saved collection, independent of the chooser's unapplied filter draft. */
export function FamilyGOTOSettings({
  onAdd,
  initiallyExpanded = false,
}: {
  onAdd?: () => void;
  initiallyExpanded?: boolean;
}) {
  const familySettings = useFamilyStore((state) => state.familySettings);
  const loadGoTo = useFamilyStore((state) => state.loadGoTo);
  const saveGoTo = useFamilyStore((state) => state.saveGoTo);
  const readyRecipeIds = useGotoStore((state) => state.readyRecipeIds);
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [readState, setReadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState(false);
  const [readyNotice, setReadyNotice] = useState(false);
  const handledReady = useRef(new Set<string>());
  const items = useMemo(
    () => (familySettings.family_goto as GoToListDto)?.items ?? [],
    [familySettings]
  );
  const read = useCallback(
    async (fromReadyEvent = false) => {
      setReadState('loading');
      try {
        const result = await loadGoTo();
        setReadState(result ? 'ready' : 'error');
        if (result && fromReadyEvent) setReadyNotice(true);
      } catch {
        setReadState('error');
      }
    },
    [loadGoTo]
  );
  useEffect(() => {
    if (!expanded || readState !== 'idle') return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void read();
    });
    return () => {
      active = false;
    };
  }, [expanded, readState, read]);
  useEffect(() => {
    if (!expanded || readState !== 'ready') return;
    const ids = items.filter(
      (item) =>
        item.status === 'pending' &&
        readyRecipeIds.has(item.recipeId!) &&
        !handledReady.current.has(item.recipeId!)
    );
    if (!ids.length) return;
    ids.forEach((item) => handledReady.current.add(item.recipeId!));
    void Promise.resolve().then(() => read(true));
  }, [expanded, items, readState, read, readyRecipeIds]);
  const remove = async (recipeId: string) => {
    if (removingId) return;
    setRemovingId(recipeId);
    setRemoveError(false);
    try {
      await saveGoTo({ items: items.filter((item) => item.recipeId !== recipeId) });
    } catch (error) {
      console.error('Failed to remove GOTO:', error);
      setRemoveError(true);
    } finally {
      setRemovingId(null);
    }
  };
  return (
    <section className="border-t border-charcoal/10 pt-4 text-charcoal">
      <button
        type="button"
        data-testid="goto-management-toggle"
        aria-expanded={expanded}
        aria-controls="goto-management-rows"
        onClick={() => setExpanded(!expanded)}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-base font-bold"
      >
        {t('familyGoto.manage', 'Manage GOTOs')}
        <ChevronDown aria-hidden="true" size={20} className={expanded ? 'rotate-180' : ''} />
      </button>
      {expanded && (
        <div id="goto-management-rows" className="space-y-3 py-3">
          <p className="text-sm leading-relaxed text-charcoal-600">
            {t(
              'familyGoto.saveExplanation',
              'List changes save immediately after confirmation. Filter changes take effect on Apply.'
            )}
          </p>
          {readState === 'loading' && (
            <p role="status">{t('familyGoto.loading', 'Loading GOTOs…')}</p>
          )}
          {readState === 'error' && (
            <div role="alert">
              <p>{t('familyGoto.loadFailed', 'Could not load GOTOs.')}</p>
              <button
                type="button"
                onClick={() => void read()}
                className="min-h-11 px-3 font-bold underline"
              >
                {t('common.retry', 'Retry')}
              </button>
            </div>
          )}
          {removeError && (
            <p role="alert" className="text-terracotta-700">
              {t('familyGoto.removeFailed', 'Could not remove GOTO. Try removing it again.')}
            </p>
          )}
          {readyNotice && (
            <p role="status" className="text-sage-900">
              {t('familyGoto.ready', 'A GOTO recipe is ready.')}
            </p>
          )}
          {items.map((item) => (
            <div
              key={item.recipeId}
              className="flex min-w-0 items-center justify-between gap-3 border-b border-charcoal/10 py-3"
            >
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <p
                  data-testid={
                    item.status === 'pending' ? 'goto-pending-description' : 'goto-recipe-name'
                  }
                  className="text-base font-semibold"
                >
                  {item.description}
                </p>
                {item.status === 'pending' && (
                  <p className="flex items-center gap-2 text-sm text-charcoal-600">
                    <Loader2
                      data-testid="goto-pending-spinner"
                      aria-hidden="true"
                      className="h-4 w-4 motion-safe:animate-spin"
                    />
                    {t('familyGoto.preparing', 'Being prepared…')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void remove(item.recipeId!)}
                disabled={removingId !== null}
                aria-label={tWithVars('familyGoto.remove', 'Remove {{name}}', {
                  name: item.description ?? '',
                })}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-charcoal-600 hover:bg-terracotta-50 disabled:opacity-60"
              >
                {removingId === item.recipeId ? (
                  <Loader2 aria-hidden="true" size={20} className="motion-safe:animate-spin" />
                ) : (
                  <X aria-hidden="true" size={20} />
                )}
              </button>
            </div>
          ))}
          {readState === 'ready' && items.length === 0 && (
            <p>{t('familyGoto.empty', 'No GOTO set yet.')}</p>
          )}
          <button
            type="button"
            data-testid="add-goto-btn"
            onClick={onAdd}
            className="flex min-h-11 items-center gap-2 rounded-full px-3 text-base font-bold text-terracotta-700 hover:bg-terracotta-50"
          >
            <Plus aria-hidden="true" size={20} />
            {t('familyGoto.add', 'Add a GOTO')}
          </button>
        </div>
      )}
    </section>
  );
}
