'use client';

import { useRef, useState, useEffect, useCallback, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Camera,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  X,
  Star,
  PenLine,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { useCapture } from '@/hooks/useCapture';
import { usePdfCaptureStore } from '@/store/pdfCaptureStore';
import { validatePdfSelection } from '@/lib/pdfCapture';
import { useFamilyStore } from '@/store/familyStore';
import { useCaptureStore } from '@/store/captureStore';
import { useLibraryStore } from '@/store/libraryStore';
import { apiClient } from '@/lib/api/api-client';
import { importRecipeShareBundle, parseRecipeBundleFile } from '@/lib/api/recipes';
import { Button } from '@/components/ui/button';
import { CookbookLoader } from '@/components/ui/SolarLoader';
import { RecipeDetailSheet } from '@/components/recipes/RecipeDetailSheet';
import { useLocale } from '@/components/common/LocaleProvider';

import { ROUTES } from '@/lib/constants/routes';
import { normalizeGotos } from '@/lib/gotoUtils';
import { t, tWithVars } from '@/locales';
import type {
  GoToListDto,
  GoToItem,
  RecipeShareBundleDto,
  SharedImageDto,
  RecipeDto,
} from '@/lib/api/generated/models/index';

const PHOTO_UPLOAD_OVERLAY_DELAY_MS = 800;

interface MinimalCaptureProps {
  /** Restrict this surface to the existing local prepared-bundle operation. */
  preparedOnly?: boolean;
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
  preparedOnly = false,
  intent,
  mode,
  initialUrl,
  initialTitle,
  initialText,
}: MinimalCaptureProps) {
  const { locale } = useLocale();
  const photoNotesId = useId();
  const urlInputId = useId();
  const urlNotesId = useId();
  const describeNameId = useId();
  const describeNotesId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const familySettings = useFamilyStore((state) => state.familySettings);
  const loadGoTo = useFamilyStore((state) => state.loadGoTo);
  const saveGoTo = useFamilyStore((state) => state.saveGoTo);
  const {
    images,
    reset: resetCapture,
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
  const recipeFileInputRef = useRef<HTMLInputElement>(null);
  const bundlePickerRequested = useRef(false);
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
  const [parsedBundle, setParsedBundle] = useState<RecipeShareBundleDto | null>(null);
  const [selectedBundleFileName, setSelectedBundleFileName] = useState<string | null>(null);
  const [bundleImportError, setBundleImportError] = useState<string | null>(null);
  const [isBundleSubmitting, setIsBundleSubmitting] = useState(false);
  const [bundleImportSucceeded, setBundleImportSucceeded] = useState(false);
  const [bundleImportRecipeName, setBundleImportRecipeName] = useState<string | null>(null);

  // Track the pending recipe ID so we can detect when SSE recipe_ready fires
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  // When SSE recipe_ready fires while user is still on this screen, transition to ready state
  const [readyRecipeName, setReadyRecipeName] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);

  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null);
  const [fileDuplicate, setFileDuplicate] = useState<RecipeDto | null>(null);
  const [urlDuplicate, setUrlDuplicate] = useState<RecipeDto | null>(null);
  const [describeDuplicate, setDescribeDuplicate] = useState<RecipeDto | null>(null);
  const [photoDuplicate, setPhotoDuplicate] = useState<RecipeDto | null>(null);
  const [isDiscardingDuplicate, setIsDiscardingDuplicate] = useState(false);

  const isGoto = intent === 'goto';
  const memberId = useFamilyStore((state) => state.selectedFamilyMemberId);
  const pdfSelection = usePdfCaptureStore((state) => state.selection);
  const photoUrlsRef = useRef<Map<string, string>>(new Map());
  const [photoUrlMap, setPhotoUrlMap] = useState<Record<string, string>>({});

  const photoEntries = (() => {
    const counts = new Map<string, number>();
    return images.map((file) => {
      const base = `${file.name}:${file.size}:${file.type}`;
      const occ = counts.get(base) ?? 0;
      counts.set(base, occ + 1);
      return { file, key: `${base}#${occ}` };
    });
  })();

  useEffect(() => {
    const counts = new Map<string, number>();
    const entries = images.map((file) => {
      const base = `${file.name}:${file.size}:${file.type}`;
      const occ = counts.get(base) ?? 0;
      counts.set(base, occ + 1);
      return { file, key: `${base}#${occ}` };
    });

    const currentMap = photoUrlsRef.current;
    const nextKeys = new Set(entries.map((entry) => entry.key));
    let changed = currentMap.size !== nextKeys.size;

    for (const [key, url] of Array.from(currentMap.entries())) {
      if (!nextKeys.has(key)) {
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
        currentMap.delete(key);
        changed = true;
      }
    }

    for (const { file, key } of entries) {
      if (!currentMap.has(key)) {
        currentMap.set(key, URL.createObjectURL(file));
        changed = true;
      }
    }

    if (changed) {
      setPhotoUrlMap(Object.fromEntries(currentMap));
    }
  }, [images]);

  useEffect(() => {
    const currentMap = photoUrlsRef.current;
    return () => {
      for (const url of currentMap.values()) {
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
      }
      currentMap.clear();
    };
  }, []);

  useEffect(() => {
    if (pdfSelection) resetCapture?.();
  }, [pdfSelection, resetCapture]);

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

  // URL Capture duplicate check (debounced 500ms)
  useEffect(() => {
    const trimmed = urlInput.trim();

    const timer = setTimeout(
      async () => {
        if (!trimmed) {
          setUrlDuplicate(null);
          return;
        }
        try {
          const res = await apiClient.api.recipes.get({
            query: { url: trimmed },
            queryParameters: { url: trimmed },
          } as any);
          const match = res?.recipes?.[0] || null;
          setUrlDuplicate(match);
        } catch (err) {
          console.error('Error checking duplicate URL:', err);
        }
      },
      trimmed ? 500 : 0
    );

    return () => {
      clearTimeout(timer);
    };
  }, [urlInput]);

  // Describe Capture duplicate check (debounced 500ms)
  useEffect(() => {
    const trimmed = describeName.trim();

    const timer = setTimeout(
      async () => {
        if (!trimmed) {
          setDescribeDuplicate(null);
          return;
        }
        try {
          const res = await apiClient.api.recipes.get({
            query: { name: trimmed },
            queryParameters: { name: trimmed },
          } as any);
          const match = res?.recipes?.[0] || null;
          setDescribeDuplicate(match);
        } catch (err) {
          console.error('Error checking duplicate describe name:', err);
        }
      },
      trimmed ? 500 : 0
    );

    return () => {
      clearTimeout(timer);
    };
  }, [describeName]);

  // Photo capture duplicate check once readyRecipeName is set
  useEffect(() => {
    if (!readyRecipeName || !pendingRecipeId) {
      if (photoDuplicate !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhotoDuplicate(null);
      }
      return;
    }
    const checkPhotoDuplicate = async () => {
      try {
        const res = await apiClient.api.recipes.get({
          query: { name: readyRecipeName },
          queryParameters: { name: readyRecipeName },
        } as any);
        const matches = res?.recipes || [];
        const duplicateMatch = matches.find((r) => r.id !== pendingRecipeId) || null;
        setPhotoDuplicate(duplicateMatch);
      } catch (err) {
        console.error('Error checking duplicate photo recipe name:', err);
      }
    };
    checkPhotoDuplicate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyRecipeName, pendingRecipeId]);

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
        setUrlCaptureError(
          err instanceof Error
            ? err.message
            : t('capture.linkCaptureFailed', 'Failed to capture link.', locale)
        );
      } finally {
        setIsUrlCapturing(false);
      }
    },
    [submitUrl, isGoto, saveGoTo, familySettings, locale]
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

  const handleRecipeFileImport = () => {
    bundlePickerRequested.current = true;
    setShowDescribe(false);
    setShowUrlReview(false);
    recipeFileInputRef.current?.click();
  };

  // Auto-trigger camera if mode is 'photo' (e.g. from Family GOTO)
  useEffect(() => {
    if (mode === 'photo' && !preparedOnly && !bundlePickerRequested.current)
      fileInputRef.current?.click();
  }, [mode, preparedOnly]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => addImage(file));
    e.target.value = '';
  };

  const handleRecipeBundleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    const textBundle =
      /\.(txt|recipe|json)$/i.test(file.name) ||
      ['text/plain', 'application/json'].includes(file.type);
    const aiFile =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      /\.(pdf|jpe?g|png|webp|gif|heic|avif|bmp)$/i.test(file.name);
    if (preparedOnly && (!textBundle || aiFile)) {
      setBundleImportError(
        t('demoContext.preparedFileType', 'Choose a shared recipe text file (.txt).')
      );
      return;
    }
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      if (!memberId || isGoto) {
        setBundleImportError(t('capture.pdf.type', 'Choose a PDF file.'));
        return;
      }
      const invalid = validatePdfSelection(file);
      if (invalid) {
        setBundleImportError(
          invalid === 'size'
            ? t('capture.pdf.size', 'Choose a PDF up to 20 MiB.')
            : t('capture.pdf.type', 'Choose a PDF file.')
        );
        return;
      }
      resetCapture();
      setParsedBundle(null);
      setBundleImportError(null);
      usePdfCaptureStore.getState().select(file, memberId);
      return;
    }

    try {
      setBundleImportError(null);
      const parsed = await parseRecipeBundleFile(file);
      setParsedBundle(parsed);
      setSelectedBundleFileName(file.name);
      setShowDescribe(false);
      setShowUrlReview(false);

      // Perform duplicate detection
      let duplicateMatch: RecipeDto | null = null;

      // 1. If parsed.info.recipeId is present, check by ID first
      if (parsed.info?.recipeId) {
        const res = await apiClient.api.recipes.get({
          query: { id: parsed.info.recipeId },
          queryParameters: { id: parsed.info.recipeId },
        } as any);
        const match = res?.recipes?.[0] || null;
        if (match) {
          duplicateMatch = match;
        }
      }

      // 2. If no match found or GUID missing, check by name
      if (!duplicateMatch && parsed.recipe?.name) {
        const res = await apiClient.api.recipes.get({
          query: { name: parsed.recipe.name },
          queryParameters: { name: parsed.recipe.name },
        } as any);
        const match = res?.recipes?.[0] || null;
        if (match) {
          duplicateMatch = match;
        }
      }

      setFileDuplicate(duplicateMatch);
    } catch (error) {
      setParsedBundle(null);
      setSelectedBundleFileName(null);
      setFileDuplicate(null);
      setBundleImportError(
        error instanceof Error ? error.message : 'This .recipe file is not valid.'
      );
    }
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

  const handleRejectBundle = () => {
    setParsedBundle(null);
    setSelectedBundleFileName(null);
    setBundleImportError(null);
    setIsBundleSubmitting(false);
    setFileDuplicate(null);
  };

  const handleDiscardDuplicate = async () => {
    if (!pendingRecipeId || isDiscardingDuplicate) return;
    setIsDiscardingDuplicate(true);
    try {
      await apiClient.api.recipes.byId(pendingRecipeId).delete();
      router.push('/' as any);
    } catch (err) {
      console.error('Error discarding duplicate recipe:', err);
    } finally {
      setIsDiscardingDuplicate(false);
    }
  };

  const handleAcceptBundle = async () => {
    if (!parsedBundle || isBundleSubmitting) return;

    setIsBundleSubmitting(true);
    setBundleImportError(null);

    try {
      const importedRecipe = await importRecipeShareBundle(parsedBundle);
      setBundleImportRecipeName(importedRecipe.name);
      setBundleImportSucceeded(true);
      setParsedBundle(null);
      setSelectedBundleFileName(null);
    } catch (error) {
      setBundleImportError(
        error instanceof Error ? error.message : 'Could not import this recipe right now.'
      );
    } finally {
      setIsBundleSubmitting(false);
    }
  };

  // Describe path submit — E3
  const handleDescribeSubmit = async () => {
    if (!describeName.trim()) {
      setDescribeError(t('capture.missingRecipeName', 'Please enter a recipe name.', locale));
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
      if (!id) throw new Error(t('capture.noRecipeIdReturned', 'No recipe ID returned.', locale));

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
      const message =
        err instanceof Error
          ? err.message
          : t('capture.submitFailed', 'Failed to submit. Please try again.', locale);
      setDescribeError(message);
    } finally {
      setIsDescribing(false);
    }
  };

  const PHOTO_RATING_OPTIONS = [
    { value: 1 as const, label: 'Not for me', icon: '👎' },
    { value: 2 as const, label: 'It was OK', icon: '👍' },
    { value: 3 as const, label: 'Loved it!', icon: '💚' },
  ];

  const getRatingCardClass = (value: 1 | 2 | 3, selected: boolean) => {
    if (!selected) {
      return 'border-chrome-line bg-white text-ink-muted hover:bg-cream-100 scale-[0.98] motion-reduce:scale-100';
    }
    if (value === 1) {
      return 'border-hearth-line bg-terracotta-50 text-hearth-ink scale-100 shadow-sm';
    }
    if (value === 2) {
      return 'border-garden-line bg-sage-50 text-garden-ink scale-100 shadow-sm';
    }
    return 'border-ink-body bg-white text-ink-body scale-100 shadow-sm';
  };

  const fieldInputBase =
    'w-full border border-icon-affordance bg-white text-sm text-ink-body placeholder:text-ink-muted focus:border-hearth-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body focus:ring-2 focus:ring-hearth-fill/20 transition-all';
  const duplicateCardClass =
    'w-full rounded-2xl border border-sunlight-line bg-ochre-50 px-4 py-3 text-sm text-sunlight-ink flex flex-col gap-2 items-center';
  const viewExistingBtnClass =
    'inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl px-4 text-sm font-semibold text-sunlight-ink underline underline-offset-4 hover:bg-ochre-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body';
  const alertClass =
    'rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink';
  const secondaryActionBtnClass =
    'flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-chrome-line bg-white px-4 py-3 text-sm font-semibold text-ink-body transition-colors hover:bg-charcoal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body';

  // ── Success screen ──────────────────────────────────────────────────────────
  if (bundleImportSucceeded) {
    return (
      <div
        data-testid="bundle-import-success"
        className="flex flex-col items-center justify-center gap-8 py-20 text-center"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-garden-line bg-sage-50 text-garden-ink ring-8 ring-sage-50 animate-in zoom-in duration-300 motion-reduce:animate-none">
          <CheckCircle2 size={48} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-ink-body">
            {bundleImportRecipeName || t('capture.recipeImported', 'Recipe imported', locale)}
          </h2>
          <p className="px-4 text-sm text-ink-muted">
            {t(
              'capture.recipeImportedSubtext',
              'Your shared recipe is ready to use in the library.',
              locale
            )}
          </p>
        </div>
        <Button
          variant="primary"
          data-testid="bundle-import-done-btn"
          onClick={() => router.push(ROUTES.HOME as any)}
          className="rounded-2xl px-8"
        >
          {t('capture.done', 'Done', locale)}
        </Button>
      </div>
    );
  }

  if (onSuccess) {
    // ── Ready state: SSE recipe_ready fired while user is still on this screen ──
    if (readyRecipeName) {
      return (
        <div
          data-testid="capture-success-screen"
          className="flex flex-col items-center justify-center gap-8 py-20 text-center"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-garden-line bg-sage-50 text-garden-ink ring-8 ring-sage-50 animate-in zoom-in duration-300 motion-reduce:animate-none">
            <CheckCircle2 size={48} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h2
              data-testid="capture-success-heading"
              className="font-heading text-3xl font-bold tracking-tight text-ink-body"
            >
              {tWithVars(
                'capture.readyTitle',
                '{{name}} is ready!',
                { name: readyRecipeName },
                locale
              )}
            </h2>
            <p className="px-4 max-w-sm text-ink-muted">
              {t('capture.inYourLibrary', "It's in your library.", locale)}
            </p>
          </div>

          {photoDuplicate && (
            <div
              data-testid="duplicate-recipe-warning"
              className={`max-w-sm ${duplicateCardClass}`}
            >
              <span>
                {tWithVars(
                  'capture.duplicatePhoto',
                  'A recipe with this name already exists: {{name}}',
                  { name: photoDuplicate.name || '' },
                  locale
                )}
              </span>
              <button
                type="button"
                data-testid="view-existing-recipe-btn"
                onClick={() => setDuplicateRecipeId(photoDuplicate.id || null)}
                className={`${viewExistingBtnClass} animate-in fade-in motion-reduce:animate-none`}
              >
                {t('capture.viewExistingRecipe', 'View existing recipe', locale)}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              data-testid="capture-add-to-week-btn"
              onClick={() => router.push(ROUTES.PLANNER as any)}
              className="rounded-2xl px-8"
            >
              {t('capture.addToThisWeek', 'Add to this week', locale)}
            </Button>
            <Button
              variant="ghost"
              data-testid="capture-done-btn"
              onClick={() => router.push(ROUTES.HOME as any)}
              className="rounded-2xl px-8 text-ink-muted hover:bg-cream-100 hover:text-ink-body"
            >
              {t('capture.done', 'Done', locale)}
            </Button>
            {photoDuplicate && (
              <Button
                variant="ghost"
                data-testid="discard-duplicate-btn"
                onClick={handleDiscardDuplicate}
                isLoading={isDiscardingDuplicate}
                disabled={isDiscardingDuplicate}
                className="rounded-2xl px-8 font-bold"
              >
                {t('capture.discardDuplicate', 'Discard duplicate', locale)}
              </Button>
            )}
          </div>
          {duplicateRecipeId && (
            <RecipeDetailSheet
              recipeId={duplicateRecipeId}
              plannerDayLabel={null}
              onClose={() => setDuplicateRecipeId(null)}
              onUseForDay={async () => {}}
            />
          )}
        </div>
      );
    }

    // ── Queued state: recipe submitted, waiting for SSE recipe_ready ──────────
    const heading = isGoto
      ? t('capture.gotoBeingPrepared', 'Your GOTO is being prepared', locale)
      : wasDescribeCaptured
        ? t('capture.buildingRecipe', 'Building your recipe\u2026', locale)
        : t('capture.recipeQueued', 'Recipe queued', locale);

    const subtext = isGoto
      ? t(
          'capture.gotoNotifySubtext',
          "We'll notify you when it's ready on the home screen.",
          locale
        )
      : wasPhotoCaptured
        ? t(
            'capture.photoProcessingSubtext',
            "We're processing your photo. You'll get a notification when it's ready.",
            locale
          )
        : wasUrlCaptured
          ? t(
              'capture.urlFetchingSubtext',
              "We're fetching the recipe from that link. You'll get a notification when it's ready.",
              locale
            )
          : t(
              'capture.buildingRecipeSubtext',
              "Hang tight \u2014 we'll notify you when it's ready.",
              locale
            );

    // GOTO uses a different destination after success
    const gotoDest = ROUTES.HOME;

    return (
      <div
        data-testid="capture-success-screen"
        className="flex flex-col items-center justify-center gap-8 py-20 text-center"
      >
        <div
          className={
            isGoto
              ? 'flex h-24 w-24 items-center justify-center rounded-full border border-sunlight-line bg-ochre-100 text-sunlight-ink ring-8 ring-ochre-50'
              : 'flex h-24 w-24 items-center justify-center'
          }
        >
          {isGoto ? (
            <CheckCircle2 size={48} aria-hidden="true" />
          ) : (
            <CookbookLoader size="md" label={heading} />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h2
            data-testid="capture-success-heading"
            className="font-heading text-3xl font-bold tracking-tight text-ink-body"
          >
            {heading}
          </h2>
          <p className="text-ink-muted px-4 max-w-sm">{subtext}</p>
        </div>
        {isGoto ? (
          <Button
            variant="primary"
            data-testid="capture-success-cta"
            onClick={() => router.push(gotoDest as any)}
            className="rounded-2xl px-8"
          >
            {t('capture.done', 'Done', locale)}
          </Button>
        ) : (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              variant="primary"
              data-testid="capture-done-btn"
              onClick={() => router.push(ROUTES.HOME as any)}
              className="rounded-2xl px-8"
            >
              {t('capture.done', 'Done', locale)}
            </Button>
            {countdown !== null && (
              <p className="text-xs text-ink-muted mt-4 animate-in fade-in duration-500 motion-reduce:animate-none">
                {tWithVars(
                  'capture.redirecting',
                  'Redirecting home in {{seconds}}s...',
                  { seconds: countdown },
                  locale
                )}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (parsedBundle) {
    const hero = (parsedBundle.hero as SharedImageDto | null | undefined) ?? null;
    const originalCount = parsedBundle.originals?.length ?? 0;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-bold text-ink-body tracking-tight">
            {t('capture.reviewRecipeFile', 'Review recipe file', locale)}
          </h2>
          <p className="text-sm text-ink-muted">
            {tWithVars(
              'capture.readyToImport',
              '{{name}} is ready to import.',
              {
                name:
                  selectedBundleFileName ||
                  t('capture.sharedRecipeFileFallback', 'Shared recipe file', locale),
              },
              locale
            )}
          </p>
        </div>

        {fileDuplicate && (
          <div data-testid="duplicate-recipe-warning" className={duplicateCardClass}>
            <span>
              {t('capture.duplicateExists', 'This recipe already exists in your library.', locale)}
            </span>
            <button
              type="button"
              data-testid="view-existing-recipe-btn"
              onClick={() => setDuplicateRecipeId(fileDuplicate.id || null)}
              className={viewExistingBtnClass}
            >
              {t('capture.viewExistingRecipe', 'View existing recipe', locale)}
            </button>
          </div>
        )}

        <div
          data-testid="bundle-preview-card"
          className="overflow-hidden rounded-[2rem] border border-chrome-line bg-white shadow-sm"
        >
          {hero?.base64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:${hero.mimeType};base64,${hero.base64}`}
              alt={
                parsedBundle.recipe?.name ||
                t('capture.sharedRecipeFileFallback', 'Shared recipe file', locale)
              }
              className="h-52 w-full object-cover"
            />
          )}
          <div className="flex flex-col gap-3 p-5">
            <h3
              data-testid="bundle-preview-name"
              className="font-heading text-xl font-bold text-ink-body"
            >
              {parsedBundle.recipe?.name}
            </h3>
            {parsedBundle.recipe?.sourceUrl && (
              <p data-testid="bundle-preview-source-url" className="text-sm text-ink-muted">
                {parsedBundle.recipe.sourceUrl}
              </p>
            )}
            {parsedBundle.recipe?.sourceName && (
              <p data-testid="bundle-preview-source-name" className="text-sm text-ink-muted">
                {parsedBundle.recipe.sourceName}
              </p>
            )}
            <span
              data-testid="bundle-preview-synthesis-badge"
              className="inline-flex w-fit rounded-full border border-sunlight-line bg-ochre-100 px-3 py-1 text-xs font-semibold text-sunlight-ink"
            >
              {parsedBundle.recipe?.isSynthesized
                ? t('capture.synthesizedBadge', 'Synthesized', locale)
                : t('capture.originalBadge', 'Original', locale)}
            </span>
            {originalCount > 0 && (
              <p data-testid="bundle-preview-original-count" className="text-sm text-ink-muted">
                {originalCount === 1
                  ? t('capture.originalPhotosOne', '1 original photo', locale)
                  : tWithVars(
                      'capture.originalPhotosMany',
                      '{{count}} original photos',
                      { count: originalCount },
                      locale
                    )}
              </p>
            )}

            {parsedBundle.recipe?.instructions && (
              <div className="flex flex-col gap-4 mt-2">
                {parsedBundle.recipe.instructions.map((section, sIdx) => (
                  <div key={sIdx} className="flex flex-col gap-2">
                    {section.name && (
                      <h4
                        data-testid="bundle-preview-section-title"
                        className="text-xs font-semibold text-ink-muted"
                      >
                        {section.name}
                      </h4>
                    )}
                    <ul className="flex flex-col gap-2">
                      {section.itemListElement?.map((step, tIdx) => (
                        <li
                          key={tIdx}
                          data-testid="bundle-preview-step-text"
                          className="text-sm text-ink-body leading-relaxed"
                        >
                          {step.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {parsedBundle.recipe?.notes && (
              <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-chrome-line bg-cream-50 p-4">
                <h4 className="text-xs font-semibold text-ink-muted">
                  {t('capture.notesHeading', 'Notes', locale)}
                </h4>
                <p
                  data-testid="bundle-preview-notes"
                  className="text-sm italic text-ink-body leading-relaxed"
                >
                  {parsedBundle.recipe.notes}
                </p>
              </div>
            )}

            {parsedBundle.recipe?.rating && parsedBundle.recipe.rating > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-ink-muted">
                  {t('capture.ratingHeading', 'Rating', locale)}
                </h4>
                <div data-testid="bundle-preview-rating" className="flex gap-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      aria-hidden="true"
                      className={
                        i < (parsedBundle.recipe?.rating || 0)
                          ? 'fill-sunlight-ink text-sunlight-ink'
                          : 'text-icon-affordance'
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {bundleImportError && (
          <p role="alert" data-testid="bundle-import-error" className={alertClass}>
            {bundleImportError}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            data-testid="accept-bundle-btn"
            onClick={handleAcceptBundle}
            disabled={isBundleSubmitting}
            isLoading={isBundleSubmitting}
            className="rounded-[2rem] py-6 text-lg font-bold"
          >
            {t('capture.importRecipeBtn', 'Import recipe', locale)}
          </Button>
          <Button
            variant="ghost"
            data-testid="reject-bundle-btn"
            onClick={handleRejectBundle}
            className="rounded-[2rem] py-6 text-lg font-bold text-ink-muted hover:bg-cream-100 hover:text-ink-body"
          >
            {t('common.cancel', 'Cancel', locale)}
          </Button>
        </div>
        {duplicateRecipeId && (
          <RecipeDetailSheet
            recipeId={duplicateRecipeId}
            plannerDayLabel={null}
            onClose={() => setDuplicateRecipeId(null)}
            onUseForDay={async () => {}}
          />
        )}
      </div>
    );
  }

  const renderAppreciationFieldset = () => (
    <fieldset className="flex flex-col gap-3 px-2">
      <legend className="mb-3 text-sm font-bold text-ink-body">
        {t('capture.appreciation', 'Appreciation', locale)}
      </legend>
      <div className="flex gap-2">
        {PHOTO_RATING_OPTIONS.map((opt) => {
          const isSelected = rating === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              data-testid={`capture-rating-${opt.value}`}
              aria-pressed={isSelected}
              onClick={() => setRating(opt.value)}
              className={`relative min-h-12 min-w-12 flex-1 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 border-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${getRatingCardClass(opt.value, isSelected)}`}
            >
              {isSelected && (
                <span className="absolute right-2 top-2" aria-hidden="true">
                  <Check size={14} />
                </span>
              )}
              <span aria-hidden="true" className="text-2xl leading-none">
                {opt.icon}
              </span>
              <span className="text-xs font-semibold">
                {t(`capture.rating.${opt.value}`, opt.label, locale)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  const recipeFileImport = (
    <>
      <button
        type="button"
        data-testid="capture-secondary-action-import"
        onClick={handleRecipeFileImport}
        className={secondaryActionBtnClass}
      >
        <ArrowLeft size={16} className="rotate-180" aria-hidden="true" />
        <span data-testid="import-recipe-file-btn">
          {preparedOnly
            ? t('demoContext.importPrepared', 'Import a shared recipe (.txt)', locale)
            : t('capture.importRecipeFile', 'Import recipe file', locale)}
        </span>
      </button>
      <input
        ref={recipeFileInputRef}
        data-testid={preparedOnly ? 'import-prepared-file-input' : 'import-recipe-file-input'}
        type="file"
        accept={
          preparedOnly
            ? '.txt,.recipe,.json,text/plain,application/json'
            : isGoto
              ? '.txt,text/plain'
              : '.txt,text/plain,.pdf,application/pdf'
        }
        aria-label={
          preparedOnly
            ? t('demoContext.importPrepared', 'Import a shared recipe (.txt)', locale)
            : t('capture.importRecipeFile', 'Import recipe file', locale)
        }
        title={
          preparedOnly
            ? t('demoContext.importPrepared', 'Import a shared recipe (.txt)', locale)
            : t('capture.importRecipeFile', 'Import recipe file', locale)
        }
        className="hidden"
        onChange={handleRecipeBundleFileChange}
      />
      {bundleImportError && (
        <p role="alert" data-testid="bundle-import-error" className={alertClass}>
          {bundleImportError}
        </p>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── URL Capturing Overlay ─────────────────────────────────────────────── */}
      {!preparedOnly && isUrlCapturing && (
        <div className="glass-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300 motion-reduce:animate-none">
          <div className="relative">
            <div className="absolute inset-0 animate-ping motion-reduce:animate-none rounded-full bg-hearth-fill/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-hearth-fill text-cream-100 shadow-xl">
              <Globe
                size={32}
                className="animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 text-center px-6">
            <h3 className="font-heading text-xl font-bold text-ink-body">
              {t('capture.capturingLink', 'Capturing link...', locale)}
            </h3>
            <p className="text-sm text-ink-muted">
              {t('capture.fetchingRecipeHint', 'One moment while we fetch the recipe.', locale)}
            </p>
          </div>
          <CookbookLoader size="sm" />
        </div>
      )}

      {!preparedOnly && showPhotoUploadOverlay && (
        <div
          data-testid="capture-photo-upload-overlay"
          className="glass-overlay fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300 motion-reduce:animate-none"
        >
          <div className="relative">
            <div className="absolute inset-0 animate-ping motion-reduce:animate-none rounded-full bg-hearth-fill/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-hearth-fill text-cream-100 shadow-xl">
              <ImageIcon
                size={32}
                className="animate-pulse motion-reduce:animate-none"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 px-6 text-center">
            <h3 className="font-heading text-xl font-bold text-ink-body">
              {t('capture.uploadingPhotosOverlay', 'Uploading your photos...', locale)}
            </h3>
            <p data-testid="capture-upload-keep-open" className="text-sm text-ink-muted">
              {t(
                'capture.keepScreenOpen',
                'Please keep this screen open while we send them.',
                locale
              )}
            </p>
          </div>
          <CookbookLoader size="sm" />
        </div>
      )}

      {/* ── Camera / Gallery — hidden when describe or url review is active ───────────── */}
      {(preparedOnly || (!showDescribe && !showUrlReview)) && !parsedBundle && (
        <div className="flex flex-col gap-10">
          {/* Capture Area */}
          {!preparedOnly && (
            <div
              data-testid="capture-area"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center gap-6 rounded-[3rem] p-12 text-center transition-all duration-300 motion-reduce:transition-none border-2 border-dashed ${
                isDragging
                  ? 'bg-terracotta-50 border-hearth-fill scale-[1.02] motion-reduce:scale-100 shadow-xl'
                  : 'bg-terracotta-50/40 border-hearth-line hover:bg-terracotta-50/70'
              }`}
            >
              <button
                type="button"
                data-testid="capture-take-photo-btn"
                onClick={handleCapture}
                aria-label={t('capture.takePhoto', 'Take a photo', locale)}
                className="flex h-28 w-28 items-center justify-center rounded-full bg-hearth-fill hover:bg-hearth-fill-hover active:bg-hearth-fill-active text-cream-100 shadow-xl ring-4 ring-white active:scale-95 motion-reduce:active:scale-100 transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
              >
                <Camera size={40} strokeWidth={2} aria-hidden="true" />
              </button>

              <button
                type="button"
                data-testid="capture-pick-gallery-btn"
                onClick={handleGallery}
                className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-hearth-ink transition-colors hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
              >
                <ImageIcon size={16} aria-hidden="true" />
                {t('capture.pickFromGallery', 'Pick from Gallery', locale)}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                aria-label={t('capture.takePhoto', 'Take a photo', locale)}
                title={t('capture.takePhoto', 'Take a photo', locale)}
                onChange={handleFileChange}
              />
              <input
                ref={galleryInputRef}
                data-testid="capture-gallery-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                aria-label={t(
                  'capture.choosePhotosTitle',
                  'Choose photos from your library',
                  locale
                )}
                title={t('capture.choosePhotosTitle', 'Choose photos from your library', locale)}
                onChange={handleFileChange}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-[2rem] border border-chrome-line bg-white p-5 shadow-sm">
            {!preparedOnly && (
              <>
                <button
                  type="button"
                  data-testid="capture-secondary-action-link"
                  onClick={() => {
                    setShowUrlReview(true);
                    setUrlInput('');
                    setBundleImportError(null);
                  }}
                  className={secondaryActionBtnClass}
                >
                  <Globe size={16} aria-hidden="true" />
                  {t('capture.pasteRecipeLink', 'Paste recipe link', locale)}
                </button>

                <button
                  type="button"
                  data-testid="capture-secondary-action-describe"
                  onClick={() => {
                    setShowDescribe(true);
                    setBundleImportError(null);
                  }}
                  className={secondaryActionBtnClass}
                >
                  <PenLine size={16} aria-hidden="true" />
                  {t('capture.describeRecipe', 'Describe a recipe', locale)}
                </button>
              </>
            )}
            {recipeFileImport}
          </div>

          {/* Preview Area */}
          {!preparedOnly && images.length > 0 && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none">
              <div className="flex items-center justify-between px-2">
                <h3
                  data-testid="capture-photos-count"
                  className="font-heading text-lg font-bold text-ink-body"
                >
                  {tWithVars(
                    'capture.photosCount',
                    `Photos (${images.length})`,
                    { count: images.length },
                    locale
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => images.forEach(() => removeImage(0))}
                  className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl px-4 text-xs font-semibold text-hearth-ink hover:bg-terracotta-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                >
                  {t('capture.clearAll', 'Clear All', locale)}
                </button>
              </div>

              <div className="flex flex-wrap gap-4">
                {photoEntries.map(({ key }, idx) => {
                  const photoUrl = photoUrlMap[key];
                  return (
                    <div key={key} className="group relative h-28 w-28 flex-shrink-0">
                      <button
                        type="button"
                        data-testid={`capture-photo-thumb-${idx}`}
                        aria-pressed={idx === selectedDishPhotoIndex}
                        aria-label={tWithVars(
                          'capture.selectMainDishPhoto',
                          'Select photo {{number}} as main dish photo',
                          { number: idx + 1 },
                          locale
                        )}
                        onClick={() => setSelectedDishPhotoIndex(idx)}
                        className={`relative h-full w-full overflow-hidden rounded-2xl shadow-sm ring-2 transition-all active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body ${idx === selectedDishPhotoIndex ? 'ring-hearth-fill scale-105 motion-reduce:scale-100 z-10 shadow-lg' : 'ring-chrome-line'}`}
                      >
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photoUrl}
                            alt={tWithVars(
                              'capture.capturePreviewAlt',
                              'Capture preview {{number}}',
                              { number: idx + 1 },
                              locale
                            )}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <div
                          className={`absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full transition-all ${idx === selectedDishPhotoIndex ? 'bg-hearth-fill text-cream-100 shadow-lg scale-110 motion-reduce:scale-100 opacity-100' : 'opacity-0 bg-white/80 text-ink-body'}`}
                        >
                          <Star
                            size={16}
                            aria-hidden="true"
                            fill={idx === selectedDishPhotoIndex ? 'currentColor' : 'none'}
                            strokeWidth={idx === selectedDishPhotoIndex ? 0 : 2}
                          />
                        </div>
                        {idx === selectedDishPhotoIndex && (
                          <div className="absolute bottom-0 left-0 right-0 bg-hearth-fill py-1 text-center">
                            <span className="text-xs font-semibold text-cream-100">
                              {t('capture.mainDish', 'Main Dish', locale)}
                            </span>
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label={tWithVars(
                          'capture.removePhotoAt',
                          'Remove photo {{number}}',
                          { number: idx + 1 },
                          locale
                        )}
                        title={t('capture.removePhoto', 'Remove photo', locale)}
                        className="absolute -right-1 -top-1 z-20 flex h-12 w-12 items-center justify-center rounded-full transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-body text-cream-100 shadow-sm">
                          <X size={14} aria-hidden="true" />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Appreciation & Notes */}
              <div className="flex flex-col gap-6 mt-2">
                {renderAppreciationFieldset()}

                <div className="flex flex-col gap-3 px-2">
                  <label htmlFor={photoNotesId} className="text-sm font-bold text-ink-body">
                    {t('capture.notes', 'Notes (Optional)', locale)}
                  </label>
                  <textarea
                    id={photoNotesId}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('capture.notesPlaceholder', 'Any tweaks for next time?', locale)}
                    className={`${fieldInputBase} min-h-[120px] resize-y rounded-3xl p-5`}
                  />
                </div>
              </div>

              <div ref={saveAreaRef}>
                <Button
                  variant="primary"
                  fullWidth
                  size="lg"
                  data-testid="capture-save-btn"
                  isLoading={isSubmitting || isPhotoSubmitPending}
                  loadingText={t('capture.uploadingPhotos', 'Uploading Photos...', locale)}
                  onClick={handleSave}
                  disabled={isSubmitting || isPhotoSubmitPending}
                  className="mt-4 rounded-[2rem] py-6 text-lg font-bold"
                >
                  {t('capture.saveRecipe', 'Save Recipe', locale)}
                </Button>
                {isPhotoSubmitPending && (
                  <p
                    data-testid="capture-photo-upload-helper"
                    className="mt-3 px-3 text-center text-sm font-medium text-ink-muted"
                  >
                    {t('capture.largePhotosHint', 'Large photos can take a few seconds.', locale)}
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className={`${alertClass} text-center animate-in shake duration-300 motion-reduce:animate-none`}
            >
              {error}
            </p>
          )}
        </div>
      )}

      {/* ── URL Review Form ─────────────────────────────────────────────────── */}
      {!preparedOnly && showUrlReview && !onSuccess && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <button
              type="button"
              data-testid="capture-url-back-btn"
              onClick={() => {
                setShowUrlReview(false);
                setUrlCaptureError(null);
                setUrlDuplicate(null);
                setUrlInput('');
              }}
              className="flex min-h-12 min-w-12 w-fit items-center gap-1 rounded-xl px-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {t('capture.back', 'Back', locale)}
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-hearth-line bg-terracotta-50 text-hearth-ink">
              <Globe size={24} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-2">
              <h2
                data-testid="capture-url-review-heading"
                className="font-heading text-2xl font-bold text-ink-body tracking-tight"
              >
                {t('capture.reviewYourLink', 'Review your link', locale)}
              </h2>
              <p className="text-sm text-ink-muted">
                {t('capture.fetchOnceSaved', "We'll fetch the details once you save.", locale)}
              </p>
            </div>
          </div>

          {urlDuplicate && (
            <div data-testid="duplicate-recipe-warning" className={duplicateCardClass}>
              <span>
                {tWithVars(
                  'capture.duplicateUrl',
                  'You already have a recipe from this link: {{name}}',
                  { name: urlDuplicate.name || '' },
                  locale
                )}
              </span>
              <button
                type="button"
                data-testid="view-existing-recipe-btn"
                onClick={() => setDuplicateRecipeId(urlDuplicate.id || null)}
                className={viewExistingBtnClass}
              >
                {t('capture.viewExistingRecipe', 'View existing recipe', locale)}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {/* URL Display - Multi-line Textbox */}
            <div className="flex flex-col gap-3 px-2">
              <label htmlFor={urlInputId} className="text-sm font-bold text-ink-body">
                {t('capture.linkUrl', 'Link URL', locale)}
              </label>
              <textarea
                id={urlInputId}
                data-testid="capture-url-input"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t(
                  'capture.pasteLinkPlaceholder',
                  'Paste a recipe link here...',
                  locale
                )}
                className={`${fieldInputBase} min-h-[100px] resize-y rounded-3xl p-5 font-mono leading-relaxed`}
              />
            </div>

            {/* Appreciation & Notes (Same as Photo Path) */}
            <div className="flex flex-col gap-6">
              {renderAppreciationFieldset()}

              <div className="flex flex-col gap-3 px-2">
                <label htmlFor={urlNotesId} className="text-sm font-bold text-ink-body">
                  {t('capture.notes', 'Notes (Optional)', locale)}
                </label>
                <textarea
                  id={urlNotesId}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('capture.notesPlaceholder', 'Any tweaks for next time?', locale)}
                  className={`${fieldInputBase} min-h-[120px] resize-y rounded-3xl p-5`}
                />
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              data-testid="capture-url-save-btn"
              isLoading={isUrlCapturing}
              onClick={() => handleUrlCapture(urlInput.trim())}
              disabled={!urlInput.trim() || isUrlCapturing}
              className="rounded-[2rem] py-6 text-lg font-bold"
            >
              {t('capture.saveRecipe', 'Save Recipe', locale)}
            </Button>
          </div>

          {urlCaptureError && (
            <p
              role="alert"
              data-testid="capture-url-error"
              className={`${alertClass} text-center animate-in shake duration-300 motion-reduce:animate-none`}
            >
              {urlCaptureError}
            </p>
          )}
        </div>
      )}

      {/* ── Describe form ────────────────────────────────────────────────────── */}
      {!preparedOnly && showDescribe && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl font-bold text-ink-body tracking-tight">
              {t('capture.describeYourRecipe', 'Describe your recipe', locale)}
            </h2>
            <p className="text-sm text-ink-muted">
              {t(
                'capture.describeSubtext',
                "Give it a name and we'll synthesize the full recipe for you.",
                locale
              )}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Name — required */}
            <div className="flex flex-col gap-2">
              <label htmlFor={describeNameId} className="text-sm font-bold text-ink-body">
                {t('capture.recipeName', 'Recipe name', locale)}{' '}
                <span className="text-hearth-ink" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id={describeNameId}
                type="text"
                required
                value={describeName}
                onChange={(e) => setDescribeName(e.target.value)}
                placeholder={t(
                  'capture.recipeNamePlaceholder',
                  'e.g. Our family spaghetti',
                  locale
                )}
                className={`${fieldInputBase} rounded-2xl px-5 py-4`}
              />
              {describeDuplicate && (
                <div data-testid="duplicate-recipe-warning" className={duplicateCardClass}>
                  <span>
                    {t(
                      'capture.duplicateName',
                      'A recipe with this name already exists in your library.',
                      locale
                    )}
                  </span>
                  <button
                    type="button"
                    data-testid="view-existing-recipe-btn"
                    onClick={() => setDuplicateRecipeId(describeDuplicate.id || null)}
                    className={viewExistingBtnClass}
                  >
                    {t('capture.viewExistingRecipe', 'View existing recipe', locale)}
                  </button>
                </div>
              )}
            </div>

            {/* Description — optional */}
            <div className="flex flex-col gap-2">
              <label htmlFor={describeNotesId} className="text-sm font-bold text-ink-body">
                {t('capture.descriptionLabel', 'Description', locale)}{' '}
                <span className="text-ink-muted font-normal">
                  {t('capture.optionalSuffix', '(optional)', locale)}
                </span>
              </label>
              <textarea
                id={describeNotesId}
                value={describeText}
                onChange={(e) => setDescribeText(e.target.value)}
                placeholder={t(
                  'capture.descriptionPlaceholder',
                  'Any details — key ingredients, cooking style, family notes…',
                  locale
                )}
                className={`${fieldInputBase} min-h-[120px] resize-y rounded-2xl px-5 py-4`}
              />
            </div>
          </div>

          {describeError && (
            <p role="alert" className={alertClass}>
              {describeError}
            </p>
          )}

          <Button
            variant="primary"
            fullWidth
            size="lg"
            data-testid="capture-synthesize-btn"
            isLoading={isDescribing}
            loadingText={t('capture.buildingRecipe', 'Building your recipe…', locale)}
            onClick={handleDescribeSubmit}
            disabled={!describeName.trim() || isDescribing}
            className="rounded-[2rem] py-6 text-lg font-bold shadow-sm"
          >
            {t('capture.saveAndBuild', 'Save & build recipe', locale)}
          </Button>

          <Button
            variant="ghost"
            fullWidth
            data-testid="describe-cancel-btn"
            onClick={() => {
              setShowDescribe(false);
              setDescribeName('');
              setDescribeText('');
              setDescribeDuplicate(null);
              setDescribeError(null);
            }}
            className="rounded-[2rem] py-6 text-lg font-bold text-ink-muted hover:bg-cream-100 hover:text-ink-body"
          >
            {t('common.cancel', 'Cancel', locale)}
          </Button>
        </div>
      )}
      {duplicateRecipeId && (
        <RecipeDetailSheet
          recipeId={duplicateRecipeId}
          plannerDayLabel={null}
          onClose={() => setDuplicateRecipeId(null)}
          onUseForDay={async () => {}}
        />
      )}
    </div>
  );
}
