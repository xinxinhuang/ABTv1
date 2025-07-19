'use client';

import React from 'react';
import { BattleInstance, BattleSelection } from '@/types/battle';
import { Card } from '@/types/game';
import { User } from '@supabase/supabase-js';
import { CardSelectionPhase } from './CardSelectionPhase';
import { CardsRevealedPhase } from './CardsRevealedPhase';
import { BattleInProgressPhase } from './BattleInProgressPhase';
import { BattleCompletedPhase } from './BattleCompletedPhase';

interface BattlePhaseRendererProps {
  battle: BattleInstance | null;
  selection: BattleSelection | null;
  player1Card: Card | null;
  player2Card: Card | null;
  user: User | null;
  countdownSeconds: number;
  checkingSelection?: boolean;
  playerHasSelected?: boolean;
  opponentHasSelected?: boolean;
  lastUpdateTime?: string;
  onCardSelection: (cardId: string) => void;
  onResolveBattle: () => void;
  onReturnToGame: () => void;
  onFindNewBattle: () => void;
}

export const BattlePhaseRenderer: React.FC<BattlePhaseRendererProps> = ({
  battle,
  selection,
  player1Card,
  player2Card,
  user,
  countdownSeconds,
  checkingSelection = false,
  playerHasSelected = false,
  opponentHasSelected = false,
  lastUpdateTime = '',
  onCardSelection,
  onResolveBattle,
  onReturnToGame,
  onFindNewBattle,
}) => {
  // Return error state if required data is missing
  if (!battle) {
    return (
      <div className="p-4 text-xl font-bold text-red-500">
        Battle not found.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-xl font-bold text-red-500">
        User not authenticated.
      </div>
    );
  }

  // Determine battle phase and render appropriate component
  switch (battle.status) {
    case 'active':
      return (
        <CardSelectionPhase
          battle={battle}
          selection={selection}
          user={user}
          onCardSelection={onCardSelection}
          checkingSelection={checkingSelection}
          playerHasSelected={playerHasSelected}
          opponentHasSelected={opponentHasSelected}
          lastUpdateTime={lastUpdateTime}
        />
      );

    case 'cards_revealed':
      return (
        <CardsRevealedPhase
          battle={battle}
          player1Card={player1Card}
          player2Card={player2Card}
          user={user}
          countdownSeconds={countdownSeconds}
        />
      );

    case 'in_progress':
      return (
        <BattleInProgressPhase
          battle={battle}
          player1Card={player1Card}
          player2Card={player2Card}
          onResolveBattle={onResolveBattle}
        />
      );

    case 'completed':
      return (
        <BattleCompletedPhase
          battle={battle}
          player1Card={player1Card}
          player2Card={player2Card}
          user={user}
          onReturnToGame={onReturnToGame}
          onFindNewBattle={onFindNewBattle}
        />
      );

    default:
      return (
        <div className="p-4 text-xl font-bold text-yellow-500">
          Unhandled battle status: {battle.status}
        </div>
      );
  }
};