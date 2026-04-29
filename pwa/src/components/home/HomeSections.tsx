'use client';

import { Check, Camera, ChevronRight, Zap, Clock, Utensils, Sparkles, Ban } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MenuCardProps {
  recipeId: string;
  recipeName: string;
  description?: string;
  imageUrl?: string;
  prepTime?: string;
  ingredients?: string[];
  onCookMode?: (id: string) => void;
  onSkip?: (id: string) => void;
}

export function TonightMenuCard({
  recipeId,
  recipeName,
  description,
  imageUrl,
  prepTime,
  ingredients = [],
  onCookMode,
  onSkip,
}: MenuCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="relative aspect-[4/5] w-full perspective-1000 group"
      data-testid="tonight-menu-card"
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="relative w-full h-full preserve-3d cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of Card */}
        <div
          className={cn(
            'absolute inset-0 rounded-[3rem] glass flex flex-col p-6 backface-hidden shadow-2xl border-2 border-white/20',
            isFlipped ? 'pointer-events-none' : ''
          )}
        >
          <div className="flex justify-between items-center mb-5 px-1">
            <h2 className="font-heading text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/40">
              Tonight&apos;s Menu
            </h2>
            {prepTime && (
              <span className="text-[10px] font-black text-terracotta bg-terracotta/10 px-3 py-1 rounded-full uppercase tracking-widest">
                {prepTime}
              </span>
            )}
          </div>

          <div className="relative flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl mb-6">
            {imageUrl ? (
              <Image
                src={imageUrl.startsWith('/api/') ? `/backend${imageUrl}` : imageUrl}
                alt={recipeName}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-charcoal/5 flex items-center justify-center">
                <Utensils size={48} className="text-charcoal/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-60" />
          </div>

          <div className="flex flex-col gap-2 px-1">
            <h3 className="font-heading text-3xl font-black text-charcoal leading-none tracking-tighter">
              {recipeName}
            </h3>
            <p className="text-charcoal/40 text-[10px] font-black uppercase tracking-widest mt-1 flex items-center gap-1">
              Tap for details <ChevronRight size={12} />
            </p>
          </div>
        </div>

        {/* Back of Card */}
        <div
          className={cn(
            'absolute inset-0 rounded-[3rem] bg-white shadow-2xl rotate-y-180 backface-hidden border-2 border-ochre/20 overflow-hidden flex flex-col',
            !isFlipped ? 'pointer-events-none' : ''
          )}
        >
          <div className="flex-1 overflow-y-auto scrollbar-none p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-ochre">
                Details & Ingredients
              </h4>
              <Sparkles size={16} className="text-ochre" />
            </div>

            <h3 className="text-2xl font-heading font-black text-charcoal mb-4 tracking-tighter">
              {recipeName}
            </h3>

            <p className="text-sm text-charcoal/60 leading-tight mb-8 font-medium italic">
              &ldquo;{description}&rdquo;
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {ingredients.map((ing, i) => (
                <span
                  key={i}
                  className="text-[10px] font-black uppercase tracking-widest bg-charcoal/5 px-3 py-1.5 rounded-xl text-charcoal/50"
                >
                  {ing}
                </span>
              ))}
              {ingredients.length === 0 && (
                <span className="text-[10px] text-charcoal/30 italic">No ingredients listed</span>
              )}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip?.(recipeId);
                }}
                className="flex items-center justify-center gap-2 h-14 rounded-[1.5rem] bg-charcoal/5 text-charcoal/40 hover:bg-terracotta/10 hover:text-terracotta transition-all active:scale-95"
              >
                <Ban size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Skip</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCookMode?.(recipeId);
                }}
                className="flex items-center justify-center gap-2 h-14 rounded-[1.5rem] bg-ochre text-white shadow-lg shadow-ochre/30 transition-all active:scale-95"
              >
                <Utensils size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Cook</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function SmartPivotCard({ onSelect }: { onSelect?: (choice: string) => void }) {
  const choices = [
    { id: '15min', label: '15 Min Fix', icon: Clock, color: 'bg-terracotta' },
    { id: 'pantry', label: 'Pantry Pasta', icon: Utensils, color: 'bg-sage' },
    { id: 'surprise', label: 'Surprise Me', icon: Zap, color: 'bg-charcoal' },
  ];

  return (
    <div
      data-testid="smart-pivot-card"
      className="bg-ochre p-6 rounded-[2.5rem] shadow-ochre-floating flex flex-col gap-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex flex-col gap-1 relative z-10">
        <h2 className="font-heading text-xs font-black uppercase tracking-[0.2em] text-white/60">
          Nothing Planned?
        </h2>
        <h3 className="font-heading text-3xl font-black text-white leading-none tracking-tighter">
          Quick Fixes
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3 relative z-10">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => onSelect?.(choice.id)}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 transition-all active:scale-90 hover:bg-white/30"
          >
            <choice.icon size={20} className="text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-tighter text-center leading-none">
              {choice.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickCaptureTrigger() {
  return (
    <Link
      href={ROUTES.CAPTURE}
      className="group relative flex items-center justify-between w-full bg-white text-charcoal p-6 rounded-[2.5rem] border-2 border-charcoal/5 transition-all active:scale-[0.98] hover:border-terracotta/20"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta transition-colors group-hover:bg-terracotta group-hover:text-white">
          <Camera size={32} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-xl font-black tracking-tighter leading-none">
            Capture a Recipe
          </span>
          <span className="text-charcoal/40 text-[10px] font-black uppercase tracking-widest mt-1">
            Photo or Link
          </span>
        </div>
      </div>
      <div className="h-10 w-10 rounded-full border border-charcoal/10 flex items-center justify-center group-hover:border-terracotta/30">
        <ChevronRight
          size={20}
          className="text-charcoal/20 group-hover:text-terracotta transition-all group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}

export function NextPrepStepCard({
  task,
  onComplete,
}: {
  task: { id: string; label: string; time?: string; completed: boolean };
  onComplete?: (id: string) => void;
}) {
  return (
    <div className="glass-sage rounded-[2.5rem] p-6 flex flex-col gap-5 border-sage/20 transition-all hover:bg-sage/15">
      <div className="flex justify-between items-center">
        <h3 className="font-heading text-sage-800 text-[10px] font-black uppercase tracking-[0.2em]">
          Next Prep Step
        </h3>
        {task.time && (
          <span className="text-sage-700 text-[10px] font-black tabular-nums bg-sage/20 px-3 py-1 rounded-full uppercase tracking-widest">
            {task.time}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-4 group cursor-pointer"
        onClick={() => onComplete?.(task.id)}
      >
        <div
          className={`h-10 w-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
            task.completed
              ? 'bg-sage border-sage text-white scale-110'
              : 'border-sage/40 bg-white/50 hover:border-sage'
          }`}
        >
          {task.completed && <Check strokeWidth={3} size={20} />}
        </div>
        <span
          className={`flex-1 text-charcoal text-2xl font-black tracking-tighter leading-none transition-all ${
            task.completed ? 'opacity-30 line-through' : ''
          }`}
        >
          {task.label}
        </span>
      </div>

      <button className="text-sage-700 text-[10px] font-black uppercase tracking-widest mt-1 hover:text-sage-900 transition-colors flex items-center gap-1 self-start">
        See all steps <ChevronRight size={14} />
      </button>
    </div>
  );
}
