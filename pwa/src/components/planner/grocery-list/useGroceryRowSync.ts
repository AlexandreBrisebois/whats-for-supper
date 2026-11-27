import { useEffect, useRef, useState } from 'react';
import { DateOnly } from '@microsoft/kiota-abstractions';
import { getSchedule } from '@/lib/api/planner';
import { useSchedule } from '@/lib/api/schedule';
import { refreshSupperGroceries } from '@/lib/api/supper-servings';
import { demoSession } from '@/lib/api/demo-session';
import type { GroceryLineItemDto } from '@/lib/api/generated/models';
import {
  beginGroceryIntent,
  currentGroceryVersion,
  enqueueGroceryIntent,
  finishGroceryIntent,
  isLatestGroceryIntent,
  overlayGroceryIntents,
  rememberGroceryVersion,
} from '@/lib/grocery/rowState';
import { absoluteMonday } from '@/lib/deployment-calendar';
import { t } from '@/locales';
import { useFamilyStore } from '@/store/familyStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useUiStore } from '@/store/uiStore';
import { useWeekStore } from '@/store/weekStore';

interface UseGroceryRowSyncOptions {
  weekOffset: number;
  weekStartDate: string | null;
  referenceWeekStartDate: string | undefined;
}

export function useGroceryRowSync({
  weekOffset,
  weekStartDate,
  referenceWeekStartDate,
}: UseGroceryRowSyncOptions) {
  const { groceryState, setGroceryItemToggle } = usePlannerStore();
  const { toggleGroceryItem } = useSchedule();
  const servingRefresh = useWeekStore((s) => s.groceryRefresh);
  const storeWeekOffset = useWeekStore((state) => state.weekOffset);

  const summary = servingRefresh?.resetSummaryVersion;
  const noticeKey = weekStartDate ? `serving-grocery-summary:${weekStartDate}` : null;
  const announcedSummariesRef = useRef<Record<string, string>>({});
  const activeSummaryToastIdRef = useRef<string | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  const [errorItems, setErrorItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    void useWeekStore.getState().refreshGroceries();
  }, [weekOffset, weekStartDate, referenceWeekStartDate]);

  const dismissPortionsSummary = () => {
    if (activeSummaryToastIdRef.current) {
      useUiStore.getState().removeToast(activeSummaryToastIdRef.current);
      activeSummaryToastIdRef.current = null;
    }
    if (!summary) return;
    announcedSummariesRef.current[weekStartDate ?? ''] = summary;
    if (noticeKey) {
      try {
        sessionStorage.setItem(noticeKey, summary);
      } catch {
        /* Preserve the local acknowledgement when storage is unavailable. */
      }
    }
  };

  useEffect(() => {
    if (!summary || !weekStartDate || storeWeekOffset !== weekOffset) return;
    const weekKey = weekStartDate ?? '';
    let acknowledged: string | null = announcedSummariesRef.current[weekKey] ?? null;
    if (!acknowledged && noticeKey && typeof window !== 'undefined') {
      try {
        acknowledged = sessionStorage.getItem(noticeKey);
      } catch {
        /* Storage is optional; the list and local dismissal remain usable. */
      }
    }
    if (summary === acknowledged) return;
    if (activeSummaryToastIdRef.current) {
      useUiStore.getState().removeToast(activeSummaryToastIdRef.current);
    }
    activeSummaryToastIdRef.current = useUiStore.getState().addToast({
      type: 'success',
      message: t('portions.increased', 'Shopping list updated. Items needing more are unchecked.'),
    });
    announcedSummariesRef.current[weekKey] = summary;
    if (noticeKey) {
      try {
        sessionStorage.setItem(noticeKey, summary);
      } catch {
        /* Preserve the local acknowledgement when storage is unavailable. */
      }
    }
  }, [summary, weekStartDate, noticeKey, storeWeekOffset, weekOffset]);

  const retryPortions = async () => {
    setRefreshError(false);
    const week = useWeekStore.getState().schedule[0]?.date;
    const member = useFamilyStore.getState().selectedFamilyMemberId;
    const generation = demoSession.generation;
    if (!week) return;
    const ownsReply = () => {
      const current = useWeekStore.getState();
      const freshness = current.groceryRefresh;
      // A fresh GET can replace the object without changing the captured work.
      // New input, progress or replacement workflows still retire this reply.
      const sameWork =
        freshness === servingRefresh ||
        Boolean(
          servingRefresh?.version &&
          freshness?.version === servingRefresh.version &&
          freshness.status === servingRefresh.status &&
          freshness.appliedVersion === servingRefresh.appliedVersion &&
          freshness.resetSummaryVersion === servingRefresh.resetSummaryVersion &&
          freshness.workflowId === servingRefresh.workflowId
        );
      return (
        current.schedule[0]?.date === week &&
        sameWork &&
        useFamilyStore.getState().selectedFamilyMemberId === member &&
        demoSession.generation === generation &&
        !demoSession.resetRequired
      );
    };
    try {
      await refreshSupperGroceries(week);
      if (ownsReply())
        useWeekStore.setState((state) => ({
          groceryRefresh: { ...state.groceryRefresh, status: 'updating' },
        }));
    } catch {
      if (ownsReply()) setRefreshError(true);
    }
  };

  const handleToggle = async (item: GroceryLineItemDto) => {
    dismissPortionsSummary();
    const captured = useWeekStore.getState();
    const week = absoluteMonday(item.weekStartDate) ?? captured.weekStartDate;
    const reference = captured.calendar?.referenceWeekStartDate;
    const id = item.rowId;
    if (!id || !week || !reference || !item.rowVersion) return;
    const intended = !usePlannerStore.getState().groceryState[id];
    const intentEpoch = captured.groceryPresentationEpoch;
    const currentEpoch = () => useWeekStore.getState().groceryPresentationEpoch === intentEpoch;
    const token = beginGroceryIntent(week, id, intended);
    setErrorItems((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
    setGroceryItemToggle(id, intended);
    const reconcile = () => {
      const state = useWeekStore.getState();
      if (state.weekStartDate === week && state.groceryVersionWeek === week)
        usePlannerStore
          .getState()
          .setGroceryState(overlayGroceryIntents(week, state.authoritativeGroceryChecks));
    };
    try {
      await enqueueGroceryIntent(week, id, async () => {
        if (!currentEpoch()) return;
        const current = useWeekStore.getState();
        const row =
          current.weekStartDate === week
            ? current.groceryItems.find((candidate) => candidate.rowId === id)
            : undefined;
        try {
          const outcome = await toggleGroceryItem(
            weekOffset,
            {
              rowId: id,
              weekStartDate: DateOnly.parse(week)!,
              checked: intended,
              expectedPresentationEpoch: intentEpoch,
              expectedRowVersion: currentGroceryVersion(
                week,
                id,
                row?.rowVersion ?? item.rowVersion!
              ),
              clientMutationId: crypto.randomUUID(),
            },
            reference
          );
          if (!currentEpoch()) return;
          if (!outcome?.rowVersion || !outcome.listVersion || !outcome.rows || !outcome.checks)
            throw new Error('Missing authoritative grocery outcome.');
          rememberGroceryVersion(week, id, outcome.rowVersion);
          useWeekStore.getState().applyGrocerySnapshot({
            weekStartDate: outcome.weekStartDate,
            groceryListVersion: outcome.listVersion,
            presentationVersion: outcome.presentationVersion ?? undefined,
            presentationEpoch: outcome.presentationEpoch ?? undefined,
            groceryItems: outcome.rows,
            groceryState: outcome.checks,
          });
        } catch (error) {
          if (!currentEpoch()) return;
          // Unknown replies are read before any later queued intention. Never
          // automatically replay the failed mutation or restore a whole old map.
          try {
            const expectedPresentationEpoch = useWeekStore.getState().groceryPresentationEpoch;
            const snapshot = await getSchedule(weekOffset, reference, true);
            if (!currentEpoch()) return;
            if (
              snapshot &&
              useWeekStore
                .getState()
                .applyGrocerySnapshot(snapshot, { expectedPresentationEpoch }) &&
              currentEpoch()
            ) {
              const authoritative = snapshot.groceryItems?.find(
                (candidate) => candidate.rowId === id
              );
              if (authoritative?.rowVersion)
                rememberGroceryVersion(week, id, authoritative.rowVersion);
            }
          } catch {
            /* Keep the last confirmed state and an explicit row error. */
          }
          throw error;
        }
      });
    } catch (error) {
      console.error('Failed to save grocery state:', error);
      if (
        useWeekStore.getState().weekStartDate === week &&
        isLatestGroceryIntent(week, id, token)
      ) {
        setErrorItems((previous) => new Set(previous).add(id));
        setTimeout(
          () =>
            setErrorItems((previous) => {
              const next = new Set(previous);
              next.delete(id);
              return next;
            }),
          3000
        );
      }
    } finally {
      finishGroceryIntent(week, id, token);
      reconcile();
    }
  };

  return {
    groceryState,
    servingRefresh,
    refreshError,
    errorItems,
    dismissPortionsSummary,
    retryPortions,
    handleToggle,
  };
}
