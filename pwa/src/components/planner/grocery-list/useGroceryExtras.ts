import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GroceryExtraDto } from '@/lib/api/generated/models';
import {
  createGroceryExtra,
  deleteGroceryExtra,
  suggestGroceryExtraNames,
  updateGroceryExtra,
} from '@/lib/api/grocery-extras';
import { absoluteMonday } from '@/lib/deployment-calendar';
import { t, tWithVars } from '@/locales';
import { useUiStore } from '@/store/uiStore';
import { useWeekStore } from '@/store/weekStore';
import {
  matchesOccurrenceIdentity,
  type CheckControlInfo,
  type ExtraMutationChange,
  type PreserveCheckFocusFn,
} from './helpers';

interface UseGroceryExtrasOptions {
  weekStartDate: string | null;
  currentWeekStartDate: string | undefined;
  dismissPortionsSummary: () => void;
  preserveCheckFocus: PreserveCheckFocusFn;
  setReclassifyOpen: React.Dispatch<React.SetStateAction<string | null>>;
}

interface ExtraConflictError {
  current?: GroceryExtraDto | null;
  absent?: boolean;
}

export function useGroceryExtras({
  weekStartDate,
  currentWeekStartDate,
  dismissPortionsSummary,
  preserveCheckFocus,
  setReclassifyOpen,
}: UseGroceryExtrasOptions) {
  const upsertExtra = useWeekStore((state) => state.upsertGroceryExtra);
  const removeExtra = useWeekStore((state) => state.removeGroceryExtra);
  const setGroceryExtraPending = useWeekStore((state) => state.setGroceryExtraPending);
  const storePendingExtras = useWeekStore((state) => state.pendingGroceryExtraIds);
  const addToast = useUiStore((state) => state.addToast);

  const [extraName, setExtraName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const [suggestionError, setSuggestionError] = useState(false);
  const [addState, setAddState] = useState<'idle' | 'pending' | 'error'>('idle');
  const [editingExtra, setEditingExtra] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingExtras, setPendingExtras] = useState<Set<string>>(new Set());
  const [extraErrors, setExtraErrors] = useState<Set<string>>(new Set());
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const suggestionGeneration = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const createAttempt = useRef<{ name: string; week: string; clientId: string } | null>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());

  const composerIsEligible =
    absoluteMonday(weekStartDate) !== null &&
    absoluteMonday(weekStartDate) === absoluteMonday(currentWeekStartDate);

  const setComposerContainerNode = useCallback((node: HTMLDivElement | null) => {
    composerRef.current = node;
  }, []);

  const setComposerInputNode = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
  }, []);

  const registerEditButton = useCallback((id: string, node: HTMLButtonElement | null) => {
    if (node) editButtons.current.set(id, node);
    else editButtons.current.delete(id);
  }, []);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!composerRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  useEffect(() => {
    const query = extraName.trim();
    const generation = ++suggestionGeneration.current;
    if (!composerIsEligible || !composerFocused || query.length < 2) {
      // Reset transient lookup state when the field no longer qualifies.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionError(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void suggestGroceryExtraNames(query)
        .then((names) => {
          if (generation !== suggestionGeneration.current) return;
          setSuggestions(names.slice(0, 3));
          setSuggestionsOpen(names.length > 0);
          setActiveSuggestion(-1);
          setSuggestionError(false);
        })
        .catch(() => {
          if (generation !== suggestionGeneration.current) return;
          setSuggestions([]);
          setSuggestionsOpen(false);
          setSuggestionError(true);
        });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [composerFocused, composerIsEligible, extraName]);

  const markExtraPending = (id: string, pending: boolean) => {
    setGroceryExtraPending(id, pending);
    setPendingExtras((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const markExtraError = (id: string) => setExtraErrors((current) => new Set(current).add(id));

  const mutateExtra = async (
    extra: GroceryExtraDto,
    change: ExtraMutationChange,
    checkControl?: CheckControlInfo
  ) => {
    const id = extra.id;
    if (!id || pendingExtras.has(id)) return;
    dismissPortionsSummary();
    const selectedWeekAtStart = useWeekStore.getState().weekStartDate;
    markExtraPending(id, true);
    setExtraErrors((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    const isProjectedAtStart =
      absoluteMonday(selectedWeekAtStart) !==
      absoluteMonday(String(extra.occurrenceWeekStartDate ?? ''));
    if ('checked' in change && change.checked && isProjectedAtStart) removeExtra(id);
    else if ('checked' in change) upsertExtra({ ...extra, ...change } as GroceryExtraDto);
    try {
      const authoritative = await updateGroceryExtra(extra, change);
      if (checkControl) preserveCheckFocus(checkControl.element, checkControl.keyboard);
      if (!matchesOccurrenceIdentity(authoritative, extra)) {
        markExtraError(id);
        markExtraPending(id, false);
        await useWeekStore.getState().sync();
        return;
      }
      const selectedWeek = useWeekStore.getState().weekStartDate;
      const isProjected =
        absoluteMonday(selectedWeek) !==
        absoluteMonday(String(authoritative.occurrenceWeekStartDate ?? ''));
      if (isProjected && authoritative.checked) removeExtra(id);
      else upsertExtra(authoritative);
      if ('name' in change) {
        setEditingExtra(null);
        requestAnimationFrame(() => editButtons.current.get(id)?.focus({ preventScroll: true }));
      }
      if ('grocerySection' in change) setReclassifyOpen(null);
    } catch (error) {
      if (checkControl) preserveCheckFocus(checkControl.element, checkControl.keyboard);
      const conflict = error as ExtraConflictError;
      if (conflict.current && matchesOccurrenceIdentity(conflict.current, extra))
        upsertExtra(conflict.current);
      else if (conflict.absent) removeExtra(id);
      else upsertExtra(extra);
      markExtraError(id);
      markExtraPending(id, false);
      await useWeekStore.getState().sync();
    } finally {
      markExtraPending(id, false);
    }
  };

  const handleDeleteExtra = async (extra: GroceryExtraDto) => {
    dismissPortionsSummary();
    if (!extra.id || pendingExtras.has(extra.id)) return;
    const id = extra.id;
    removeExtra(id);
    markExtraPending(id, true);
    try {
      await deleteGroceryExtra(extra);
      setEditingExtra(null);
    } catch (error) {
      const conflict = error as ExtraConflictError;
      if (conflict.current && matchesOccurrenceIdentity(conflict.current, extra))
        upsertExtra(conflict.current);
      else if (!conflict.absent) upsertExtra(extra);
      markExtraError(id);
      markExtraPending(id, false);
      await useWeekStore.getState().sync();
    } finally {
      markExtraPending(id, false);
    }
  };

  const handleAddExtra = async () => {
    dismissPortionsSummary();
    const name = extraName.trim();
    if (!name || !weekStartDate || !composerIsEligible || addState === 'pending') return;
    const attempt =
      createAttempt.current?.name === name && createAttempt.current.week === weekStartDate
        ? createAttempt.current
        : { name, week: weekStartDate, clientId: crypto.randomUUID() };
    createAttempt.current = attempt;
    setAddState('pending');
    setSuggestionsOpen(false);
    try {
      const extra = await createGroceryExtra(attempt.name, attempt.week, attempt.clientId);
      if (
        extra.id !== attempt.clientId ||
        String(extra.occurrenceWeekStartDate ?? '') !== attempt.week
      ) {
        await useWeekStore.getState().sync();
        setAddState('error');
        inputRef.current?.focus();
        return;
      }
      upsertExtra(extra);
      const rawSection = extra.grocerySection ?? 'Grocery';
      addToast({
        type: 'success',
        message: tWithVars('grocery.extraSavedToSection', 'Saved to {{section}}', {
          section: t(`grocery.aisles.${rawSection}`, rawSection),
        }),
      });
      createAttempt.current = null;
      setExtraName('');
      setSuggestions([]);
      setAddState('idle');
      inputRef.current?.focus();
    } catch (error) {
      await useWeekStore.getState().sync();
      if ((error as ExtraConflictError).absent) createAttempt.current = null;
      setAddState('error');
      inputRef.current?.focus();
    }
  };

  const handleComposerBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (composerRef.current?.contains(event.relatedTarget as Node | null)) return;
    suggestionGeneration.current++;
    setComposerFocused(false);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setExtraName(suggestion);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    } else if (suggestions.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => {
        if (event.key === 'ArrowDown') return (current + 1) % suggestions.length;
        return current <= 0 ? suggestions.length - 1 : current - 1;
      });
    } else if (event.key === 'Enter' && suggestionsOpen && activeSuggestion >= 0) {
      event.preventDefault();
      setExtraName(suggestions[activeSuggestion]);
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    }
  };

  const startEditExtra = (id: string, currentName: string) => {
    dismissPortionsSummary();
    setEditingExtra(id);
    setEditingName(currentName);
  };

  return {
    composerIsEligible,
    extraName,
    setExtraName,
    suggestions,
    suggestionsOpen,
    setSuggestionsOpen,
    setComposerFocused,
    suggestionError,
    addState,
    editingExtra,
    editingName,
    setEditingName,
    pendingExtras,
    storePendingExtras,
    extraErrors,
    activeSuggestion,
    setComposerContainerNode,
    setComposerInputNode,
    registerEditButton,
    mutateExtra,
    handleDeleteExtra,
    handleAddExtra,
    handleComposerBlurCapture,
    handleSelectSuggestion,
    handleComposerKeyDown,
    startEditExtra,
  };
}
