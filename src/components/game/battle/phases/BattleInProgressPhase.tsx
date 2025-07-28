'use client';

import React from 'react';

import { Card } from '@/types/game';

import { BattleGrid } from '../BattleGrid';

interface BattleInProgressPhaseProps {
  battle: BattleInstance;
  player1Card: Card | null;
  player2Card: Card | null;
  onResolveBattle: () => void;
}

export const BattleInProgressPhase: React.FC<BattleInProgressPhaseProps> = ({
  battle,
  player1Card,
  player2Card,
  onResolveBattle,
}) => {
  return (
    <div className="space-y-4">
      <div className="text-center p-4 bg-orange-900/20 border border-orange-500 rounded-lg">
        <h2 className="text-xl font-bold text-orange-400">⚔️ Battle In Progress</h2>
        <p className="text-gray-400">The battle is being resolved...</p>
      </div>
      
      <BattleGrid 
        battle={battle} 
        player1Card={player1Card} 
        player2Card={player2Card} 
        onResolveBattle={onResolveBattle}
      />
    </div>
  );
};