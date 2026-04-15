'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useCapture } from '@/hooks/useCapture';
import { useHintTour } from '@/hooks/useHintTour';
import { getLocale } from '@/locales';

import { CameraView } from '@/components/capture/CameraView';
import { ImageReview } from '@/components/capture/ImageReview';
import { FinishedDishSelector } from '@/components/capture/FinishedDishSelector';
import { RatingSelector } from '@/components/capture/RatingSelector';
import { SubmitConfirmation } from '@/components/capture/SubmitConfirmation';
import { HintOverlay } from '@/components/hints/HintOverlay';
import { Button } from '@/components/ui/button';

import { ROUTES } from '@/lib/constants/routes';

type CaptureStep = 'camera' | 'review' | 'dish-photo' | 'rate' | 'done';

const STEP_LABELS: Record<Exclude<CaptureStep, 'done'>, string> = {
  camera: 'Step 1 of 4',
  review: 'Step 2 of 4',
  'dish-photo': 'Step 3 of 4',
  rate: 'Step 4 of 4',
};

const STEP_TITLES: Record<Exclude<CaptureStep, 'done'>, string> = {
  camera: 'Add Your First Recipe',
  review: 'Review Photos',
  'dish-photo': 'Select Dish Photo',
  rate: 'Rate & Save',
};

export default function CapturePage() {
  const locale = getLocale();
  const capture = useCapture();
  const tour = useHintTour('phase0-capture');

  const [step, setStep] = useState<CaptureStep>('camera');

  // Start the hint tour on first visit
  useEffect(() => {
    tour.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goBack() {
    if (step === 'review') setStep('camera');
    else if (step === 'dish-photo') setStep('review');
    else if (step === 'rate') setStep('dish-photo');
  }

  async function handleSubmit() {
    const id = await capture.submitRecipe();
    if (id) setStep('done');
  }

  function handleAddAnother() {
    capture.reset();
    setStep('camera');
  }

  const currentHint = tour.getCurrentHint();

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <>
        <SubmitConfirmation onAddAnother={handleAddAnother} />
        {currentHint && (
          <HintOverlay
            isActive={tour.isActive}
            step={currentHint}
            stepNumber={tour.currentStep}
            totalSteps={tour.totalSteps}
            onNext={tour.nextStep}
            onSkip={tour.skipTour}
            locale={locale}
          />
        )}
      </>
    );
  }

  // ── In-progress steps ─────────────────────────────────────────────────────
  const title = STEP_TITLES[step];
  const progress = STEP_LABELS[step];

  return (
    <>
      <div className="flex min-h-dvh flex-col bg-cream">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 pb-3 pt-safe-top">
          {step !== 'camera' ? (
            <button
              type="button"
              aria-label="Go back"
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-full text-sage-green hover:bg-sage-green/10 active:scale-95 transition-all"
            >
              ←
            </button>
          ) : (
            <Link
              href={ROUTES.HOME}
              aria-label="Cancel capture"
              className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal-400 hover:bg-sage-green/10 active:scale-95 transition-all"
            >
              ✕
            </Link>
          )}

          <div className="flex flex-1 flex-col">
            <h1 className="text-lg font-bold text-charcoal leading-tight">{title}</h1>
            <p className="text-xs text-charcoal-400">{progress}</p>
          </div>

          {/* Skip link — only on camera step */}
          {step === 'camera' && (
            <Link
              href={ROUTES.HOME}
              className="text-sm text-charcoal-400 underline underline-offset-2 hover:text-charcoal"
            >
              Skip
            </Link>
          )}
        </header>

        {/* Step indicator bar */}
        <div className="flex h-1 gap-1 px-4">
          {(['camera', 'review', 'dish-photo', 'rate'] as const).map((s) => (
            <div
              key={s}
              className={[
                'h-full flex-1 rounded-full transition-colors',
                s === step
                  ? 'bg-sage-green'
                  : ['review', 'dish-photo', 'rate'].indexOf(s) <
                      ['review', 'dish-photo', 'rate'].indexOf(step)
                    ? 'bg-sage-green/60'
                    : 'bg-sage-green/20',
              ].join(' ')}
            />
          ))}
        </div>

        {/* Main content */}
        <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
          {/* ── Step 1: Camera ── */}
          {step === 'camera' && (
            <>
              <CameraView onPhotoCapture={capture.addImage} />

              {capture.images.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-charcoal">
                      {capture.images.length === 1
                        ? '1 photo added'
                        : `${capture.images.length} photos added`}
                    </span>
                    <span className="text-xs text-charcoal-400">· tap to review</span>
                  </div>
                  <Button
                    data-hint="add-recipe"
                    variant="primary"
                    fullWidth
                    onClick={() => setStep('review')}
                  >
                    Review Photos →
                  </Button>
                </div>
              )}

              {capture.error && (
                <p className="text-sm text-terracotta">{capture.error}</p>
              )}
            </>
          )}

          {/* ── Step 2: Review ── */}
          {step === 'review' && (
            <>
              <ImageReview
                images={capture.images}
                onDelete={capture.removeImage}
                onSelect={capture.selectDishPhotoIndex}
              />

              {/* Add more photos */}
              <div className="flex flex-col gap-3">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setStep('camera')}
                >
                  + Add More Photos
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={capture.images.length === 0}
                  onClick={() => setStep('dish-photo')}
                >
                  Select Dish Photo →
                </Button>
              </div>

              {capture.error && (
                <p className="text-sm text-terracotta">{capture.error}</p>
              )}
            </>
          )}

          {/* ── Step 3: Dish photo selection ── */}
          {step === 'dish-photo' && (
            <>
              <FinishedDishSelector
                images={capture.images}
                selectedIndex={capture.selectedDishPhotoIndex}
                onSelect={capture.selectDishPhotoIndex}
              />

              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setStep('rate')}
                >
                  {capture.selectedDishPhotoIndex !== null ? 'Rate the Recipe →' : 'Skip & Rate →'}
                </Button>
              </div>
            </>
          )}

          {/* ── Step 4: Rate & submit ── */}
          {step === 'rate' && (
            <>
              <RatingSelector
                selectedRating={capture.rating}
                onSelect={capture.setRating}
              />

              {/* Submit */}
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  data-hint="save-recipe"
                  variant="primary"
                  fullWidth
                  size="lg"
                  isLoading={capture.isSubmitting}
                  disabled={capture.rating === null || capture.isSubmitting}
                  onClick={handleSubmit}
                >
                  Save Recipe
                </Button>

                {capture.error && (
                  <p className="text-sm text-terracotta text-center">{capture.error}</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Hint overlay — rendered at root so z-index stacks above everything */}
      {currentHint && (
        <HintOverlay
          isActive={tour.isActive}
          step={currentHint}
          stepNumber={tour.currentStep}
          totalSteps={tour.totalSteps}
          onNext={tour.nextStep}
          onSkip={tour.skipTour}
          locale={locale}
        />
      )}
    </>
  );
}
