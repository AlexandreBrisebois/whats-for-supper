'use client';

import { Check, Camera, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';

interface MenuCardProps {
  recipeName: string;
  description?: string;
  imageUrl?: string;
  prepTime?: string;
}

export function TonightMenuCard({ recipeName, description, imageUrl, prepTime }: MenuCardProps) {
  return (
    <div className="glass px-5 py-6 flex flex-col gap-5 rounded-[2rem] relative overflow-hidden transition-all hover:shadow-lg">
      <div className="flex justify-between items-center px-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-charcoal/80">
          Tonight&apos;s Menu
        </h2>
        {prepTime && (
          <span className="text-xs font-bold text-terracotta bg-terracotta/10 px-3 py-1 rounded-full uppercase tracking-wider">
            {prepTime}
          </span>
        )}
      </div>

      {imageUrl && (
        <div className="relative w-full aspect-[4/3] rounded-[1.75rem] overflow-hidden shadow-md group">
          <Image
            src={imageUrl}
            alt={recipeName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="flex flex-col gap-1 px-1">
        <h3 className="font-heading text-3xl font-bold text-charcoal leading-tight">
          {recipeName}
        </h3>
        {description && (
          <p className="text-charcoal/70 text-base font-medium leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

export function QuickCaptureTrigger() {
  return (
    <Link
      href={ROUTES.CAPTURE}
      className="group relative flex items-center justify-between w-full bg-terracotta text-white p-6 rounded-[2rem] shadow-[0_12px_24px_rgba(205,93,69,0.25)] transition-all active:scale-[0.98] hover:shadow-[0_16px_32px_rgba(205,93,69,0.3)]"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/30 group-hover:bg-white/30 transition-colors">
          <Camera size={32} strokeWidth={2} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-xl font-bold tracking-tight">Quick Capture</span>
          <span className="text-white/80 text-sm font-medium">Add a recipe in seconds</span>
        </div>
      </div>
      <ChevronRight
        size={24}
        className="text-white/60 group-hover:translate-x-1 transition-transform"
      />
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
    <div className="glass-sage rounded-[2rem] p-6 flex flex-col gap-4 border-sage/20 transition-all hover:bg-sage/15">
      <div className="flex justify-between items-center">
        <h3 className="font-heading text-sage-800 text-lg font-bold tracking-tight uppercase">
          Next Prep Step
        </h3>
        {task.time && (
          <span className="text-sage-700 text-sm font-bold tabular-nums bg-sage/20 px-3 py-1 rounded-full">
            {task.time}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-4 group cursor-pointer"
        onClick={() => onComplete?.(task.id)}
      >
        <div
          className={`h-8 w-8 rounded-xl flex items-center justify-center border-2 transition-all duration-300 ${
            task.completed
              ? 'bg-sage border-sage text-white scale-110'
              : 'border-sage/40 bg-white/50 hover:border-sage'
          }`}
        >
          {task.completed && <Check strokeWidth={3} size={18} />}
        </div>
        <span
          className={`flex-1 text-charcoal text-xl font-bold tracking-tight transition-all ${
            task.completed ? 'opacity-50 line-through' : ''
          }`}
        >
          {task.label}
        </span>
      </div>

      <button className="text-sage-700 text-sm font-bold uppercase tracking-widest mt-1 hover:text-sage-900 transition-colors flex items-center gap-1 self-start">
        See all steps <ChevronRight size={14} />
      </button>
    </div>
  );
}
