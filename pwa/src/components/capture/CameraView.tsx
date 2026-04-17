'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

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
    [onPhotoCapture]
  );

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Validation error */}
      {captureError && (
        <p className="text-xs font-semibold text-pink animate-in zoom-in-95">{captureError}</p>
      )}

      {/* Controls: Balanced Pro Layout */}
      <div className="flex w-full items-center justify-center gap-12 px-8">
        {/* Gallery Action */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label="Select from gallery"
            onClick={() => galleryInputRef.current?.click()}
            className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-white/40 text-indigo shadow-glass ring-1 ring-indigo/10 backdrop-blur-xl transition-all hover:bg-white/60 active:scale-90"
          >
            <ImageIcon
              size={24}
              strokeWidth={1.5}
              className="transition-transform group-hover:scale-110"
            />
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-300 opacity-60">
            Library
          </span>
        </div>

        {/* Shutter: Main Action */}
        <div className="relative flex items-center justify-center">
          {/* Shutter Ring */}
          <div className="absolute h-24 w-24 rounded-full border-2 border-indigo/20 animate-pulse" />

          <button
            type="button"
            aria-label="Take photo"
            onClick={() => cameraInputRef.current?.click()}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-indigo to-indigo-400 text-white shadow-[0_10px_25px_rgba(79,70,229,0.4)] ring-4 ring-white transition-all hover:scale-105 active:scale-90"
          >
            <Camera size={32} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        onChange={handleFileChange}
      />
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
