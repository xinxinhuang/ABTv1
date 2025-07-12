'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/types/game';
import { CardDisplay } from '@/components/game/CardDisplay';
import { Loader2 } from 'lucide-react';

export default function InventoryPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch('/api/inventory');
        if (!response.ok) {
          throw new Error('Failed to fetch inventory');
        }
        const data = await response.json();
        setCards(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Card Inventory</h1>
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {cards.map(card => (
            <CardDisplay key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">You don't have any cards yet. Open some packs to get started!</p>
      )}
    </div>
  );
}
