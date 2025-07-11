'use client';

import { Card } from '@/types/game';
import { CollectionCard } from './CollectionCard';

interface CardCollectionProps {
  initialCards: Card[];
}

export function CardCollection({ initialCards }: CardCollectionProps) {
  if (!initialCards.length) {
    return <p className="text-center text-muted-foreground">You don&apos;t have any cards yet. Start opening packs to build your collection!</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {initialCards.map((card: Card) => (
        <CollectionCard key={card.id} card={card} />
      ))}
    </div>
  );
}
