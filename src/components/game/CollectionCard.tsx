'use client';

import { cva } from 'class-variance-authority';

import { Card as PlayerCard } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

const cardRarityStyles = cva(
  "border-2",
  {
    variants: {
      rarity: {
        bronze: "border-amber-700",
        silver: "border-slate-400",
        gold: "border-yellow-500",
      },
    },
    defaultVariants: {
      rarity: "bronze",
    },
  }
);

interface CollectionCardProps {
  card: PlayerCard;
}

export function CollectionCard({ card }: CollectionCardProps) {
  return (
    <Card className={cn(cardRarityStyles({ rarity: card.rarity }))}>
      <CardHeader>
        <CardTitle className="capitalize text-lg">{card.card_name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground capitalize">Rarity: {card.rarity}</p>
        <div className="mt-4 space-y-1 text-xs">
          {Object.entries(card.attributes).map(([key, value]) => (
            <p key={key}><span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span> {value}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
