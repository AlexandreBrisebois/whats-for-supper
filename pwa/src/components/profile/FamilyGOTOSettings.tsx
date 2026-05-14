'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
import type { GoToListDto, GoToItem } from '@/lib/api/generated/models/index';
import { normalizeGotos, isValidGoto, type GotoValue } from '@/lib/gotoUtils';

const GOTO_KEY = 'family_goto';

type RecipeStatus = 'pending' | 'ready' | null;

export function FamilyGOTOSettings() {
  const familySettings = useFamilyStore((state) => state.familySettings);
  const loadGoTo = useFamilyStore((state) => state.loadGoTo);
  const saveGoTo = useFamilyStore((state) => state.saveGoTo);
  const [showSheet, setShowSheet] = useState(false);
  const [showReadyFlash, setShowReadyFlash] = useState(false);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const router = useRouter();

  const currentGotos = useMemo(
    () => (familySettings[GOTO_KEY] as GoToListDto)?.items ?? [],
    [familySettings]
  );

  useEffect(() => {
    loadGoTo();
  }, [loadGoTo]);

  // Subscribe to gotoStore — when recipe_ready fires for any of our recipeIds, re-fetch the list
  const { isReady } = useGotoStore();
  useEffect(() => {
    const hasAnyPendingNowReady = currentGotos.some(
      (g: GoToItem) => g.status === 'pending' && isReady(g.recipeId!)
    );

    if (hasAnyPendingNowReady) {
      loadGoTo().then(() => {
        setShowReadyFlash(true);
        setTimeout(() => setShowReadyFlash(false), 2000);
      });
    }
  }, [isReady, currentGotos, loadGoTo]);

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
      const newList = currentGotos.filter((g: GoToItem) => g.recipeId !== recipeId);
      await saveGoTo({ items: newList });
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
            {currentGotos.map((goto: GoToItem) => {
              const isItemPending = goto.status === 'pending';
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
                    onClick={() => handleRemove(goto.recipeId!)}
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
