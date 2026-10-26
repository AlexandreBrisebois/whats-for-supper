'use client';
import { useEffect } from 'react';
import { demoSession } from '@/lib/api/demo-session';

/** Carry SSR response identity into the document; mixed or old snapshots require refresh. */
export function DemoGenerationInitializer({ generations }: { generations: string[] }) {
  useEffect(() => {
    generations.forEach((generation) => demoSession.observe(generation));
  }, [generations]);
  return null;
}
