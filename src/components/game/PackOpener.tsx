'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { apiUrl } from '@/lib/utils/api-helpers';
import { CardDisplay } from './CardDisplay';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface PackOpenerProps {
  timerId: string;
  packType: 'humanoid' | 'weapon';
  onComplete: (cards: Card[]) => void;
  onCancel: () => void;
}

export function PackOpener({ timerId, packType, onComplete, onCancel }: PackOpenerProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAllCards, setShowAllCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPack = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to open packs');
      }
      
      // Use apiUrl helper to ensure correct port
      const response = await fetch(apiUrl('/api/timers/open'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ timerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Failed to open pack';
        
        // Handle specific error cases
        if (response.status === 400) {
          if (errorData.error?.includes('No ') && errorData.error?.includes('packs available')) {
            errorMessage = `You don't have any ${packType} packs to open!`;
          } else if (errorData.error?.includes('Timer is not yet ready')) {
            errorMessage = 'This pack is not ready to be opened yet!';
          } else {
            errorMessage = errorData.error || 'Invalid request';
          }
        } else if (response.status === 401) {
          errorMessage = 'Please log in to open packs';
        } else if (response.status === 404) {
          errorMessage = 'Pack not found';
        } else if (response.status === 500) {
          // Check for specific database errors
          if (errorData.error?.includes('No ') && errorData.error?.includes('packs available')) {
            errorMessage = `You don't have any ${packType} packs to open!`;
          } else {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Assuming the API returns an array of cards
      if (Array.isArray(data)) {
        setRevealedCards(data);
      } else {
        // If it's a single card, wrap it in an array
        setRevealedCards([data]);
      }
      
      // Start revealing cards by setting the first card index
      setCurrentCardIndex(0);
      
    } catch (err) {
      console.error('Error opening pack:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to open pack';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Only cancel if it's not an inventory-related error
      if (!errorMessage.includes("don't have any")) {
        onCancel();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPack = () => {
    if (isOpening || isLoading) return;
    setIsOpening(true);
    openPack();
  };



  const handleComplete = useCallback(() => {
    onComplete([...revealedCards]);
  }, [revealedCards, onComplete]);

  // Handle card reveal animation
  useEffect(() => {
    if (revealedCards.length === 0) return;
    
    if (currentCardIndex < revealedCards.length - 1) {
      const timer = setTimeout(() => {
        setCurrentCardIndex(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else if (currentCardIndex === revealedCards.length - 1) {
      const timer = setTimeout(() => {
        setShowAllCards(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentCardIndex, revealedCards.length]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="relative w-full max-w-4xl">
        {!isOpening ? (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-white mb-4">
                {packType === 'humanoid' ? 'Humanoid' : 'Weapon'} Booster
              </h2>
              <p className="text-gray-300 mb-8">
                Open this booster to reveal your new card!
              </p>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOpenPack}
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Opening...' : 'Open Booster'}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-500 mt-2 text-center">
                  {error}
                </p>
              )}
            </motion.div>
          </div>
        ) : (
          <div className="relative">
            <AnimatePresence>
              {!showAllCards ? (
                <motion.div
                  key="single-card"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  className="absolute left-1/2 -translate-x-1/2"
                >
                  <div className="w-full max-w-xs mx-auto">
                    <CardDisplay 
                      card={revealedCards[currentCardIndex] || null} 
                      isRevealed={true}
                      className="mx-auto"
                    />
                    <p className="text-center text-white mt-2 text-sm">
                      Card {currentCardIndex + 1} of {revealedCards.length}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <motion.div
                    key="all-cards"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                  >
                    {revealedCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="w-full"
                      >
                        <CardDisplay 
                          card={card} 
                          isRevealed={true}
                          className="w-full"
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                  <div className="text-center text-white mt-4">
                    <p className="text-lg font-medium">New card added to your collection!</p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {showAllCards && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
              >
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}