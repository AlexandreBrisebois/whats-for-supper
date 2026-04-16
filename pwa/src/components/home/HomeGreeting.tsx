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
    <h1 className="font-heading text-3xl font-medium tracking-tight text-[#4A3728] px-2 mb-2">
      {getGreeting()}, {firstName}!
    </h1>
  );
}
