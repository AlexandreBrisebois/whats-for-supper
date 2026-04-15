'use client';

import { useState, useCallback } from 'react';

import { createRecipe } from '@/lib/api/recipes';
import { validateImage, validateImageCount } from '@/lib/imageUtils';

export type CaptureRating = 0 | 1 | 2 | 3;

export interface UseCaptureReturn {
  images: File[];
  selectedDishPhotoIndex: number | null;
  rating: CaptureRating | null;
  isSubmitting: boolean;
  error: string | null;
  addImage: (file: File) => void;
  removeImage: (index: number) => void;
  selectDishPhotoIndex: (index: number) => void;
  setRating: (rating: CaptureRating) => void;
  submitRecipe: () => Promise<string | null>;
  reset: () => void;
  clearError: () => void;
}

export function useCapture(): UseCaptureReturn {
  const [images, setImages] = useState<File[]>([]);
  const [selectedDishPhotoIndex, setSelectedDishPhotoIndex] = useState<number | null>(null);
  const [rating, setRatingState] = useState<CaptureRating | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const addImage = useCallback((file: File) => {
    setError(null);
    const validation = validateImage(file);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid image.');
      return;
    }
    setImages((prev) => {
      const next = [...prev, file];
      const countValidation = validateImageCount(next.length);
      if (!countValidation.valid) {
        setError(countValidation.error ?? 'Too many images.');
        return prev;
      }
      return next;
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    // Adjust dish photo index if the removed image was selected or before it
    setSelectedDishPhotoIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const selectDishPhotoIndex = useCallback((index: number) => {
    setSelectedDishPhotoIndex(index);
  }, []);

  const setRating = useCallback((r: CaptureRating) => {
    setRatingState(r);
  }, []);

  const submitRecipe = useCallback(async (): Promise<string | null> => {
    setError(null);

    // Validate images
    const countValidation = validateImageCount(images.length);
    if (!countValidation.valid) {
      setError(countValidation.error ?? 'Please add at least one photo.');
      return null;
    }

    // Validate rating
    if (rating === null) {
      setError('Please rate the recipe before saving.');
      return null;
    }

    // Validate dish photo index
    const finishedDishImageIndex = selectedDishPhotoIndex ?? -1;
    if (finishedDishImageIndex !== -1 && (finishedDishImageIndex < 0 || finishedDishImageIndex >= images.length)) {
      setError('Invalid dish photo selection. Please try again.');
      return null;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append('files', img));
      formData.append('rating', String(rating));
      formData.append('finishedDishImageIndex', String(finishedDishImageIndex));

      const recipe = await createRecipe(formData);
      return recipe.id;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save recipe. Please try again.';
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [images, rating, selectedDishPhotoIndex]);

  const reset = useCallback(() => {
    setImages([]);
    setSelectedDishPhotoIndex(null);
    setRatingState(null);
    setError(null);
    setIsSubmitting(false);
  }, []);

  return {
    images,
    selectedDishPhotoIndex,
    rating,
    isSubmitting,
    error,
    addImage,
    removeImage,
    selectDishPhotoIndex,
    setRating,
    submitRecipe,
    reset,
    clearError,
  };
}
