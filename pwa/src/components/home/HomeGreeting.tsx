'use client';

import { useFamily } from '@/hooks/useFamily';

export function HomeGreeting() {
  const { selectedMember } = useFamily();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = selectedMember?.name?.split(' ')[0] || 'There';

  return (
    <div className="flex flex-col px-1 mb-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40 mb-1">
        {getGreeting()}
      </span>
      <h1 className="font-heading text-5xl font-black tracking-tighter text-charcoal leading-[0.9]">
        Good Morning,
      </h1>
      <span className="font-heading text-5xl font-black tracking-tighter text-terracotta leading-[0.9]">
        {firstName}!
      </span>
    </div>
  );
}
