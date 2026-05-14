'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Loader2,
  Sparkles,
  Search,
  PenLine,
  Camera,
  X,
  CheckCircle2,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useFamilyStore } from '@/store/familyStore';
import { useGotoStore } from '@/store/gotoStore';
import { apiClient } from '@/lib/api/api-client';
import { normalizeGotos, isValidGoto, type GotoValue } from '@/lib/gotoUtils';

const GOTO_KEY = 'family_goto';

type RecipeStatus = 'pending' | 'ready' | null;

export function FamilyGOTOSettings() {
  const { loadSetting, saveSetting, familySettings } = useFamilyStore();
  const [showSheet, setShowSheet] = useState(false);
  const [recipeStatus, setRecipeStatus] = useState<RecipeStatus>(null);
  const [showReadyFlash, setShowReadyFlash] = useState(false);
  const prevStatusRef = useRef<RecipeStatus>(null);
  const prevRecipeIdRef = useRef<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const router = useRouter();

  const currentGotos = normalizeGotos(familySettings[GOTO_KEY]);
  // Use the most recently added or active one for status polling if needed
  const currentGoto = currentGotos.length > 0 ? currentGotos[currentGotos.length - 1] : null;

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

  const handleRemove = async (recipeId: string) => {
    setIsRemovingId(recipeId);
    try {
      const newList = currentGotos.filter((g) => g.recipeId !== recipeId);
      await saveSetting(GOTO_KEY, { items: newList });
    } catch (err) {
      console.error('Failed to remove GOTO:', err);
    } finally {
      setIsRemovingId(null);
    }
  };

  return (
    <>
      <div className="w-full max-w-sm rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-ochre" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ochre">Family GOTO</h3>
        </div>

        <p className="text-sm text-charcoal/60 mb-6">
          Your fallback meals when nothing is planned. They cycle on the home screen so you can
          confirm them in one tap.
        </p>

        {currentGotos.length > 0 ? (
          <div className="flex flex-col gap-4">
            {currentGotos.map((goto) => {
              const isItemPending = isPending && goto.recipeId === currentId;
              const isRemoving = isRemovingId === goto.recipeId;

              return (
                <div
                  key={goto.recipeId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/60 border border-white/40 shadow-sm"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      {isItemPending ? (
                        <Loader2
                          className="h-3 w-3 text-ochre animate-spin flex-shrink-0"
                          data-testid="goto-pending-spinner"
                        />
                      ) : null}
                      <span
                        className="text-sm font-bold text-charcoal truncate"
                        data-testid={
                          isItemPending ? 'goto-pending-description' : 'goto-recipe-name'
                        }
                      >
                        {goto.description}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(goto.recipeId)}
                    disabled={isRemoving}
                    className="p-2 rounded-full hover:bg-charcoal/5 text-charcoal/30 hover:text-terracotta transition-colors disabled:opacity-50"
                  >
                    {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-2 w-full h-11 rounded-2xl bg-ochre/10 text-ochre justify-center text-[10px] font-black uppercase tracking-widest hover:bg-ochre/20 transition-colors mt-2"
              data-testid="add-goto-btn"
            >
              <Plus size={14} /> Add a GOTO
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-charcoal/40 italic">No GOTO set yet.</p>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-2 w-full h-12 rounded-2xl bg-ochre/10 text-ochre justify-center text-[10px] font-black uppercase tracking-widest hover:bg-ochre/20 transition-colors"
            >
              Add a GOTO <ChevronRight size={14} />
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
                  Add a GOTO
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
