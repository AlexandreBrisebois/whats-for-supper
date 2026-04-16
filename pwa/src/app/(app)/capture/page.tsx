'use client';

import { useState } from 'react';
import Link from 'next/link';

import { useCapture } from '@/hooks/useCapture';

import { CameraView } from '@/components/capture/CameraView';
import { ImageReview } from '@/components/capture/ImageReview';
import { RatingSelector } from '@/components/capture/RatingSelector';
import { NotesField } from '@/components/capture/NotesField';
import { SubmitConfirmation } from '@/components/capture/SubmitConfirmation';
import { Button } from '@/components/ui/button';

import { ROUTES } from '@/lib/constants/routes';

export default function CapturePage() {
  const capture = useCapture();
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit() {
    const id = await capture.submitRecipe();
    if (id) setIsSubmitted(true);
  }

  function handleAddAnother() {
    capture.reset();
    setIsSubmitted(false);
  }

  // Show success screen
  if (isSubmitted) {
    return <SubmitConfirmation onAddAnother={handleAddAnother} />;
  }

  const hasPhotos = capture.images.length > 0;

  return (
    <div className="relative flex min-h-dvh flex-col bg-lavender overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.05),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(219,39,119,0.03),transparent_40%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 flex justify-center items-center px-4 pb-5 pt-[calc(env(safe-area-inset-top)+1rem)] bg-lavender/80 backdrop-blur-md border-b border-indigo/5">
        <Link
          href={ROUTES.HOME}
          aria-label="Cancel capture"
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full text-charcoal-300 hover:bg-indigo/5 active:scale-95 transition-all"
        >
          ✕
        </Link>

        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-lg font-bold text-charcoal tracking-tight">Add a Recipe</h1>
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-indigo/60">
            {hasPhotos ? `${capture.images.length} photo${capture.images.length === 1 ? '' : 's'}` : 'New Entry'}
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex flex-1 flex-col gap-8 px-4 py-8 safe-bottom">
        {/* Capture Area: Integrated Camera & Review */}
        <div className="flex flex-col gap-8 rounded-[2.5rem] bg-indigo/[0.02] border border-indigo/5 p-2 shadow-sm transition-all">
          <CameraView onPhotoCapture={capture.addImage} />

          {hasPhotos && (
            <div className="px-2 pb-2">
              <ImageReview
                images={capture.images}
                onDelete={capture.removeImage}
                finishedDishIndex={capture.selectedDishPhotoIndex}
                onSetFinishedDish={capture.setSelectedDishPhotoIndex}
              />
            </div>
          )}
        </div>

        {/* Details Area */}
        <div className="flex flex-col gap-10">
          {/* Rating Section */}
          <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <RatingSelector
              selectedRating={capture.rating}
              onSelect={capture.setRating}
            />
          </section>

          {/* Notes Section */}
          <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-indigo/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-200">Optional Notes</span>
              <div className="h-px flex-1 bg-indigo/10" />
            </div>
            <NotesField
              value={capture.notes}
              onChange={capture.setNotes}
            />
          </section>
        </div>

        {/* Error message */}
        {capture.error && (
          <p className="px-2 text-center text-sm font-medium text-pink animate-in zoom-in-95 duration-300">{capture.error}</p>
        )}

        {/* Action Bar: Appears only when photos are taken */}
        {hasPhotos && (
          <div className="sticky bottom-4 z-40 mt-auto pt-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              isLoading={capture.isSubmitting}
              className="shadow-[0_8px_30px_rgb(79,70,229,0.3)] hover:shadow-[0_12px_40px_rgb(79,70,229,0.4)] transition-all scale-100 hover:scale-[1.02] active:scale-95 py-5 rounded-3xl"
              onClick={handleSubmit}
            >
              Save Recipe
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
