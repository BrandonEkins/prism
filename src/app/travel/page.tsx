import { Suspense } from 'react';
import { TravelView } from './TravelView';

export const metadata = {
  title: 'Travel',
  description: 'Family travel map — places visited and places to go.',
};

export default function TravelPage() {
  return (
    <Suspense>
      <TravelView />
    </Suspense>
  );
}
