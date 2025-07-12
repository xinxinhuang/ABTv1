'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useUser } from '../../../hooks/useUser';
import { BattleLobby } from '@/types/battle';

interface BattleResultsProps {
  lobby: BattleLobby;
  onClose: () => void;
}

export const BattleResults = ({ lobby, onClose }: BattleResultsProps) => {
  const { user } = useUser();

  if (!user) return null;

  const isPlayer1 = user.id === lobby.player1_id;
  const winner_key = lobby.status === 'finished_player1_won' ? 'player1' : 'player2';
  const isWinner = (isPlayer1 && winner_key === 'player1') || (!isPlayer1 && winner_key === 'player2');

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
