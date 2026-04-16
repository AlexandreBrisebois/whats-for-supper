'use client';

import { useRef, useState, useCallback } from 'react';

import { validateImage } from '@/lib/imageUtils';

interface CameraViewProps {
  onPhotoCapture: (file: File) => void;
}

export function CameraView({ onPhotoCapture }: CameraViewProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) {
        const validation = validateImage(file);
        if (!validation.valid) {
          setCaptureError(validation.error ?? 'Invalid image.');
          continue;
        }
        setCaptureError(null);
        onPhotoCapture(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [onPhotoCapture],
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Validation error */}
      {captureError && (
        <p className="text-sm text-pink">{captureError}</p>
      )}

      {/* Controls row */}
      <div className="flex w-full items-center justify-center gap-6">
        {/* Gallery / file picker */}
        <button
          type="button"
          aria-label="Select from gallery"
          onClick={() => galleryInputRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lavender text-2xl shadow-card transition-transform active:scale-95"
        >
          🖼️
        </button>

        {/* Camera capture button */}
        <button
          type="button"
          aria-label="Take photo"
          onClick={() => cameraInputRef.current?.click()}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo shadow-card transition-transform active:scale-95"
        >
          <span className="h-14 w-14 rounded-full border-4 border-lavender bg-transparent" />
        </button>

        {/* Spacer keeps shutter centred */}
        <div className="h-12 w-12" aria-hidden />
      </div>

      {/* Camera input - capture from device camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />

      {/* Gallery input - select from device photos */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />
    </div>
  );
}
