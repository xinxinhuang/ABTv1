'use client';

import { motion } from 'framer-motion';
import { Card } from '@/types/game';

interface BattleResultsProps {
  result: {
    winner: 'player1' | 'player2' | 'draw' | null;
    message: string;
  };
  player1Card: Card | null;
  player2Card: Card | null;
  onPlayAgain: () => void;
}

export function BattleResults({
  result,
  player1Card,
  player2Card,
  onPlayAgain
}: BattleResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-sm p-8 rounded-lg shadow-lg mt-8 text-center"
    >
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-4">
          {result.winner === 'player1' && 'Player 1 Wins!'}
          {result.winner === 'player2' && 'Player 2 Wins!'}
          {result.winner === 'draw' && "It's a Draw!"}
          {result.winner === null && 'Battle Error'}
        </h2>
        
        <div className={`text-xl mb-4 ${
          result.winner === 'player1' ? 'text-blue-400' : 
          result.winner === 'player2' ? 'text-red-400' : 
          'text-gray-400'
        }`}>
          {result.message}
        </div>
      </div>
      
      <div className="flex justify-around mb-8">
        <div className={`text-center p-4 rounded ${result.winner === 'player1' ? 'bg-blue-500/20 ring-2 ring-blue-500' : ''}`}>
          <div className="text-lg font-medium mb-2">Player 1</div>
          <div className="mb-1">Card: {player1Card?.card_name}</div>
          <div className="text-sm">
            STR: {player1Card?.attributes.str} | 
            DEX: {player1Card?.attributes.dex} | 
            INT: {player1Card?.attributes.int}
          </div>
        </div>
        
        <div className={`text-center p-4 rounded ${result.winner === 'player2' ? 'bg-red-500/20 ring-2 ring-red-500' : ''}`}>
          <div className="text-lg font-medium mb-2">Player 2</div>
          <div className="mb-1">Card: {player2Card?.card_name}</div>
          <div className="text-sm">
            STR: {player2Card?.attributes.str} | 
            DEX: {player2Card?.attributes.dex} | 
            INT: {player2Card?.attributes.int}
          </div>
        </div>
      </div>
      
      <div className="battle-stats mb-8 text-sm bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Battle Analysis</h3>
        {player1Card && player2Card && (
          <div>
            <p className="mb-2">
              <span className="font-medium text-blue-400">Player 1:</span> {player1Card.card_name} ({player1Card.rarity}) 
              {player1Card.card_name === 'Space Marine' && ' - Strong against Galactic Ranger'}
              {player1Card.card_name === 'Galactic Ranger' && ' - Strong against Void Sorcerer'}
              {player1Card.card_name === 'Void Sorcerer' && ' - Strong against Space Marine'}
            </p>
            <p>
              <span className="font-medium text-red-400">Player 2:</span> {player2Card.card_name} ({player2Card.rarity})
              {player2Card.card_name === 'Space Marine' && ' - Strong against Galactic Ranger'}
              {player2Card.card_name === 'Galactic Ranger' && ' - Strong against Void Sorcerer'}
              {player2Card.card_name === 'Void Sorcerer' && ' - Strong against Space Marine'}
            </p>
          </div>
        )}
      </div>
      
      <button
        onClick={onPlayAgain}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-medium hover:from-purple-700 hover:to-blue-700 transition-colors"
      >
        Battle Again!
      </button>
    </motion.div>
  );
}
