'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';

interface BattleArenaProps {
  player1Card: Card | null;
  player2Card: Card | null;
  onBattleComplete: (result: {
    winner: 'player1' | 'player2' | 'draw' | null;
    message: string;
  }) => void;
}

export function BattleArena({
  player1Card,
  player2Card,
  onBattleComplete
}: BattleArenaProps) {
  const [battleStage, setBattleStage] = useState<'intro' | 'faceoff' | 'result'>('intro');
  const [battleCount, setBattleCount] = useState(3);

  useEffect(() => {
    if (battleStage === 'intro' && battleCount > 0) {
      const timer = setTimeout(() => {
        setBattleCount(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (battleStage === 'intro' && battleCount === 0) {
      const timer = setTimeout(() => {
        setBattleStage('faceoff');
      }, 500);
      return () => clearTimeout(timer);
    }

    if (battleStage === 'faceoff') {
      const timer = setTimeout(() => {
        setBattleStage('result');
        
        // Determine the winner based on the rock-paper-scissors style battle system
        if (player1Card && player2Card) {
          const result = determineBattleResult(player1Card, player2Card);
          onBattleComplete(result);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [battleStage, battleCount, player1Card, player2Card, onBattleComplete]);

  // Battle logic: Void Sorcerer > Space Marine > Galactic Ranger > Void Sorcerer
  const determineBattleResult = (card1: Card, card2: Card): { winner: 'player1' | 'player2' | 'draw' | null; message: string } => {
    // If cards are the same type, compare their attributes
    if (card1.card_name === card2.card_name) {
      let primaryAttribute: keyof typeof card1.attributes;
      
      switch (card1.card_name) {
        case 'Space Marine':
          primaryAttribute = 'str';
          break;
        case 'Galactic Ranger':
          primaryAttribute = 'dex';
          break;
        case 'Void Sorcerer':
          primaryAttribute = 'int';
          break;
        default:
          return { winner: 'draw', message: 'Battle ended in a draw.' };
      }
      
      const card1Value = card1.attributes[primaryAttribute] || 0;
      const card2Value = card2.attributes[primaryAttribute] || 0;
      
      if (card1Value > card2Value) {
        return { 
          winner: 'player1', 
          message: `Player 1's ${card1.card_name} has higher ${primaryAttribute.toUpperCase()} (${card1Value} vs ${card2Value})!` 
        };
      } else if (card2Value > card1Value) {
        return { 
          winner: 'player2', 
          message: `Player 2's ${card2.card_name} has higher ${primaryAttribute.toUpperCase()} (${card2Value} vs ${card1Value})!` 
        };
      } else {
        return { winner: 'draw', message: 'Battle ended in a draw - equal strength!' };
      }
    }
    
    // Type advantage system: Void Sorcerer > Space Marine > Galactic Ranger > Void Sorcerer
    if (card1.card_name === 'Void Sorcerer' && card2.card_name === 'Space Marine') {
      return { 
        winner: 'player1', 
        message: 'Void Sorcerer\'s mystical powers overwhelm Space Marine!' 
      };
    } else if (card1.card_name === 'Space Marine' && card2.card_name === 'Galactic Ranger') {
      return { 
        winner: 'player1', 
        message: 'Space Marine\'s brute strength overcomes Galactic Ranger!' 
      };
    } else if (card1.card_name === 'Galactic Ranger' && card2.card_name === 'Void Sorcerer') {
      return { 
        winner: 'player1', 
        message: 'Galactic Ranger\'s speed outwits Void Sorcerer!' 
      };
    } else if (card2.card_name === 'Void Sorcerer' && card1.card_name === 'Space Marine') {
      return { 
        winner: 'player2', 
        message: 'Void Sorcerer\'s mystical powers overwhelm Space Marine!' 
      };
    } else if (card2.card_name === 'Space Marine' && card1.card_name === 'Galactic Ranger') {
      return { 
        winner: 'player2', 
        message: 'Space Marine\'s brute strength overcomes Galactic Ranger!' 
      };
    } else if (card2.card_name === 'Galactic Ranger' && card1.card_name === 'Void Sorcerer') {
      return { 
        winner: 'player2', 
        message: 'Galactic Ranger\'s speed outwits Void Sorcerer!' 
      };
    }
    
    return { winner: null, message: 'Error determining battle result.' };
  };

  return (
    <div className="relative min-h-[400px] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-lg mb-8">
      <AnimatePresence>
        {battleStage === 'intro' && (
          <motion.div
            key="countdown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-6xl font-bold text-white">
              {battleCount > 0 ? battleCount : 'BATTLE!'}
            </div>
          </motion.div>
        )}

        {battleStage === 'faceoff' && (
          <div className="flex w-full justify-between px-8">
            <motion.div
              key="player1"
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="text-xl font-bold text-white mb-2">Player 1</div>
              {player1Card && (
                <CardDisplay card={player1Card} isRevealed={true} className="w-48" />
              )}
            </motion.div>

            <motion.div
              key="vs"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center"
            >
              <div className="text-4xl font-bold text-red-500">VS</div>
            </motion.div>

            <motion.div
              key="player2"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="text-xl font-bold text-white mb-2">Player 2</div>
              {player2Card && (
                <CardDisplay card={player2Card} isRevealed={true} className="w-48" />
              )}
            </motion.div>
          </div>
        )}

        {battleStage === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex w-full justify-between px-8"
          >
            <div className="flex flex-col items-center">
              <div className="text-xl font-bold text-white mb-2">Player 1</div>
              {player1Card && (
                <CardDisplay card={player1Card} isRevealed={true} className="w-48" />
              )}
            </div>

            <div className="flex flex-col items-center">
              <div className="text-xl font-bold text-white mb-2">Player 2</div>
              {player2Card && (
                <CardDisplay card={player2Card} isRevealed={true} className="w-48" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
