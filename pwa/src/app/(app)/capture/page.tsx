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
    <div className="flex min-h-dvh flex-col bg-lavender">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pb-3 pt-safe-top">
        <Link
          href={ROUTES.HOME}
          aria-label="Cancel capture"
          className="flex h-10 w-10 items-center justify-center rounded-full text-charcoal-400 hover:bg-indigo/10 active:scale-95 transition-all"
        >
          ✕
        </Link>

        <div className="flex flex-1 flex-col">
          <h1 className="text-lg font-bold text-charcoal leading-tight">Add a Recipe</h1>
          <p className="text-xs text-charcoal-400">
            {hasPhotos ? `${capture.images.length} photo${capture.images.length === 1 ? '' : 's'}` : 'Tap to add photos'}
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        {/* Camera & Photos Section */}
        <div className="flex flex-col gap-4">
          <CameraView onPhotoCapture={capture.addImage} />

          {hasPhotos && (
            <ImageReview
              images={capture.images}
              onDelete={capture.removeImage}
              finishedDishIndex={capture.selectedDishPhotoIndex}
            />
          )}
        </div>

        {/* Rating Section */}
        <div className="flex flex-col gap-4">
          <RatingSelector
            selectedRating={capture.rating}
            onSelect={capture.setRating}
          />
        </div>

        {/* Notes Section */}
        <div className="flex flex-col gap-4">
          <NotesField
            value={capture.notes}
            onChange={capture.setNotes}
          />
        </div>

        {/* Error message */}
        {capture.error && (
          <p className="text-sm text-pink">{capture.error}</p>
        )}

        {/* Submit Section */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            isLoading={capture.isSubmitting}
            disabled={!hasPhotos || capture.isSubmitting}
            onClick={handleSubmit}
          >
            Save Recipe
          </Button>
        </div>
      </main>
    </div>
  );
}
