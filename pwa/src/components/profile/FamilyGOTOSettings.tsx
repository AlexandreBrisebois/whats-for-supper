'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, ChevronRight, BookOpen, PenLine, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useFamilyStore } from '@/store/familyStore';
import { QuickFindModal } from '@/components/planner/QuickFindModal';
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
  const { loadSetting, saveSetting, familySettings } = useFamilyStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [recipeStatus, setRecipeStatus] = useState<RecipeStatus>(null);
  const [prevRecipeId, setPrevRecipeId] = useState<string | null>(null);
  const router = useRouter();

  const currentGoto = isGotoValue(familySettings[GOTO_KEY])
    ? (familySettings[GOTO_KEY] as GotoValue)
    : null;

  // Reset status when ID changes (recommended pattern for state reset on prop change)
  const currentId = currentGoto?.recipeId ?? null;
  if (currentId !== prevRecipeId) {
    setPrevRecipeId(currentId);
    setRecipeStatus(null);
  }

  useEffect(() => {
    loadSetting(GOTO_KEY);
  }, [loadSetting]);

  useEffect(() => {
    if (!currentGoto?.recipeId) return;

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const response = await apiClient.api.recipes.byId(currentGoto.recipeId).status.get();
        if (!isMounted) return;

        const status = response?.data?.status as 'pending' | 'ready';
        setRecipeStatus(status);

        if (status === 'ready' && pollInterval) {
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Failed to fetch recipe status:', err);
      }
    };

    fetchStatus();

    // Poll every 5s if pending
    pollInterval = setInterval(fetchStatus, 5000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentGoto?.recipeId]);

  const isPending = recipeStatus === 'pending';
  const isReady = recipeStatus === 'ready';

  const handleRecipeSelect = async (recipe: any) => {
    setShowPicker(false);
    setShowSheet(false);
    setIsSaving(true);
    setShowSaved(false);
    try {
      await saveSetting(GOTO_KEY, {
        description: recipe.name,
        recipeId: recipe.id,
        imageUrl: recipe.image,
      });
      setRecipeStatus('ready'); // Library recipes are always ready
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDescribeIt = () => {
    setShowSheet(false);
    router.push('/capture?intent=goto&mode=describe');
  };

  const handleCaptureIt = () => {
    setShowSheet(false);
    router.push('/capture?intent=goto&mode=photo');
  };

  return (
    <>
      <div className="w-full rounded-3xl bg-white/40 backdrop-blur-md border border-white/40 p-6 shadow-glass">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-ochre/60" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ochre/60">Family GOTO</h3>
        </div>

        <p className="text-sm text-charcoal/60 mb-4">
          Your fallback meal when nothing is planned. Shown on the home screen so you can confirm it
          in one tap.
        </p>

        {isSaving ? (
          <div className="flex items-center gap-3 py-3">
            <Loader2 className="h-5 w-5 text-ochre animate-spin" />
            <span className="text-sm font-medium text-charcoal/60">Saving your GOTO…</span>
          </div>
        ) : isPending ? (
          /* Pending state — synthesis in progress */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-ochre animate-spin flex-shrink-0" />
              <span className="text-sm font-medium text-charcoal/60">
                Your GOTO is being prepared…
              </span>
            </div>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-terracotta hover:text-terracotta/80 transition-colors ml-3 flex-shrink-0"
            >
              Change <ChevronRight size={12} />
            </button>
          </div>
        ) : isReady && currentGoto ? (
          /* Ready state — show recipe name */
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-charcoal">{currentGoto.description}</p>
              {showSaved && <p className="text-xs text-sage font-medium mt-0.5">Saved ✓</p>}
            </div>
            <button
              onClick={() => setShowSheet(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-terracotta hover:text-terracotta/80 transition-colors"
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
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl"
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
                {/* Pick from library */}
                <button
                  onClick={() => {
                    setShowSheet(false);
                    setShowPicker(true);
                  }}
                  className="flex items-center gap-4 w-full h-16 rounded-2xl bg-ochre/10 px-5 text-left hover:bg-ochre/20 transition-colors"
                >
                  <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-ochre/20 flex items-center justify-center">
                    <BookOpen size={18} className="text-ochre" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-charcoal">Pick from library</p>
                    <p className="text-[10px] text-charcoal/40 font-medium">
                      Choose an existing recipe
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

      {/* Library picker — opened from the sheet */}
      {showPicker && (
        <QuickFindModal onClose={() => setShowPicker(false)} onSelect={handleRecipeSelect} />
      )}
    </>
  );
}
