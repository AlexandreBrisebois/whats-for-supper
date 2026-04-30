'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { QuickFindModal } from '@/components/planner/QuickFindModal';

const GOTO_KEY = 'family_goto';

interface GotoValue {
  description: string;
  recipeId: string;
}

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
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadSetting(GOTO_KEY);
  }, [loadSetting]);

  const currentGoto = isGotoValue(familySettings[GOTO_KEY])
    ? (familySettings[GOTO_KEY] as GotoValue)
    : null;

  const handleRecipeSelect = async (recipe: { id: string; name: string }) => {
    setShowPicker(false);
    setIsSaving(true);
    setShowSaved(false);
    try {
      await saveSetting(GOTO_KEY, { description: recipe.name, recipeId: recipe.id });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
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
          /* Hearth Magic loading state — hook for AI synthesis in follow-on phase */
          <div className="flex items-center gap-3 py-3">
            <Loader2 className="h-5 w-5 text-ochre animate-spin" />
            <span className="text-sm font-medium text-charcoal/60">Synthesizing your GOTO…</span>
          </div>
        ) : currentGoto ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-charcoal">{currentGoto.description}</p>
              {showSaved && <p className="text-xs text-sage font-medium mt-0.5">Saved ✓</p>}
            </div>
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-terracotta hover:text-terracotta/80 transition-colors"
            >
              Change <ChevronRight size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 w-full h-12 rounded-2xl bg-ochre/10 text-ochre justify-center text-[10px] font-black uppercase tracking-widest hover:bg-ochre/20 transition-colors"
          >
            Choose a GOTO recipe <ChevronRight size={14} />
          </button>
        )}
      </div>

      {showPicker && (
        <QuickFindModal onClose={() => setShowPicker(false)} onSelect={handleRecipeSelect} />
      )}
    </>
  );
}
