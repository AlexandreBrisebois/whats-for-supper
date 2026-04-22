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
    <div className="flex flex-col px-1 mb-2">
      <h1 className="font-heading text-4xl font-semibold tracking-tight text-charcoal">
        {getGreeting()},
      </h1>
      <span className="font-heading text-4xl font-semibold tracking-tight text-terracotta">
        {firstName}!
      </span>
    </div>
  );
}
