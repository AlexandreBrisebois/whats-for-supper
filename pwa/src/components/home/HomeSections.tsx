'use client';

// Removed unnecessary lucide-react imports from before
import { Check } from 'lucide-react';
import Image from 'next/image';

interface MenuCardProps {
  recipeName: string;
  description?: string;
  imageUrl?: string;
  prepTime?: string; // Kept in interface but omitted from render since mockup doesn't have it on the card
  intensity?: string;
}

export function TonightMenuCard({ recipeName, description, imageUrl }: MenuCardProps) {
  return (
    <div className="glass px-4 py-5 flex flex-col gap-4 rounded-3xl relative overflow-hidden transition-all">
      <h2 className="font-heading text-xl font-medium tracking-tight text-[#4A3728] px-1">
        Tonight&apos;s Menu
      </h2>

      {imageUrl && (
        <div className="relative w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden shadow-sm">
          <Image
            src={imageUrl}
            alt={recipeName}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-1 px-1">
        <h3 className="font-heading text-2xl font-medium text-[#4A3728]">{recipeName}</h3>
        {description && <p className="text-[#4A3728]/80 text-sm font-medium">{description}</p>}
      </div>
    </div>
  );
}

export function PrepChecklist({
  tasks,
}: {
  tasks: { id: string; label: string; time?: string; completed: boolean }[];
}) {
  return (
    <section className="glass rounded-[2rem] p-6 flex flex-col gap-5 bg-terracotta/[0.03]">
      <h3 className="font-heading text-[#4A3728] text-xl font-medium px-1">Prep Checklist</h3>
      <div className="flex flex-col gap-4 px-1">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-4 group">
            <div
              className={`h-6 w-6 rounded flex items-center justify-center border-2 transition-colors ${task.completed ? 'bg-[#CD5D45] border-[#CD5D45] text-white' : 'border-[#4A3728]/40 bg-transparent'}`}
            >
              {task.completed && <Check strokeWidth={3} size={14} />}
            </div>
            <span className="flex-1 text-[#4A3728] text-base font-medium">{task.label}</span>
            {task.time && (
              <span className="text-[#4A3728] text-sm tabular-nums font-medium opacity-90">
                {task.time}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
