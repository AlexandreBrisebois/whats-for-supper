'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

import { validateImage } from '@/lib/imageUtils';

interface CameraViewProps {
  onPhotoCapture: (file: File) => void;
}

type CameraState = 'initializing' | 'active' | 'denied' | 'unavailable';

export function CameraView({ onPhotoCapture }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [lastPreviewUrl, setLastPreviewUrl] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState('active');
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied');
      } else {
        setCameraState('unavailable');
      }
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  // Revoke preview object URL on unmount
  useEffect(() => {
    return () => {
      if (lastPreviewUrl) URL.revokeObjectURL(lastPreviewUrl);
    };
  }, [lastPreviewUrl]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || cameraState !== 'active') return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const validation = validateImage(file);
        if (!validation.valid) {
          setCaptureError(validation.error ?? 'Invalid image.');
          return;
        }
        setCaptureError(null);
        if (lastPreviewUrl) URL.revokeObjectURL(lastPreviewUrl);
        setLastPreviewUrl(URL.createObjectURL(file));
        onPhotoCapture(file);
      },
      'image/jpeg',
      0.92,
    );
  }, [cameraState, lastPreviewUrl, onPhotoCapture]);

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
        if (lastPreviewUrl) URL.revokeObjectURL(lastPreviewUrl);
        setLastPreviewUrl(URL.createObjectURL(file));
        onPhotoCapture(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [lastPreviewUrl, onPhotoCapture],
  );

  const showFallbackOnly = cameraState === 'denied' || cameraState === 'unavailable';

  return (
    <div className="flex flex-col items-center gap-4" data-hint="camera-input">
      {/* Live camera feed or placeholder */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-charcoal" style={{ aspectRatio: '4/3', maxHeight: '60dvh' }}>
        {!showFallbackOnly && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ display: cameraState === 'active' ? 'block' : 'none' }}
          />
        )}

        {cameraState === 'initializing' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-cream/70">Starting camera…</span>
          </div>
        )}

        {cameraState === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="text-3xl">📷</span>
            <p className="text-sm font-medium text-cream">Camera access denied</p>
            <p className="text-xs text-cream/60">
              Enable camera in your browser settings, or use the gallery button below to select photos.
            </p>
          </div>
        )}

        {cameraState === 'unavailable' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="text-3xl">📁</span>
            <p className="text-sm font-medium text-cream">No camera found</p>
            <p className="text-xs text-cream/60">
              Use the gallery button below to select photos from your device.
            </p>
          </div>
        )}

        {/* Last-captured thumbnail overlay */}
        {lastPreviewUrl && (
          <div className="absolute bottom-2 right-2 h-14 w-14 overflow-hidden rounded-xl border-2 border-cream shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lastPreviewUrl} alt="Last captured" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {/* Validation error */}
      {captureError && (
        <p className="text-sm text-terracotta">{captureError}</p>
      )}

      {/* Controls row */}
      <div className="flex w-full items-center justify-center gap-6">
        {/* Gallery / file picker */}
        <button
          type="button"
          aria-label="Select from gallery"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-2xl shadow-card transition-transform active:scale-95"
        >
          🖼️
        </button>

        {/* Capture shutter */}
        {!showFallbackOnly && (
          <button
            type="button"
            aria-label="Take photo"
            onClick={captureFrame}
            disabled={cameraState !== 'active'}
            className={[
              'flex h-20 w-20 items-center justify-center rounded-full shadow-card transition-transform active:scale-95',
              cameraState === 'active'
                ? 'bg-sage-green'
                : 'bg-sage-green/40 cursor-not-allowed',
            ].join(' ')}
          >
            <span className="h-14 w-14 rounded-full border-4 border-cream bg-transparent" />
          </button>
        )}

        {/* Spacer keeps shutter centred when shown */}
        {!showFallbackOnly && <div className="h-12 w-12" aria-hidden />}
      </div>

      {showFallbackOnly && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl bg-sage-green px-6 py-4 text-base font-semibold text-cream transition-opacity hover:opacity-90 active:scale-95"
        >
          Choose Photos
        </button>
      )}

      <input
        ref={fileInputRef}
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
