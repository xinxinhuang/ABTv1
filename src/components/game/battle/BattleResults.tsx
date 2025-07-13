'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useUser } from '../../../hooks/useUser';
import { BattleInstance, BattleSelection } from '@/types/battle';

interface BattleResultsProps {
  battle: BattleInstance;
  selections: BattleSelection[];
  onClose: () => void;
}

export const BattleResults = ({ battle, selections, onClose }: BattleResultsProps) => {
  const { user } = useUser();

  if (!user) return null;

  const isChallenger = user.id === battle.challenger_id;
  // Determine if the current user is the winner based on winner_id
  const isWinner = battle.winner_id === user.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center p-8 bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-auto"
    >
      <motion.h1
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
        className={`text-6xl font-bold mb-4 ${isWinner ? 'text-green-400' : 'text-red-500'}`}
      >
        {isWinner ? 'You Win!' : 'You Lose!'}
      </motion.h1>

      <p className="text-gray-300 mb-8">The battle has concluded.</p>

      <div className="mt-8">
        <Button
          onClick={onClose}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
        >
          Back to Lobby
        </Button>
      </div>
    </motion.div>
  );
};
