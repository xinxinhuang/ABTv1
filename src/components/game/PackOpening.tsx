'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { Package, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import { GameCard } from '@/components/game/GameCard';
import { cn } from '@/lib/utils';

export interface Pack {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  cost: number;
  cardCount: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PackOpeningProps {
  pack: Pack;
  onPackOpen: (pack: Pack) => Promise<GameCardData[]>;
  onClose?: () => void;
  className?: string;
}

type OpeningState = 'closed' | 'opening' | 'revealing' | 'complete';

export function PackOpening({ 
  pack, 
  onPackOpen, 
  onClose,
  className 
}: PackOpeningProps) {
  const [state, setState] = useState<OpeningState>('closed');
  const [revealedCards, setRevealedCards] = useState<GameCardData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenPack = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setState('opening');
    
    try {
      // Simulate pack opening delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const cards = await onPackOpen(pack);
      setRevealedCards(cards);
      setState('revealing');
      
      // Start revealing cards one by one
      setTimeout(() => {
        revealNextCard();
      }, 500);
    } catch (error) {
      console.error('Error opening pack:', error);
      setState('closed');
    } finally {
      setIsLoading(false);
    }
  };

  const revealNextCard = () => {
    setCurrentCardIndex(prev => {
      const nextIndex = prev + 1;
      if (nextIndex >= revealedCards.length) {
        setState('complete');
        return prev;
      }
      
      // Schedule next card reveal
      setTimeout(() => {
        revealNextCard();
      }, 800);
      
      return nextIndex;
    });
  };

  const handleClose = () => {
    setState('closed');
    setRevealedCards([]);
    setCurrentCardIndex(0);
    onClose?.();
  };

  const getPackGlow = () => {
    switch (pack.rarity) {
      case 'common': return 'shadow-[0_0_20px_var(--color-rarity-common)]';
      case 'rare': return 'shadow-[0_0_25px_var(--color-rarity-rare)]';
      case 'epic': return 'shadow-[0_0_30px_var(--color-rarity-epic)]';
      case 'legendary': return 'shadow-[0_0_40px_var(--color-rarity-legendary)]';
      default: return '';
    }
  };

  return (
    <div className={cn(
      'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4',
      className
    )}>
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70"
        >
          <X className="w-5 h-5" />
        </Button>

        <AnimatePresence mode="wait">
          {/* Pack Closed State */}
          {state === 'closed' && (
            <motion.div
              key="closed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">
                  {pack.name}
                </h2>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                  {pack.description}
                </p>
                <div className="flex justify-center gap-4 text-sm text-[var(--text-secondary)]">
                  <span>{pack.cardCount} cards</span>
                  <span>•</span>
                  <span className={`text-[var(--color-rarity-${pack.rarity})]`}>
                    {pack.rarity} pack
                  </span>
                </div>
              </div>

              {/* Pack Image */}
              <motion.div
                whileHover={{ scale: 1.05, rotateY: 5 }}
                className={cn(
                  'w-48 h-64 mx-auto bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg border-2 cursor-pointer transition-all duration-300',
                  `border-[var(--color-rarity-${pack.rarity})]`,
                  getPackGlow()
                )}
                onClick={handleOpenPack}
              >
                {pack.imageUrl ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <Image
                      src={pack.imageUrl}
                      alt={pack.name}
                      fill
                      className="object-cover"
                      sizes="192px"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-[var(--text-secondary)]" />
                  </div>
                )}
              </motion.div>

              <Button
                size="lg"
                variant="primary"
                onClick={handleOpenPack}
                loading={isLoading}
                leftIcon={<Sparkles className="w-5 h-5" />}
                className="min-w-48"
              >
                Open Pack ({pack.cost} coins)
              </Button>
            </motion.div>
          )}

          {/* Pack Opening Animation */}
          {state === 'opening' && (
            <motion.div
              key="opening"
              initial={{ scale: 1 }}
              animate={{ 
                scale: [1, 1.2, 0.8, 1.1, 0],
                rotateY: [0, 180, 360],
                opacity: [1, 1, 1, 1, 0]
              }}
              transition={{ duration: 2, ease: 'easeInOut' }}
              className="text-center"
            >
              <div className={cn(
                'w-48 h-64 mx-auto bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg border-2',
                `border-[var(--color-rarity-${pack.rarity})]`,
                getPackGlow()
              )}>
                {pack.imageUrl ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <Image
                      src={pack.imageUrl}
                      alt={pack.name}
                      fill
                      className="object-cover"
                      sizes="192px"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-[var(--text-secondary)]" />
                  </div>
                )}
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <p className="text-xl text-[var(--color-primary-500)] font-semibold">
                  Opening pack...
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Card Revealing */}
          {(state === 'revealing' || state === 'complete') && (
            <motion.div
              key="revealing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                  Pack Opened!
                </h3>
                <p className="text-[var(--text-secondary)]">
                  {state === 'complete' 
                    ? `You got ${revealedCards.length} new cards!`
                    : `Revealing card ${currentCardIndex + 1} of ${revealedCards.length}...`
                  }
                </p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
                {revealedCards.map((card, index) => (
                  <AnimatePresence key={card.id}>
                    {index <= currentCardIndex && (
                      <motion.div
                        initial={{ 
                          scale: 0,
                          rotateY: 180,
                          opacity: 0,
                        }}
                        animate={{ 
                          scale: 1,
                          rotateY: 0,
                          opacity: 1,
                        }}
                        transition={{
                          duration: 0.6,
                          ease: 'easeOut',
                          delay: index === currentCardIndex ? 0 : 0,
                        }}
                      >
                        <GameCard
                          card={card}
                          size="medium"
                          showStats={true}
                          interactive={false}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
              </div>

              {state === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center space-y-4"
                >
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={handleClose}
                  >
                    Continue
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Pack selection component
export interface PackSelectorProps {
  packs: Pack[];
  onPackSelect: (pack: Pack) => void;
  userCoins?: number;
  className?: string;
}

export function PackSelector({ 
  packs, 
  onPackSelect, 
  userCoins = 0,
  className 
}: PackSelectorProps) {
  return (
    <div className={cn('grid gap-6 md:grid-cols-2 lg:grid-cols-3', className)}>
      {packs.map((pack) => {
        const canAfford = userCoins >= pack.cost;
        
        return (
          <motion.div
            key={pack.id}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-lg)] p-6 cursor-pointer transition-all duration-200',
              canAfford 
                ? 'hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary-500)]' 
                : 'opacity-60 cursor-not-allowed'
            )}
            onClick={() => canAfford && onPackSelect(pack)}
          >
            <div className="space-y-4">
              {/* Pack Image */}
              <div className={cn(
                'w-full h-32 bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg border-2 flex items-center justify-center',
                `border-[var(--color-rarity-${pack.rarity})]`
              )}>
                {pack.imageUrl ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <Image
                      src={pack.imageUrl}
                      alt={pack.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <Package className="w-8 h-8 text-[var(--text-secondary)]" />
                )}
              </div>

              {/* Pack Info */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {pack.name}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                  {pack.description}
                </p>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--text-secondary)]">
                    {pack.cardCount} cards
                  </span>
                  <span className={`text-[var(--color-rarity-${pack.rarity})] font-medium`}>
                    {pack.rarity}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-bold text-[var(--color-primary-500)]">
                    {pack.cost} coins
                  </span>
                  {!canAfford && (
                    <span className="text-xs text-[var(--color-error)]">
                      Insufficient coins
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}