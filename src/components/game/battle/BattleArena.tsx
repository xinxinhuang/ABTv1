'use client';

import { motion } from 'framer-motion';
import { Card } from '@/types/game';
import { CardDisplay } from '../CardDisplay';

interface BattleArenaProps {
  player1Card: Card | null;
  player2Card: Card | null;
}

export function BattleArena({ player1Card, player2Card }: BattleArenaProps) {
  return (
    <div className="relative w-full h-[600px] flex items-center justify-center p-4 bg-gray-900/50 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
        <motion.div
          initial={{ x: -200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 50, delay: 0.2 }}
        >
          {player1Card ? (
            <CardDisplay card={player1Card} />
          ) : (
            <div className="w-full h-full bg-gray-800/50 rounded-lg flex items-center justify-center text-white">Player 1's Card</div>
          )}
        </motion.div>

        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 50, delay: 0.2 }}
        >
          {player2Card ? (
            <CardDisplay card={player2Card} />
          ) : (
            <div className="w-full h-full bg-gray-800/50 rounded-lg flex items-center justify-center text-white">Player 2's Card</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
