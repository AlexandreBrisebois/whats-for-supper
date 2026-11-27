'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuickCaptureTrigger } from './HomeSections';
import { CaptureActivityBar } from './CaptureActivityBar';
import { TonightMenuCard } from './TonightMenuCard';
import { TonightPivotCard } from './TonightPivotCard';
import { SolarLoader } from '../ui/SolarLoader';
import { useTodayStore } from '@/store/todayStore';
import { t } from '@/locales';
import { nonCookingLabel } from '@/lib/planner/nonCooking';
import { HomeCommandOverlays } from './command-center/HomeCommandOverlays';
import { HomeCookedStatusSection } from './command-center/HomeCookedStatusSection';
import { SavedNonCookingPlanCard } from './command-center/SavedNonCookingPlanCard';
import type { HomeCommandCenterProps } from './command-center/types';
import { useHomeTonightActions } from './command-center/useHomeTonightActions';
import { useTonightRecoveryFlow } from './command-center/useTonightRecoveryFlow';

export function HomeCommandCenter({ todaysRecipe, todayStatus }: HomeCommandCenterProps) {
  void todaysRecipe;
  void todayStatus;

  const router = useRouter();
  const [retryStart, setRetryStart] = useState<(() => void) | null>(null);

  // ── Domain state from todayStore ──────────────────────────────────────────
  // NOTE: init() is intentionally excluded here — TodayStoreInitializer is the sole initialiser.
  const {
    calendar,
    calendarError,
    currentRecipe,
    occurrenceId,
    preparation,
    status,
    nonCooking,
    isLoading,
    assignRecipe,
    saveRecoveryRecipe,
    markOrderedIn,
    sync,
  } = useTodayStore();

  const isCooked = status === 2;
  const isSkipped = status === 3;
  const sessionDone = status === 2 || status === 3;
  const isMysteryNight = isSkipped && nonCooking?.kind === 'mystery';
  const showSupperChoices = !currentRecipe && !isCooked && (!sessionDone || isMysteryNight);

  const recovery = useTonightRecoveryFlow({
    router,
    currentRecipe,
    assignRecipe,
    saveRecoveryRecipe,
    markOrderedIn,
    sync,
    setRetryStart,
  });

  const tonightActions = useHomeTonightActions({
    router,
    calendar,
    currentRecipe,
    nonCooking,
    isMysteryNight,
    assignRecipe,
    markOrderedIn,
    sync,
    startAction: recovery.startAction,
    setRetryStart,
  });

  return (
    <div className="flex flex-col gap-5 pt-3 pb-12 max-w-[27rem] mx-auto w-full px-4 sm:gap-8 sm:px-0 sm:pt-4 sm:max-w-sm">
      {tonightActions.takeOutError && (
        <div
          role="alert"
          data-testid="take-out-save-error"
          className="rounded-2xl bg-cream border border-hearth-line p-4 text-base text-ink-body"
        >
          <p>{t('planner.nonCookingSaveError', 'Could not save this plan. Try again.')}</p>
          <button
            onClick={() => void tonightActions.replaceMysteryWithTakeOut()}
            className="mt-2 min-h-12 px-3 font-semibold text-hearth-ink focus-visible:outline-2 focus-visible:outline-ink-body"
          >
            {t('errors.tryAgain', 'Try again')}
          </button>
        </div>
      )}
      {calendarError && (
        <div
          role="alert"
          className="rounded-2xl bg-terracotta/10 border border-hearth-line p-4 text-sm text-ink-body"
        >
          <p>{calendarError}</p>
          <button
            className="mt-2 min-h-11 font-bold text-hearth-ink focus-visible:outline-2 focus-visible:outline-ink-body"
            onClick={() =>
              retryStart ? retryStart() : useTodayStore.getState().retryCalendarAction()
            }
          >
            Try again
          </button>
        </div>
      )}
      <QuickCaptureTrigger />
      <CaptureActivityBar />
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20" data-testid="home-loader">
          <SolarLoader label={t('home.aligningDay', 'Aligning your day...')} />
        </div>
      ) : (
        <>
          {isSkipped && !isMysteryNight && !currentRecipe && (
            <SavedNonCookingPlanCard
              nonCooking={nonCooking}
              onEditPlan={tonightActions.handleEditNonCookingPlan}
            />
          )}
          {showSupperChoices && (
            <TonightPivotCard
              actionPending={tonightActions.takeOutPending}
              hasCheckedActive={tonightActions.hasCheckedActive}
              gotoDescription={tonightActions.gotoDescription}
              gotoRecipeId={tonightActions.gotoRecipeId}
              gotoImageUrl={tonightActions.gotoImageUrl}
              gotoStatus={tonightActions.gotoStatus}
              nonCookingLabel={isMysteryNight ? nonCookingLabel(nonCooking) : null}
              nonCookingKind={isMysteryNight ? nonCooking?.kind : null}
              onConfirmGoto={tonightActions.handleConfirmGoto}
              onDiscover={tonightActions.handleDiscover}
              onOrderIn={tonightActions.handleOrderIn}
            />
          )}

          <HomeCookedStatusSection
            isCooked={isCooked}
            preparation={preparation}
            cookedDismissed={tonightActions.cookedDismissed}
            onCookMode={tonightActions.handleCookMode}
            onDismissCelebration={tonightActions.dismissCookedCelebration}
          />

          {currentRecipe &&
            currentRecipe.id &&
            currentRecipe.name &&
            !isSkipped &&
            !isCooked &&
            !sessionDone && (
              <TonightMenuCard
                recipeId={currentRecipe.id}
                recipeName={currentRecipe.name}
                description={
                  currentRecipe.description ||
                  t('home.defaultDescription', 'A delicious meal planned for tonight.')
                }
                imageUrl={currentRecipe.image || undefined}
                ingredients={currentRecipe.ingredients || []}
                ingredientContext={
                  calendar && occurrenceId
                    ? {
                        context: 'assigned',
                        supperDate: calendar.today,
                        occurrenceId,
                      }
                    : null
                }
                totalTime={currentRecipe.totalTime || undefined}
                onCookMode={tonightActions.handleCookMode}
                onSkip={recovery.handleSkipTrigger}
              />
            )}
        </>
      )}

      <HomeCommandOverlays
        showCooksMode={tonightActions.showCooksMode}
        cookingContext={tonightActions.cookingContext}
        cookingRecipe={tonightActions.cookingRecipe}
        onCloseCooksMode={tonightActions.closeCooksMode}
        showRecovery={recovery.showRecovery}
        recoveryPending={recovery.recoveryPending}
        recoveryStep={recovery.recoveryStep}
        backupIntent={recovery.backupIntent}
        recoverySource={recovery.recoverySource}
        replacementFeedback={recovery.replacementFeedback}
        searchError={recovery.searchError}
        onRetrySearch={recovery.onRetrySearch}
        onRetryReplacement={recovery.onRetryReplacement}
        confirmAbandon={recovery.confirmAbandon}
        onCancelAbandon={recovery.onCancelAbandon}
        onAbandon={recovery.onAbandon}
        onReviewPlan={recovery.onReviewPlan}
        onChooseAnotherDay={recovery.onChooseAnotherDay}
        onCloseRecovery={recovery.onCloseRecovery}
        onBack={recovery.onBack}
        onCustomPlan={recovery.onCustomPlan}
        onAction={recovery.onAction}
        showQuickFind={recovery.showQuickFind}
        actionContext={recovery.actionContext}
        onCloseQuickFind={recovery.onCloseQuickFind}
        onSelectQuickFind={recovery.onSelectQuickFind}
        dayChooserState={recovery.dayChooserState}
        onCloseDayChooser={recovery.onCloseDayChooser}
        onSelectDayChooserSlot={recovery.onSelectDayChooserSlot}
      />
    </div>
  );
}
