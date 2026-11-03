'use client';

import { Suspense } from 'react';
import RecipesExperience from './RecipesExperience';

export default function RecipesPage() {
  return (
    <Suspense fallback={null}>
      <RecipesExperience />
    </Suspense>
  );
}
