'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { usePlannerDrag } from '@/components/planner/usePlannerDrag';
import { useSupperServingsEditor } from '@/components/planner/useSupperServingsEditor';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { calendarAnchorIsFresh, readCalendar } from '@/lib/deployment-calendar';
import { usePlannerOverlay } from '@/lib/planner/plannerOverlay';
import { portionsReturnPath } from '@/lib/planner/portionsNavigation';
import { usePlanningConfirmation } from '@/lib/planner/usePlanningConfirmation';
import { usePlannerStore } from '@/store/plannerStore';
import { useTodayStore } from '@/store/todayStore';
import { useWeekStore } from '@/store/weekStore';
import { PlannerConfirmationBanner, PlannerHeader } from './_components/PlannerHeader';
import { PlannerOverlays } from './_components/PlannerOverlays';
import { PlannerWeekPanel } from './_components/PlannerWeekPanel';
import { usePlannerCalendarAndQuery } from './_components/usePlannerCalendarAndQuery';
import { usePlannerReplacementActions } from './_components/usePlannerReplacementActions';
import { usePlannerSlotActions } from './_components/usePlannerSlotActions';

export default function PlannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWide = useMediaQuery('(min-width: 1024px)');
  const { currentWeekOffset, activeTab, setWeekOffset, setActiveTab } = usePlannerStore();

  const schedule = useWeekStore((s) => s.schedule);
  const weekCalendarReference = useWeekStore((s) => s.calendar?.referenceWeekStartDate);
  const isLoading = useWeekStore((s) => s.isLoading);
  const status = useWeekStore((s) => s.status);
  const weekStartDate = useWeekStore((s) => s.weekStartDate);
  const votingRoundId = useWeekStore((s) => s.votingRoundId);
  const groceryItems = useWeekStore((s) => s.groceryItems);
  const groceryExtras = useWeekStore((s) => s.groceryExtras);

  const calendar = useTodayStore((s) => s.calendar);
  const calendarAnchor = useTodayStore((s) => s.calendarAnchor);
  const snapshotToday = calendarAnchorIsFresh(calendarAnchor)
    ? (readCalendar(calendar)?.today ?? null)
    : null;

  const planDate = searchParams.get('planDate');
  const referenceWeekStartDate = searchParams.get('referenceWeekStartDate') ?? undefined;
  const portionReturn = portionsReturnPath(searchParams.get('returnTo'));

  const {
    overlay,
    openPivot,
    openQuickFind,
    openNonCooking,
    backToPivot,
    openCookedDefer,
    setCookedDeferSubmitting,
    openNudge,
    openDetail,
    openReplaceRecovery,
    openChooseDay,
    openNonCookingReplacement,
    close: closeOverlay,
    closeIfCurrent,
  } = usePlannerOverlay();

  const {
    editing: portionsEditing,
    strip: portionsStrip,
    rows: portionsRows,
    requestDeparture: requestPortionsDeparture,
    open: openPortions,
  } = useSupperServingsEditor(
    currentWeekOffset,
    referenceWeekStartDate,
    schedule,
    portionReturn ? () => router.replace(portionReturn) : undefined,
    snapshotToday
  );

  const {
    authoritativeToday,
    calendarVersion,
    isVotingOpen,
    isConvergedWeek,
    hasPendingSuggestions,
    canOpenVoting,
    prevOffset,
    reviewDay,
    reviewFading,
    clearConsumedReviewTarget,
    navigateToWeekOffset,
    handlePrevWeek,
    handleNextWeek,
  } = usePlannerCalendarAndQuery({
    currentWeekOffset,
    setWeekOffset,
    setActiveTab,
    schedule,
    weekCalendarReference,
    isLoading,
    status,
    weekStartDate,
    votingRoundId,
    planDate,
    referenceWeekStartDate,
    searchParams,
    router,
    openPivot,
    openDetail,
    openPortions,
    requestPortionsDeparture,
  });

  const { preview: dragPreview, start: startDrag } = usePlannerDrag(currentWeekOffset, activeTab);

  const {
    visibleConfirmation,
    pendingResult,
    successDay,
    successFading,
    retry: retryConfirmation,
    dismiss: dismissConfirmation,
  } = usePlanningConfirmation({
    searchParams,
    currentWeekOffset,
    referenceWeekStartDate,
    router,
  });

  const pivotDayIndex = overlay.kind === 'pivot' ? overlay.dayIndex : null;
  const quickFindDayIndex = overlay.kind === 'quickFind' ? overlay.dayIndex : null;
  const pendingRecovery = overlay.kind === 'replaceRecovery' ? overlay : null;

  const {
    showSuccess,
    handleCloseVoting,
    closeNudgeDialog,
    closeQuickFind,
    handleQuickFindSelect,
    handleSearchPath,
    handleAskFamily,
    handleRemoveRecipe,
    executePlanLater,
    handlePlanLater,
  } = usePlannerSlotActions({
    currentWeekOffset,
    referenceWeekStartDate,
    schedule,
    pivotDayIndex,
    quickFindDayIndex,
    openReplaceRecovery,
    openCookedDefer,
    closeOverlay,
    closeIfCurrent,
    router,
  });

  const { recovery, handleChooseDaySelect } = usePlannerReplacementActions({
    pendingRecovery,
    referenceWeekStartDate,
    clearConsumedReviewTarget,
    openDetail,
    openChooseDay,
    openNonCookingReplacement,
    openReplaceRecovery,
    closeIfCurrent,
    router,
  });

  return (
    <div className="flex flex-col cookbook-bg pb-6">
      {/* Animated Blobs */}
      <div className="blob blob-terracotta -top-20 -left-20 animate-[pulse_8s_infinite]" />
      <div className="blob blob-sage top-1/2 -right-40 animate-[pulse_10s_infinite] [animation-delay:1s]" />
      <div className="blob blob-ochre -bottom-20 left-1/4 animate-[pulse_12s_infinite] [animation-delay:2s]" />

      <PlannerHeader
        isWide={isWide}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        requestPortionsDeparture={requestPortionsDeparture}
        currentWeekOffset={currentWeekOffset}
        schedule={schedule}
        isVotingOpen={isVotingOpen}
        isConvergedWeek={isConvergedWeek}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onNavigateToWeekOffset={navigateToWeekOffset}
      />

      <PlannerConfirmationBanner
        isWide={isWide}
        visibleConfirmation={visibleConfirmation}
        onRetry={retryConfirmation}
        onDismiss={dismissConfirmation}
      />

      <PlannerWeekPanel
        isWide={isWide}
        isLoading={isLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentWeekOffset={currentWeekOffset}
        prevOffset={prevOffset}
        schedule={schedule}
        groceryItems={groceryItems}
        groceryExtras={groceryExtras}
        portionsEditing={portionsEditing}
        portionsStrip={portionsStrip}
        portionsRows={portionsRows}
        isVotingOpen={isVotingOpen}
        canOpenVoting={canOpenVoting}
        isConvergedWeek={isConvergedWeek}
        hasPendingSuggestions={hasPendingSuggestions}
        onAskFamily={handleAskFamily}
        onNudgeFamily={openNudge}
        onCloseVoting={handleCloseVoting}
        hasPendingResult={Boolean(pendingResult)}
        successDay={successDay}
        successFading={successFading}
        reviewDay={reviewDay}
        reviewFading={reviewFading}
        onOpenPivot={openPivot}
        onOpenDetail={openDetail}
        dragPreview={dragPreview}
        startDrag={startDrag}
        authoritativeToday={authoritativeToday}
        showSuccess={showSuccess}
      />

      <PlannerOverlays
        overlay={overlay}
        currentWeekOffset={currentWeekOffset}
        referenceWeekStartDate={referenceWeekStartDate}
        schedule={schedule}
        calendarVersion={calendarVersion}
        router={router}
        openQuickFind={openQuickFind}
        openNonCooking={openNonCooking}
        backToPivot={backToPivot}
        setCookedDeferSubmitting={setCookedDeferSubmitting}
        openChooseDay={openChooseDay}
        closeOverlay={closeOverlay}
        closeIfCurrent={closeIfCurrent}
        closeNudgeDialog={closeNudgeDialog}
        closeQuickFind={closeQuickFind}
        onQuickFindSelect={handleQuickFindSelect}
        onSearchLibrary={handleSearchPath}
        onRemoveRecipe={handleRemoveRecipe}
        onPlanLater={handlePlanLater}
        onExecutePlanLater={executePlanLater}
        onChooseDaySelect={handleChooseDaySelect}
        recovery={recovery}
      />
    </div>
  );
}
