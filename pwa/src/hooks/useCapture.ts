'use client';

import { useState, useCallback } from 'react';

import { createRecipe } from '@/lib/api/recipes';
import { validateImage, validateImageCount } from '@/lib/imageUtils';

export type CaptureRating = 0 | 1 | 2 | 3;

export interface UseCaptureReturn {
  images: File[];
  selectedDishPhotoIndex: number | null;
  rating: CaptureRating;
  notes: string;
  isSubmitting: boolean;
  error: string | null;
  addImage: (file: File) => void;
  removeImage: (index: number) => void;
  setSelectedDishPhotoIndex: (index: number | null) => void;
  setNotes: (notes: string) => void;
  setRating: (rating: CaptureRating) => void;
  submitRecipe: () => Promise<string | null>;
  reset: () => void;
  clearError: () => void;
}

export function useCapture(): UseCaptureReturn {
  const [images, setImages] = useState<File[]>([]);
  const [selectedDishPhotoIndex, setSelectedDishPhotoIndex] = useState<number | null>(null);
  const [rating, setRatingState] = useState<CaptureRating>(0); // Default to Unknown
  const [notes, setNotesState] = useState<string>('');
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
      // Auto-set first photo as finished dish if it's the first image
      if (prev.length === 0) {
        setSelectedDishPhotoIndex(0);
      }
      return next;
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    let newImages: File[] = [];
    setImages((prev) => {
      newImages = prev.filter((_, i) => i !== index);
      return newImages;
    });

    setSelectedDishPhotoIndex((prev) => {
      if (newImages.length === 0) return null;
      if (prev === null) return 0;

      // If we're deleting the selected image, default to the first image
      if (index === prev) {
        return 0;
      }

      // If we're deleting an image before the selected one, shift the index back
      if (index < prev) {
        return prev - 1;
      }

      // If we're deleting an image after the selected one, keep it as is
      // But ensure it's within bounds
      return Math.min(prev, newImages.length - 1);
    });
  }, []);

  const setSelectedDishPhotoIndexFn = useCallback((index: number | null) => {
    setSelectedDishPhotoIndex((prev) => (prev === index ? null : index));
  }, []);

  const setNotes = useCallback((newNotes: string) => {
    setNotesState(newNotes);
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

    // Validate dish photo index
    const finishedDishImageIndex = selectedDishPhotoIndex ?? -1;
    if (
      finishedDishImageIndex !== -1 &&
      (finishedDishImageIndex < 0 || finishedDishImageIndex >= images.length)
    ) {
      setError('Invalid dish photo selection. Please try again.');
      return null;
    }

    // Validate rating (0-3: Unknown, Dislike, Like, Love)
    if (rating < 0 || rating > 3) {
      setError('Invalid rating. Please select a value between 0 and 3.');
      return null;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append('files', img));
      formData.append('rating', String(rating));
      formData.append('finishedDishImageIndex', String(finishedDishImageIndex));
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      const result = await createRecipe(formData);
      return result.id;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to save recipe. Please try again.';
      setError(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [images, rating, selectedDishPhotoIndex, notes]);

  const reset = useCallback(() => {
    setImages([]);
    setSelectedDishPhotoIndex(null);
    setRatingState(0); // Reset to Unknown
    setNotesState('');
    setError(null);
    setIsSubmitting(false);
  }, []);

  return {
    images,
    selectedDishPhotoIndex,
    rating,
    notes,
    isSubmitting,
    error,
    addImage,
    removeImage,
    setSelectedDishPhotoIndex: setSelectedDishPhotoIndexFn,
    setNotes,
    setRating,
    submitRecipe,
    reset,
    clearError,
  };
}
