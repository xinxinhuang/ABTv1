'use client';

import React from 'react';
import Image from 'next/image';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { motion } from 'framer-motion';

// Card rarity type
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Card size variants
const gameCardVariants = cva(
  'relative overflow-hidden transition-all duration-300 cursor-pointer select-none',
  {
    variants: {
      size: {
        thumbnail: 'w-16 h-24',
        small: 'w-24 h-36',
        medium: 'w-32 h-48',
        large: 'w-48 h-72',
        full: 'w-64 h-96',
      },
      rarity: {
        common: [
          'border-[var(--color-rarity-common)]',
          'hover:shadow-[0_0_10px_var(--color-rarity-common)]'
        ],
        uncommon: [
          'border-[var(--color-rarity-uncommon)]',
          'hover:shadow-[0_0_12px_var(--color-rarity-uncommon)]'
        ],
        rare: [
          'border-[var(--color-rarity-rare)]',
          'hover:shadow-[0_0_15px_var(--color-rarity-rare)]'
        ],
        epic: [
          'border-[var(--color-rarity-epic)]',
          'hover:shadow-[0_0_20px_var(--color-rarity-epic)]'
        ],
        legendary: [
          'border-[var(--color-rarity-legendary)]',
          'hover:shadow-[0_0_25px_var(--color-rarity-legendary)]',
          'animate-glow'
        ],
      },
      state: {
        default: '',
        selected: 'ring-2 ring-[var(--color-primary-500)] ring-offset-2',
        disabled: 'opacity-50 cursor-not-allowed',
        dragging: 'rotate-3 scale-105 z-50',
      }
    },
    defaultVariants: {
      size: 'medium',
      rarity: 'common',
      state: 'default',
    },
  }
);

export interface GameCardData {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  rarity: CardRarity;
  cost?: number;
  attack?: number;
  health?: number;
  type?: string;
  abilities?: string[];
}

export interface GameCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gameCardVariants> {
  card: GameCardData;
  showStats?: boolean;
  showDescription?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onCardClick?: (card: GameCardData) => void;
  onCardHover?: (card: GameCardData) => void;
}

export function GameCard({
  card,
  size = 'medium',
  rarity,
  state,
  showStats = true,
  showDescription = false,
  interactive = true,
  selected = false,
  onCardClick,
  onCardHover,
  className,
  ...props
}: GameCardProps) {
  const cardRarity = rarity || card.rarity;
  const cardState = selected ? 'selected' : state;

  const handleClick = () => {
    if (interactive && onCardClick) {
      onCardClick(card);
    }
  };

  const handleMouseEnter = () => {
    if (interactive && onCardHover) {
      onCardHover(card);
    }
  };

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.05, y: -4 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Card
        variant="interactive"
        padding="none"
        className={cn(
          gameCardVariants({ size, rarity: cardRarity, state: cardState }),
          className
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...props}
      >
        {/* Card Image */}
        <div className="relative flex-1 bg-gradient-to-b from-gray-700 to-gray-800">
          {card.imageUrl ? (
            <Image
              src={card.imageUrl}
              alt={card.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-xs">No Image</span>
            </div>
          )}
          
          {/* Rarity indicator */}
          <div className="absolute top-1 right-1">
            <div 
              className={cn(
                'w-2 h-2 rounded-full',
                cardRarity === 'common' && 'bg-[var(--color-rarity-common)]',
                cardRarity === 'uncommon' && 'bg-[var(--color-rarity-uncommon)]',
                cardRarity === 'rare' && 'bg-[var(--color-rarity-rare)]',
                cardRarity === 'epic' && 'bg-[var(--color-rarity-epic)]',
                cardRarity === 'legendary' && 'bg-[var(--color-rarity-legendary)]'
              )}
            />
          </div>

          {/* Cost indicator */}
          {card.cost !== undefined && (
            <div className="absolute top-1 left-1 bg-[var(--color-primary-500)] text-[var(--color-secondary-900)] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {card.cost}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-2 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)]">
          {/* Card Name */}
          <h4 className={cn(
            'font-semibold truncate',
            size === 'thumbnail' || size === 'small' ? 'text-xs' : 'text-sm',
            `text-[var(--color-rarity-${cardRarity})]`
          )}>
            {card.name}
          </h4>

          {/* Card Type */}
          {card.type && size !== 'thumbnail' && (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {card.type}
            </p>
          )}

          {/* Stats */}
          {showStats && (card.attack !== undefined || card.health !== undefined) && size !== 'thumbnail' && (
            <div className="flex justify-between items-center mt-1 text-xs">
              {card.attack !== undefined && (
                <div className="flex items-center text-[var(--color-error)]">
                  <span className="font-bold">⚔</span>
                  <span className="ml-1">{card.attack}</span>
                </div>
              )}
              {card.health !== undefined && (
                <div className="flex items-center text-[var(--color-success)]">
                  <span className="font-bold">❤</span>
                  <span className="ml-1">{card.health}</span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {showDescription && card.description && (size === 'large' || size === 'full') && (
            <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-3">
              {card.description}
            </p>
          )}

          {/* Abilities */}
          {card.abilities && card.abilities.length > 0 && size === 'full' && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Abilities:</p>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                {card.abilities.map((ability, index) => (
                  <li key={index} className="line-clamp-2">• {ability}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Legendary glow effect */}
        {cardRarity === 'legendary' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--color-rarity-legendary)] to-transparent opacity-20 animate-pulse" />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// Card collection grid component
export interface CardGridProps {
  cards: GameCardData[];
  cardSize?: VariantProps<typeof gameCardVariants>['size'];
  onCardClick?: (card: GameCardData) => void;
  onCardHover?: (card: GameCardData) => void;
  selectedCards?: string[];
  className?: string;
}

export function CardGrid({
  cards,
  cardSize = 'medium',
  onCardClick,
  onCardHover,
  selectedCards = [],
  className,
}: CardGridProps) {
  const getGridCols = () => {
    switch (cardSize) {
      case 'thumbnail': return 'grid-cols-8 md:grid-cols-12 lg:grid-cols-16';
      case 'small': return 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8';
      case 'medium': return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6';
      case 'large': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 'full': return 'grid-cols-1 md:grid-cols-2';
      default: return 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6';
    }
  };

  return (
    <div className={cn(
      'grid gap-4 p-4',
      getGridCols(),
      className
    )}>
      {cards.map((card) => (
        <GameCard
          key={card.id}
          card={card}
          size={cardSize}
          selected={selectedCards.includes(card.id)}
          onCardClick={onCardClick}
          onCardHover={onCardHover}
        />
      ))}
    </div>
  );
}