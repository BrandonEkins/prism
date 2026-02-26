import { Suspense } from 'react';
import { RecipesView } from './RecipesView';

export default function RecipesPage() {
  return (
    <Suspense>
      <RecipesView />
    </Suspense>
  );
}
