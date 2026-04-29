'use client';

import { Check, Camera, ChevronRight, Zap, Clock, Utensils } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';

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
