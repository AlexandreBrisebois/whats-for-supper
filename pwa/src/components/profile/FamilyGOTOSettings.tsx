'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Loader2,
  Sparkles,
  ChevronRight,
  Search,
  PenLine,
  Camera,
  X,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useFamilyStore } from '@/store/familyStore';
import { useGotoStore } from '@/store/gotoStore';
import { apiClient } from '@/lib/api/api-client';

const GOTO_KEY = 'family_goto';

interface GotoValue {
  description: string;
  recipeId: string;
  imageUrl?: string;
}

type RecipeStatus = 'pending' | 'ready' | null;

function isGotoValue(v: unknown): v is GotoValue {
  return (
    v != null &&
    typeof v === 'object' &&
    'description' in v &&
    'recipeId' in v &&
    typeof (v as GotoValue).description === 'string' &&
    typeof (v as GotoValue).recipeId === 'string'
  );
}

export function FamilyGOTOSettings() {
  const { loadSetting, familySettings } = useFamilyStore();
  const [showSheet, setShowSheet] = useState(false);
  const [recipeStatus, setRecipeStatus] = useState<RecipeStatus>(null);
  // Flash state: show CheckCircle2 for 2s when recipe transitions to ready
  const [showReadyFlash, setShowReadyFlash] = useState(false);
  const prevStatusRef = useRef<RecipeStatus>(null);
  const prevRecipeIdRef = useRef<string | null>(null);
  const router = useRouter();

  const currentGoto = isGotoValue(familySettings[GOTO_KEY])
    ? (familySettings[GOTO_KEY] as GotoValue)
    : null;

  // Reset status when recipe ID changes — render-body conditional setState is the
  // React-recommended pattern for derived state reset on prop/value change.
  const currentId = currentGoto?.recipeId ?? null;
  if (currentId !== prevRecipeIdRef.current) {
    prevRecipeIdRef.current = currentId;
    setRecipeStatus(null);
    // prevStatusRef is reset by its own useEffect on recipeStatus change
  }

  useEffect(() => {
    loadSetting(GOTO_KEY);
  }, [loadSetting]);

  // Seed status on mount via a single fetch — no polling
  useEffect(() => {
    if (!currentGoto?.recipeId) return;

    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const response = await apiClient.api.recipes.byId(currentGoto.recipeId).status.get();
        if (!isMounted) return;

        const status = response?.data?.status as 'pending' | 'ready';
        // Don't overwrite 'ready' — SSE may have already transitioned us while
        // this fetch was in-flight. The SSE is authoritative.
        setRecipeStatus((prev) => (prev === 'ready' ? 'ready' : status));
      } catch (err) {
        console.error('Failed to fetch recipe status:', err);
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [currentGoto?.recipeId]);

  // Subscribe to gotoStore — when recipe_ready fires for our recipeId, transition to ready
  const readyRecipeId = useGotoStore((s) => s.readyRecipeId);
  useEffect(() => {
    if (!currentGoto?.recipeId) return;
    if (readyRecipeId !== currentGoto.recipeId) return;

    // Only flash if we're transitioning from pending → ready
    const wasNotReady = prevStatusRef.current !== 'ready';
    setRecipeStatus('ready'); // eslint-disable-line react-hooks/set-state-in-effect

    if (wasNotReady) {
      setShowReadyFlash(true);
      const timer = setTimeout(() => setShowReadyFlash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [readyRecipeId, currentGoto?.recipeId]);

  // Track previous status for flash detection
  useEffect(() => {
    prevStatusRef.current = recipeStatus;
  }, [recipeStatus]);

  const isPending = recipeStatus === 'pending';
  const isReady = recipeStatus === 'ready';

  const handleDescribeIt = () => {
    setShowSheet(false);
    router.push('/capture?intent=goto&mode=describe');
  };

  const handleCaptureIt = () => {
    setShowSheet(false);
    router.push('/capture?intent=goto&mode=photo');
  };

  const handleSearchLibrary = () => {
    setShowSheet(false);
    router.push('/recipes');
  };

  return (
    <>
      <div className="w-full max-w-sm rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-ochre" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ochre">Family GOTO</h3>
        </div>

        <p className="text-sm text-charcoal/60 mb-4">
          Your fallback meal when nothing is planned. Shown on the home screen so you can confirm it
          in one tap.
        </p>

        {isPending ? (
          /* Pending state — synthesis in progress */
          <div className="flex items-start justify-between gap-3" data-testid="goto-pending-state">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-3">
                <Loader2
                  className="h-5 w-5 text-ochre animate-spin flex-shrink-0"
                  data-testid="goto-pending-spinner"
                />
                <span className="text-sm font-medium text-charcoal/60">
                  Your GOTO is being prepared…
                </span>
              </div>
              {/* Subtitle: timing expectation */}
              <p className="text-xs text-charcoal/40 pl-8" data-testid="goto-pending-subtitle">
                Usually ready in under 10 seconds
              </p>
              {/* Description echo: confirms what was submitted */}
              {currentGoto?.description && (
                <p
                  className="text-xs text-charcoal/40 pl-8 italic truncate"
                  data-testid="goto-pending-description"
                >
                  {currentGoto.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-terracotta hover:text-terracotta/80 transition-colors flex-shrink-0 mt-0.5"
              data-testid="goto-change-btn"
            >
              Change <ChevronRight size={12} />
            </button>
          </div>
        ) : isReady && currentGoto ? (
          /* Ready state — show CheckCircle2 flash for 2s, then recipe name */
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {showReadyFlash ? (
                <motion.div
                  key="ready-flash"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 size={20} className="text-sage flex-shrink-0" />
                  <span className="text-sm font-medium text-sage">Ready!</span>
                </motion.div>
              ) : (
                <motion.div
                  key="recipe-name"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  data-testid="goto-recipe-name"
                >
                  <p className="text-sm font-bold text-charcoal">{currentGoto.description}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-terracotta hover:text-terracotta/80 transition-colors ml-3 flex-shrink-0"
            >
              Change <ChevronRight size={12} />
            </button>
          </div>
        ) : (
          /* No GOTO set */
          <div className="flex flex-col gap-3">
            <p className="text-sm text-charcoal/40 italic">No GOTO set yet.</p>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-2 w-full h-12 rounded-2xl bg-ochre/10 text-ochre justify-center text-[10px] font-black uppercase tracking-widest hover:bg-ochre/20 transition-colors"
            >
              Set your GOTO <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Change bottom sheet */}
      <AnimatePresence>
        {showSheet && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-sm bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl"
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-charcoal/20 mx-auto mb-6" />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-charcoal/60">
                  Set your GOTO
                </h2>
                <button
                  onClick={() => setShowSheet(false)}
                  className="p-2 rounded-full bg-charcoal/5 hover:bg-charcoal/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={16} className="text-charcoal/60" />
                </button>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3">
                {/* Search library */}
                <button
                  onClick={handleSearchLibrary}
                  className="flex items-center gap-4 w-full h-16 rounded-2xl bg-ochre/10 px-5 text-left hover:bg-ochre/20 transition-colors"
                  data-testid="goto-search-library"
                >
                  <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-ochre/20 flex items-center justify-center">
                    <Search size={18} className="text-ochre" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-charcoal">Search the Library</p>
                    <p className="text-[10px] text-charcoal/40 font-medium">
                      Find the recipe, then tap the star to make it your GOTO.
                    </p>
                  </div>
                </button>

                {/* Describe it */}
                <button
                  onClick={handleDescribeIt}
                  className="flex items-center gap-4 w-full h-16 rounded-2xl bg-indigo/10 px-5 text-left hover:bg-indigo/20 transition-colors"
                >
                  <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-indigo/20 flex items-center justify-center">
                    <PenLine size={18} className="text-indigo" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-charcoal">Describe it</p>
                    <p className="text-[10px] text-charcoal/40 font-medium">
                      AI synthesizes a full recipe from your description
                    </p>
                  </div>
                </button>

                {/* Capture it */}
                <button
                  onClick={handleCaptureIt}
                  className="flex items-center gap-4 w-full h-16 rounded-2xl bg-sage/10 px-5 text-left hover:bg-sage/20 transition-colors"
                >
                  <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-sage/20 flex items-center justify-center">
                    <Camera size={18} className="text-sage" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-charcoal">Capture it</p>
                    <p className="text-[10px] text-charcoal/40 font-medium">
                      Photo of a recipe card, box, or handwritten note
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
