'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { apiUrl } from '@/lib/utils/api-helpers';
import { CardDisplay } from './CardDisplay';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { SparklesText } from '@/components/ui/sparkles-text';

interface PackOpenerProps {
  timerId: string;
  packType: 'humanoid' | 'weapon';
  onComplete: (cards: Card[]) => void;
  onCancel: () => void;
}

export function PackOpener({ timerId, packType, onComplete, onCancel }: PackOpenerProps) {
  const [stage, setStage] = useState<'confirm' | 'opening' | 'revealing' | 'complete'>('confirm');
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPack = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to open packs');
      }
      
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
          if (errorData.error?.includes('No ') && errorData.error?.includes('packs available')) {
            errorMessage = `You don't have any ${packType} packs to open!`;
          } else {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const revealedCards = Array.isArray(data) ? data : [data.card];
      
      setCards(revealedCards);
      setStage('revealing');
      
    } catch (err) {
      console.error('Error opening pack:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to open pack';
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (!errorMessage.includes("don't have any")) {
        onCancel();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPack = () => {
    if (isLoading) return;
    setStage('opening');
    
    // Add a brief delay for the opening animation
    setTimeout(() => {
      openPack();
    }, 1000);
  };

  const handleComplete = useCallback(() => {
    onComplete([...cards]);
  }, [cards, onComplete]);

  // Auto-progress to complete stage after cards are revealed
  useEffect(() => {
    if (stage === 'revealing' && cards.length > 0) {
      const timer = setTimeout(() => {
        setStage('complete');
      }, 2000); // Show cards for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [stage, cards.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
      <div className="relative w-full max-w-4xl p-8">
        <AnimatePresence mode="wait">
          {stage === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="text-center"
            >
              <SparklesText
                text={`${packType.charAt(0).toUpperCase() + packType.slice(1)} Pack`}
                colors={{ first: packType === 'humanoid' ? '#60a5fa' : '#a78bfa', second: packType === 'humanoid' ? '#3b82f6' : '#8b5cf6' }}
                className="text-3xl md:text-5xl font-bold mb-8"
                sparklesCount={8}
              />
              
              <div className="mb-8 text-gray-300">
                <p className="text-xl mb-4">Ready to reveal your new cards?</p>
                <div className="text-6xl mb-4">📦</div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl transition-colors disabled:opacity-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOpenPack}
                  disabled={isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl transition-all disabled:opacity-50 font-semibold transform hover:scale-105"
                >
                  {isLoading ? 'Opening...' : 'Open Pack'}
                </button>
              </div>
              
              {error && (
                <p className="text-red-400 mt-4 text-center">{error}</p>
              )}
            </motion.div>
          )}

          {stage === 'opening' && (
            <motion.div
              key="opening"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop"
                }}
                className="text-8xl mb-8"
              >
                📦
              </motion.div>
              
              <SparklesText
                text="Opening Pack..."
                colors={{ first: '#ffd43b', second: '#fab005' }}
                className="text-2xl md:text-4xl font-bold"
                sparklesCount={12}
              />
            </motion.div>
          )}

          {stage === 'revealing' && (
            <motion.div
              key="revealing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-8"
              >
                <SparklesText
                  text="New Cards!"
                  colors={{ first: '#22c55e', second: '#16a34a' }}
                  className="text-2xl md:text-4xl font-bold"
                  sparklesCount={15}
                />
              </motion.div>
              
              <div className="flex flex-wrap justify-center gap-4">
                {cards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ y: 100, opacity: 0, rotateY: 180 }}
                    animate={{ y: 0, opacity: 1, rotateY: 0 }}
                    transition={{ 
                      delay: index * 0.2,
                      duration: 0.6,
                      type: "spring",
                      stiffness: 100
                    }}
                    className="max-w-xs"
                  >
                    <CardDisplay 
                      card={card} 
                      isRevealed={true}
                      className="transform hover:scale-105 transition-transform"
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === 'complete' && (
            <motion.div
              key="complete"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <SparklesText
                  text="Added to Collection!"
                  colors={{ first: '#ffd43b', second: '#fab005' }}
                  className="text-2xl md:text-4xl font-bold mb-4"
                  sparklesCount={10}
                />
                <p className="text-gray-300 text-lg">
                  {cards.length} new card{cards.length > 1 ? 's' : ''} added to your collection
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {cards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0.8, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="max-w-xs"
                  >
                    <CardDisplay 
                      card={card} 
                      isRevealed={true}
                      className="transform hover:scale-105 transition-transform"
                    />
                  </motion.div>
                ))}
              </div>
              
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-2xl transition-all font-semibold transform hover:scale-105"
              >
                Continue
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}