'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  X,
  Star,
  PenLine,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { useCapture } from '@/hooks/useCapture';
import { useFamilyStore } from '@/store/familyStore';
import { useCaptureStore } from '@/store/captureStore';
import { useLibraryStore } from '@/store/libraryStore';
import { apiClient } from '@/lib/api/api-client';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';
import { normalizeGotos } from '@/lib/gotoUtils';
import { t, tWithVars } from '@/locales';
import type { GoToListDto, GoToItem } from '@/lib/api/generated/models/index';

const PHOTO_UPLOAD_OVERLAY_DELAY_MS = 800;

interface MinimalCaptureProps {
  /** When 'goto', wires the post-save saveSetting call */
  intent?: string;
  /** When 'describe', skips the camera box and opens the describe form directly */
  mode?: string;
  /** URL passed from server component searchParams (more reliable than useSearchParams for initial load) */
  initialUrl?: string;
  /** Title passed from server component searchParams */
  initialTitle?: string;
  /** Text passed from server component searchParams */
  initialText?: string;
}

function extractUrl(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

export default function MinimalCapture({
  intent,
  mode,
  initialUrl,
  initialTitle,
  initialText,
}: MinimalCaptureProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familySettings = useFamilyStore((state) => state.familySettings);
  const loadGoTo = useFamilyStore((state) => state.loadGoTo);
  const saveGoTo = useFamilyStore((state) => state.saveGoTo);
  const {
    images,
    addImage,
    removeImage,
    isSubmitting,
    submitRecipe,
    submitUrl,
    clearError,
    error,
    rating,
    setRating,
    notes,
    setNotes,
    selectedDishPhotoIndex,
    setSelectedDishPhotoIndex,
  } = useCapture();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const saveAreaRef = useRef<HTMLDivElement>(null);
  const photoSubmitLockRef = useRef(false);
  const photoUploadOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared content from manifest or props
  const sharedUrl = initialUrl || searchParams.get('url');
  const sharedText = initialText || searchParams.get('text');
  const sharedTitle = initialTitle || searchParams.get('title');

  // If no direct URL, try to extract one from text
  const extractedUrl = sharedUrl || extractUrl(sharedText);

  // URL-capture specific state
  const [isUrlCapturing, setIsUrlCapturing] = useState(false);
  const [urlCaptureError, setUrlCaptureError] = useState<string | null>(null);
  const [wasUrlCaptured, setWasUrlCaptured] = useState(false);
  const [wasPhotoCaptured, setWasPhotoCaptured] = useState(false);
  const [wasDescribeCaptured, setWasDescribeCaptured] = useState(false);

  // Describe-it form state
  const [describeName, setDescribeName] = useState('');
  const [describeText, setDescribeText] = useState('');
  const [isDescribing, setIsDescribing] = useState(false);
  const [describeError, setDescribeError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(extractedUrl || '');
  const [isPhotoSubmitPending, setIsPhotoSubmitPending] = useState(false);
  const [showPhotoUploadOverlay, setShowPhotoUploadOverlay] = useState(false);

  const [onSuccess, setOnSuccess] = useState(false);
  const [showDescribe, setShowDescribe] = useState(mode === 'describe');
  const [showUrlReview, setShowUrlReview] = useState(!!extractedUrl);
  const [isDragging, setIsDragging] = useState(false);

  // Track the pending recipe ID so we can detect when SSE recipe_ready fires
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  // When SSE recipe_ready fires while user is still on this screen, transition to ready state
  const [readyRecipeName, setReadyRecipeName] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);

  const isGoto = intent === 'goto';

  useEffect(() => {
    if (isGoto) {
      loadGoTo();
    }
  }, [isGoto, loadGoTo]);

  // Subscribe to libraryStore notifications — detect when our pending recipe becomes ready
  useEffect(() => {
    if (!pendingRecipeId) return;

    // We use a manual subscription here to avoid the "set-state-in-effect" lint error.
    // This allows us to react to store changes and update local state outside the render cycle.
    const unsubscribe = useLibraryStore.subscribe((state) => {
      const notification = state.notifications.find(
        (n) => n.recipeId === pendingRecipeId && n.type === 'ready'
      );
      if (notification) {
        setReadyRecipeName(notification.name);
        // Dismiss from the global queue — we're handling it inline on this screen
        useLibraryStore.getState().dismissNotification(pendingRecipeId);
      }
    });

    return unsubscribe;
  }, [pendingRecipeId]);

  useEffect(() => {
    if (images.length > 0) {
      const timer = setTimeout(() => {
        saveAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [images.length]);

  useEffect(() => {
    if (!isPhotoSubmitPending) {
      if (photoUploadOverlayTimerRef.current) {
        clearTimeout(photoUploadOverlayTimerRef.current);
        photoUploadOverlayTimerRef.current = null;
      }
      return;
    }

    photoUploadOverlayTimerRef.current = setTimeout(() => {
      setShowPhotoUploadOverlay(true);
      photoUploadOverlayTimerRef.current = null;
    }, PHOTO_UPLOAD_OVERLAY_DELAY_MS);

    return () => {
      if (photoUploadOverlayTimerRef.current) {
        clearTimeout(photoUploadOverlayTimerRef.current);
        photoUploadOverlayTimerRef.current = null;
      }
    };
  }, [isPhotoSubmitPending]);

  // Auto-redirect home after 10 seconds on success screen (Queued state)
  useEffect(() => {
    if (onSuccess && !readyRecipeName && countdown !== null) {
      const interval = setInterval(() => {
        setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      }, 1000);

      const timeout = setTimeout(() => {
        router.push(ROUTES.HOME as any);
      }, countdown * 1000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [onSuccess, readyRecipeName, countdown, router]);

  const handleUrlCapture = useCallback(
    async (url: string) => {
      setIsUrlCapturing(true);
      setUrlCaptureError(null);
      try {
        const id = await submitUrl(url);
        if (isGoto) {
          const currentGotos = (familySettings['family_goto'] as GoToListDto)?.items ?? [];
          const newItem: GoToItem = {
            description: 'Recipe from link',
            recipeId: id,
            status: 'pending',
          };
          await saveGoTo({
            items: [...currentGotos, newItem],
          });
        }
        if (id) {
          useCaptureStore.getState().addPending({ recipeId: id });
          setPendingRecipeId(id);

          // Check immediately in case it's already ready (SSE fired early)
          const existing = useLibraryStore
            .getState()
            .notifications.find((n) => n.recipeId === id && n.type === 'ready');
          if (existing) {
            setReadyRecipeName(existing.name);
            useLibraryStore.getState().dismissNotification(id);
          }
        }
        setWasUrlCaptured(true);
        setCountdown(10);
        setOnSuccess(true);
      } catch (err) {
        setUrlCaptureError(err instanceof Error ? err.message : 'Failed to capture link.');
      } finally {
        setIsUrlCapturing(false);
      }
    },
    [submitUrl, isGoto, saveGoTo, familySettings]
  );

  const capturedUrlRef = useRef<string | null>(null);

  // REMOVED: Automatic URL capture on mount.
  // We now use showUrlReview to let the user manually save.

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleGallery = () => {
    galleryInputRef.current?.click();
  };

  // Auto-trigger camera if mode is 'photo' (e.g. from Family GOTO)
  useEffect(() => {
    if (mode === 'photo') {
      handleCapture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => addImage(file));
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          addImage(file);
        }
      });
    }
  };

  // Photo path save — E4
  const handleSave = async () => {
    if (photoSubmitLockRef.current || isPhotoSubmitPending || isSubmitting) {
      return;
    }

    photoSubmitLockRef.current = true;
    setShowPhotoUploadOverlay(false);
    setIsPhotoSubmitPending(true);
    try {
      const id = await submitRecipe();
      if (id) {
        setWasPhotoCaptured(true);
        if (isGoto) {
          // Use the first image's implied recipe name (we don't have a name from the photo path,
          // so we use a placeholder that MarkGotoReadyProcessor will overwrite once synthesis completes)
          const currentGotos = (familySettings['family_goto'] as GoToListDto)?.items ?? [];
          const newItem: GoToItem = {
            description: 'Your captured recipe',
            recipeId: id,
            status: 'pending',
          };
          await saveGoTo({
            items: [...currentGotos, newItem],
          });
        }
        useCaptureStore.getState().addPending({ recipeId: id });
        setPendingRecipeId(id);

        // Check immediately in case it's already ready (SSE fired early)
        const existing = useLibraryStore
          .getState()
          .notifications.find((n) => n.recipeId === id && n.type === 'ready');
        if (existing) {
          setReadyRecipeName(existing.name);
          useLibraryStore.getState().dismissNotification(id);
        }

        setCountdown(10);
        setOnSuccess(true);
      }
    } finally {
      photoSubmitLockRef.current = false;
      setShowPhotoUploadOverlay(false);
      setIsPhotoSubmitPending(false);
    }
  };

  // Describe path submit — E3
  const handleDescribeSubmit = async () => {
    if (!describeName.trim()) {
      setDescribeError('Please enter a recipe name.');
      return;
    }
    setDescribeError(null);
    setIsDescribing(true);
    try {
      const response = await apiClient.api.recipes.describe.post({
        name: describeName.trim(),
        description: describeText.trim() || describeName.trim(),
      });
      const id = response?.data?.id ? String(response.data.id) : null;
      if (!id) throw new Error('No recipe ID returned.');

      if (id) {
        setWasDescribeCaptured(true);
        if (isGoto) {
          const currentGotos = (familySettings['family_goto'] as GoToListDto)?.items ?? [];
          const newItem: GoToItem = {
            description: describeName.trim(),
            recipeId: id,
            status: 'pending',
          };
          await saveGoTo({
            items: [...currentGotos, newItem],
          });
        }
        useCaptureStore
          .getState()
          .addPending({ recipeId: id, name: describeName.trim() || undefined });
        setPendingRecipeId(id);

        // Check immediately in case it's already ready (SSE fired early)
        const existing = useLibraryStore
          .getState()
          .notifications.find((n) => n.recipeId === id && n.type === 'ready');
        if (existing) {
          setReadyRecipeName(existing.name);
          useLibraryStore.getState().dismissNotification(id);
        }

        setCountdown(10);
        setOnSuccess(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setDescribeError(message);
    } finally {
      setIsDescribing(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (onSuccess) {
    // ── Ready state: SSE recipe_ready fired while user is still on this screen ──
    if (readyRecipeName) {
      return (
        <div
          data-testid="capture-success-screen"
          className="flex flex-col items-center justify-center gap-8 py-20 text-center animate-in fade-in zoom-in duration-500"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sage/10 text-sage ring-8 ring-sage/5 animate-in zoom-in duration-300">
            <CheckCircle2 size={48} />
          </div>
          <div className="flex flex-col gap-2">
            <h2
              data-testid="capture-success-heading"
              className="font-heading text-3xl font-bold tracking-tight text-charcoal"
            >
              {readyRecipeName} is ready!
            </h2>
            <p className="text-charcoal/60 px-4 max-w-sm">It&apos;s in your library.</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              data-testid="capture-add-to-week-btn"
              onClick={() => router.push(ROUTES.PLANNER as any)}
              className="rounded-2xl px-8"
            >
              Add to this week
            </Button>
            <Button
              variant="ghost"
              data-testid="capture-done-btn"
              onClick={() => router.push(ROUTES.HOME as any)}
              className="rounded-2xl px-8 text-charcoal/50"
            >
              Done
            </Button>
          </div>
        </div>
      );
    }

    // ── Queued state: recipe submitted, waiting for SSE recipe_ready ──────────
    const heading = isGoto
      ? 'Your GOTO is being prepared'
      : wasDescribeCaptured
        ? 'Synthesizing\u2026'
        : 'Recipe queued';

    const subtext = isGoto
      ? "We'll notify you when it's ready on the home screen."
      : wasPhotoCaptured
        ? "We're processing your photo. You'll get a notification when it's ready."
        : wasUrlCaptured
          ? "We're fetching the recipe from that link. You'll get a notification when it's ready."
          : "We're building your recipe. Hang tight \u2014 it'll be ready shortly.";

    // GOTO uses a different destination after success
    const gotoDest = ROUTES.PROFILE_SETTINGS;

    return (
      <div
        data-testid="capture-success-screen"
        className="flex flex-col items-center justify-center gap-8 py-20 text-center animate-in fade-in zoom-in duration-500"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ochre/10 text-ochre ring-8 ring-ochre/5">
          {isGoto ? <CheckCircle2 size={48} /> : <Loader2 size={48} className="animate-spin" />}
        </div>
        <div className="flex flex-col gap-2">
          <h2
            data-testid="capture-success-heading"
            className="font-heading text-3xl font-bold tracking-tight text-charcoal"
          >
            {heading}
          </h2>
          <p className="text-charcoal/60 px-4 max-w-sm">{subtext}</p>
        </div>
        {isGoto ? (
          <Button
            variant="primary"
            data-testid="capture-success-cta"
            onClick={() => router.push(gotoDest as any)}
            className="rounded-2xl px-8"
          >
            Back to Settings
          </Button>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              data-testid="capture-done-btn"
              onClick={() => router.push(ROUTES.HOME as any)}
              className="rounded-2xl px-8"
            >
              Done
            </Button>
            {countdown !== null && (
              <p className="text-xs text-charcoal/30 mt-4 animate-in fade-in duration-500">
                {tWithVars('capture.redirecting', 'Redirecting home in {{seconds}}s...', {
                  seconds: countdown,
                })}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── URL Capturing Overlay ─────────────────────────────────────────────── */}
      {isUrlCapturing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cream/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-terracotta/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-terracotta text-white shadow-xl">
              <Globe size={32} className="animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col gap-1 text-center px-6">
            <h3 className="font-heading text-xl font-bold text-charcoal">Capturing link...</h3>
            <p className="text-sm text-charcoal/50">One moment while we fetch the recipe.</p>
          </div>
          <Loader2 className="animate-spin text-terracotta" size={24} />
        </div>
      )}

      {showPhotoUploadOverlay && (
        <div
          data-testid="capture-photo-upload-overlay"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-cream/90 backdrop-blur-md animate-in fade-in duration-300"
        >
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-terracotta/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-terracotta text-white shadow-xl">
              <ImageIcon size={32} className="animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col gap-1 px-6 text-center">
            <h3 className="font-heading text-xl font-bold text-charcoal">
              Uploading your photos...
            </h3>
            <p className="text-sm text-charcoal/50">
              Please keep this screen open while we send them.
            </p>
          </div>
          <Loader2 className="animate-spin text-terracotta" size={24} />
        </div>
      )}

      {/* ── Camera / Gallery — hidden when describe or url review is active ───────────── */}
      {!showDescribe && !showUrlReview && (
        <div className="flex flex-col gap-10">
          {/* Capture Area */}
          <div
            data-testid="capture-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center gap-6 rounded-[3rem] p-12 text-center transition-all duration-300 border-2 border-dashed ${
              isDragging
                ? 'bg-terracotta/10 border-terracotta scale-[1.02] shadow-xl shadow-terracotta/5'
                : 'bg-terracotta/[0.03] border-terracotta/10 hover:bg-terracotta/[0.05]'
            }`}
          >
            <button
              type="button"
              onClick={handleCapture}
              aria-label="Take a photo"
              className="flex h-28 w-28 items-center justify-center rounded-full bg-terracotta text-white shadow-xl shadow-terracotta/30 ring-4 ring-white active:scale-95 transition-transform"
            >
              <Camera size={40} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={handleGallery}
              className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-terracotta/60 transition-colors hover:text-terracotta"
            >
              <ImageIcon size={16} />
              {t('capture.pickFromGallery', 'Pick from Gallery')}
            </button>

            <button
              type="button"
              onClick={() => setShowDescribe(true)}
              className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-terracotta/40 transition-colors hover:text-terracotta"
            >
              <PenLine size={16} />
              Or Describe It Instead
            </button>

            <button
              type="button"
              onClick={() => {
                setShowUrlReview(true);
                setUrlInput('');
              }}
              className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-terracotta/40 transition-colors hover:text-terracotta"
            >
              <Globe size={16} />
              Or add from a link
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              aria-label={t('capture.takePhoto', 'Take a photo')}
              title={t('capture.takePhoto', 'Take a photo')}
              onChange={handleFileChange}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              aria-label={t('capture.choosePhotos', 'Choose photos from your library')}
              title={t('capture.choosePhotos', 'Choose photos from your library')}
              onChange={handleFileChange}
            />
          </div>

          {/* Preview Area */}
          {images.length > 0 && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-heading text-lg font-bold text-charcoal">
                  {tWithVars('capture.photosCount', `Photos (${images.length})`, {
                    count: images.length,
                  })}
                </h3>
                <button
                  onClick={() => images.forEach((_, i) => removeImage(0))}
                  className="text-[10px] font-bold uppercase tracking-widest text-terracotta/40"
                >
                  {t('capture.clearAll', 'Clear All')}
                </button>
              </div>

              <div className="flex flex-wrap gap-4">
                {images.map((file, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedDishPhotoIndex(idx)}
                    className={`group relative h-28 w-28 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl shadow-sm ring-2 transition-all active:scale-95 ${idx === selectedDishPhotoIndex ? 'ring-terracotta scale-105 z-10 shadow-lg' : 'ring-terracotta/5'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Capture preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      aria-label={t('capture.removePhoto', 'Remove photo')}
                      title={t('capture.removePhoto', 'Remove photo')}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal/80 text-white backdrop-blur-sm transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    >
                      <X size={14} />
                    </button>
                    <div
                      className={`absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all ${idx === selectedDishPhotoIndex ? 'bg-terracotta text-white shadow-lg scale-110 opacity-100' : 'opacity-0 bg-white/60 text-charcoal/20'}`}
                    >
                      <Star
                        size={16}
                        fill={idx === selectedDishPhotoIndex ? 'currentColor' : 'none'}
                        strokeWidth={idx === selectedDishPhotoIndex ? 0 : 2}
                      />
                    </div>
                    {idx === selectedDishPhotoIndex && (
                      <div className="absolute bottom-0 left-0 right-0 bg-terracotta/90 py-1 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white">
                          {t('capture.mainDish', 'Main Dish')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Appreciation & Notes */}
              <div className="flex flex-col gap-6 mt-2">
                <div className="flex flex-col gap-3 px-2">
                  <label className="text-sm font-bold text-charcoal/80">
                    {t('capture.appreciation', 'Appreciation')}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 1, label: 'Not for me', icon: '👎' },
                      { value: 2, label: 'It was OK', icon: '👍' },
                      { value: 3, label: 'Loved it!', icon: '💚' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setRating(opt.value as any)}
                        className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 border-2 transition-all ${rating === opt.value ? 'border-terracotta bg-terracotta/5 text-terracotta scale-100 shadow-sm' : 'border-charcoal/5 bg-white text-charcoal/50 hover:bg-charcoal/5 scale-[0.98]'}`}
                      >
                        <span className="text-2xl leading-none">{opt.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {t(`capture.rating.${opt.value}`, opt.label)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 px-2">
                  <label className="text-sm font-bold text-charcoal/80">
                    {t('capture.notes', 'Notes (Optional)')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('capture.notesPlaceholder', 'Any tweaks for next time?')}
                    className="w-full rounded-3xl border-2 border-charcoal/10 bg-white p-5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-terracotta focus:outline-none focus:ring-4 focus:ring-terracotta/10 min-h-[120px] resize-none transition-all"
                  />
                </div>
              </div>

              <div ref={saveAreaRef}>
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  isLoading={isSubmitting || isPhotoSubmitPending}
                  loadingText="Uploading Photos..."
                  onClick={handleSave}
                  disabled={isSubmitting || isPhotoSubmitPending}
                  className="mt-4 rounded-[2rem] py-6 text-lg font-bold shadow-xl shadow-terracotta/20"
                >
                  {t('capture.saveRecipe', 'Save Recipe')}
                </Button>
                {isPhotoSubmitPending && (
                  <p
                    data-testid="capture-photo-upload-helper"
                    className="mt-3 px-3 text-center text-sm font-medium text-charcoal/60"
                  >
                    Large photos can take a few seconds.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="px-4 text-center text-sm font-medium text-pink animate-in shake duration-300">
              {error}
            </p>
          )}
        </div>
      )}

      {/* ── URL Review Form ─────────────────────────────────────────────────── */}
      {showUrlReview && !onSuccess && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setShowUrlReview(false);
                setUrlCaptureError(null);
              }}
              className="flex w-fit items-center gap-1 text-sm font-bold uppercase tracking-widest text-charcoal/40 transition-colors hover:text-charcoal"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta">
              <Globe size={24} />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-2xl font-black text-charcoal tracking-tight">
                Review your link
              </h2>
              <p className="text-sm text-charcoal/50">
                We&apos;ll fetch the details once you save.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* URL Display - Multi-line Textbox */}
            <div className="flex flex-col gap-3 px-2">
              <label className="text-sm font-bold text-charcoal/80">Link URL</label>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste a recipe link here..."
                className="w-full rounded-3xl border-2 border-charcoal/10 bg-white p-5 text-sm text-charcoal placeholder:text-charcoal/30 font-mono leading-relaxed resize-none min-h-[100px] focus:border-terracotta focus:outline-none focus:ring-4 focus:ring-terracotta/10 transition-all"
              />
            </div>

            {/* Appreciation & Notes (Same as Photo Path) */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 px-2">
                <label className="text-sm font-bold text-charcoal/80">
                  {t('capture.appreciation', 'Appreciation')}
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 1, label: 'Not for me', icon: '👎' },
                    { value: 2, label: 'It was OK', icon: '👍' },
                    { value: 3, label: 'Loved it!', icon: '💚' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setRating(opt.value as any)}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 border-2 transition-all ${rating === opt.value ? 'border-terracotta bg-terracotta/5 text-terracotta scale-100 shadow-sm' : 'border-charcoal/5 bg-white text-charcoal/50 hover:bg-charcoal/5 scale-[0.98]'}`}
                    >
                      <span className="text-2xl leading-none">{opt.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {t(`capture.rating.${opt.value}`, opt.label)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 px-2">
                <label className="text-sm font-bold text-charcoal/80">
                  {t('capture.notes', 'Notes (Optional)')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('capture.notesPlaceholder', 'Any tweaks for next time?')}
                  className="w-full rounded-3xl border-2 border-charcoal/10 bg-white p-5 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-terracotta focus:outline-none focus:ring-4 focus:ring-terracotta/10 min-h-[120px] resize-none transition-all"
                />
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isUrlCapturing}
              onClick={() => handleUrlCapture(urlInput.trim())}
              disabled={!urlInput.trim() || isUrlCapturing}
              className="rounded-[2rem] py-6 text-lg font-bold shadow-xl shadow-terracotta/20"
            >
              Save Recipe
            </Button>
          </div>

          {urlCaptureError && (
            <p className="px-4 text-center text-sm font-medium text-pink animate-in shake duration-300">
              {urlCaptureError}
            </p>
          )}
        </div>
      )}

      {/* ── Describe form ────────────────────────────────────────────────────── */}
      {showDescribe && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-black text-charcoal tracking-tight">
              Describe your recipe
            </h2>
            <p className="text-sm text-charcoal/50">
              Give it a name and we&apos;ll synthesize the full recipe for you.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Name — required */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-charcoal/80">
                Recipe name <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                value={describeName}
                onChange={(e) => setDescribeName(e.target.value)}
                placeholder="e.g. Our family spaghetti"
                className="w-full rounded-2xl border-2 border-charcoal/10 bg-white px-5 py-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-ochre focus:outline-none focus:ring-4 focus:ring-ochre/10 transition-all"
              />
            </div>

            {/* Description — optional */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-charcoal/80">
                Description <span className="text-charcoal/30 font-normal">(optional)</span>
              </label>
              <textarea
                value={describeText}
                onChange={(e) => setDescribeText(e.target.value)}
                placeholder="Any details — key ingredients, cooking style, family notes…"
                className="w-full rounded-2xl border-2 border-charcoal/10 bg-white px-5 py-4 text-sm text-charcoal placeholder:text-charcoal/30 focus:border-ochre focus:outline-none focus:ring-4 focus:ring-ochre/10 min-h-[120px] resize-none transition-all"
              />
            </div>
          </div>

          {describeError && <p className="text-sm font-medium text-pink">{describeError}</p>}

          <Button
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isDescribing}
            onClick={handleDescribeSubmit}
            disabled={!describeName.trim() || isDescribing}
            className="rounded-[2rem] py-6 text-lg font-bold shadow-xl shadow-ochre/20 bg-ochre hover:bg-ochre/90 disabled:opacity-40"
          >
            {isDescribing ? (
              <span className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Synthesizing…
              </span>
            ) : (
              'Synthesize Recipe'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
