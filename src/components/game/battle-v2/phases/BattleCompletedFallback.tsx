/**
 * BattleCompletedFallback Component
 * Shows battle completion information when card data is not available
 * Fetches battle result data to provide detailed loss/victory information
 */

'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw, Sword, Brain, Zap, Calendar, Clock, Target } from 'lucide-react';
import { User } from '@supabase/supabase-js';

import { BattleInstance, HumanoidCard } from '@/types/battle-consolidated';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { isHumanoidCard } from '@/lib/battle-v2/validation';
import { getCardRarityColor } from '@/lib/battle-v2/utils';

interface CardOwnershipHistory {
  id: string;
  card_id: string;
  previous_owner_id: string;
  new_owner_id: string;
  transfer_type: string;
  battle_id: string;
  transferred_at: string;
}

interface BattleCompletedFallbackProps {
  battle: BattleInstance;
  user: User;
  onReturnToLobby?: () => void;
  onFindNewBattle?: () => void;
  onRefresh?: () => void;
}

export const BattleCompletedFallback: React.FC<BattleCompletedFallbackProps> = ({
  battle,
  user,
  onReturnToLobby,
  onFindNewBattle,
  onRefresh
}) => {
  const [cardTransfer, setCardTransfer] = useState<CardOwnershipHistory | null>(null);
  const [lostCard, setLostCard] = useState<HumanoidCard | null>(null);
  const [opponentCard, setOpponentCard] = useState<HumanoidCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [battleDuration, setBattleDuration] = useState<string>('');

  const supabase = createClient();
  const userWon = battle.winner_id === user.id;

  // Calculate battle duration
  useEffect(() => {
    if (battle.created_at && battle.completed_at) {
      const start = new Date(battle.created_at);
      const end = new Date(battle.completed_at);
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      setBattleDuration(`${diffMins}m ${diffSecs}s`);
    }
  }, [battle.created_at, battle.completed_at]);

  // Fetch battle result and card information
  useEffect(() => {
    const fetchBattleResult = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the cards that were used in the battle
        const { data: battleCards, error: cardsError } = await supabase
          .from('battle_cards')
          .select('player_id, card_id')
          .eq('battle_id', battle.id);

        if (cardsError || !battleCards) {
          throw new Error('Failed to fetch battle cards');
        }

        const userCardEntry = battleCards.find(c => c.player_id === user.id);
        const opponentCardEntry = battleCards.find(c => c.player_id !== user.id);

        if (!userCardEntry || !opponentCardEntry) {
          throw new Error('Could not find card entries for both players');
        }

        // Try to fetch card ownership history to understand what was transferred
        try {
          const { data: transferHistory, error: transferError } = await supabase
            .from('card_ownership_history')
            .select('*')
            .eq('battle_id', battle.id)
            .single();

          if (transferError) {
            console.log('No card transfer history found, battle may not have involved card transfer');
          } else {
            setCardTransfer(transferHistory);
          }
        } catch (transferErr) {
          console.log('Card ownership history table may not exist, skipping transfer data');
        }

        // Fetch the actual card data
        const cardIds = [userCardEntry.card_id, opponentCardEntry.card_id];
        const { data: allCards, error: allCardsError } = await supabase
          .from('player_cards')
          .select('*')
          .in('id', cardIds);

        if (allCardsError || !allCards) {
          throw new Error('Failed to fetch card details');
        }

        // Find and set the cards
        const userCard = allCards.find(c => c.id === userCardEntry.card_id);
        const opponentCardData = allCards.find(c => c.id === opponentCardEntry.card_id);

        if (userCard && isHumanoidCard(userCard)) {
          setLostCard(userCard);
        }

        if (opponentCardData && isHumanoidCard(opponentCardData)) {
          setOpponentCard(opponentCardData);
        }

      } catch (err) {
        console.error('Error fetching battle result:', err);
        setError(err instanceof Error ? err.message : 'Failed to load battle result');
      } finally {
        setLoading(false);
      }
    };

    fetchBattleResult();
  }, [battle.id, user.id, supabase]);

  const handleReturnToLobby = () => {
    if (onReturnToLobby) {
      onReturnToLobby();
    }
  };

  const handleFindNewBattle = () => {
    if (onFindNewBattle) {
      onFindNewBattle();
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-800/50 border border-gray-600 rounded-lg text-center">
        <RefreshCw className="h-16 w-16 animate-spin text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Loading Battle Results</h2>
        <p className="text-gray-400">
          Fetching detailed battle information...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-900/20 border border-red-500 rounded-lg text-center">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-400 mb-2">Error Loading Battle Results</h2>
        <p className="text-red-300 mb-4">{error}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          <button
            onClick={handleReturnToLobby}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  // We can proceed even without card transfer data since we have the battle result

  return (
    <div className="space-y-8">
      {/* Victory/Defeat Header */}
      <div className={`text-center p-8 rounded-lg border-2 ${
        userWon 
          ? 'bg-gradient-to-r from-green-900/30 to-yellow-900/30 border-green-400' 
          : 'bg-gradient-to-r from-red-900/30 to-gray-900/30 border-red-400'
      }`}>
        <div className="space-y-4">
          {userWon ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h1 className="text-4xl font-bold text-green-400">Victory!</h1>
              <p className="text-xl text-green-300">Congratulations! You won the battle!</p>
              {opponentCard && (
                <p className="text-lg text-green-200">
                  You gained your opponent's <span className={`font-bold ${getCardRarityColor(opponentCard.rarity)}`}>
                    {opponentCard.card_name}
                  </span>!
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💔</div>
              <h1 className="text-4xl font-bold text-red-400">Defeat</h1>
              <p className="text-xl text-red-300">Your card has been lost in battle</p>
              {lostCard && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                  <p className="text-lg text-red-200 mb-2">
                    <strong>Card Lost:</strong>
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <span className="text-2xl font-bold text-white">{lostCard.card_name}</span>
                    <span className={`font-bold text-lg ${getCardRarityColor(lostCard.rarity)}`}>
                      {lostCard.rarity.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-1">
                      <Sword className="h-4 w-4 text-red-400" />
                      <span>STR: {lostCard.attributes.str}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span>DEX: {lostCard.attributes.dex}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Brain className="h-4 w-4 text-purple-400" />
                      <span>INT: {lostCard.attributes.int}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    Total Power: {lostCard.attributes.str + lostCard.attributes.dex + lostCard.attributes.int}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Battle Info */}
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-400 mt-4">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(battle.completed_at || '').toLocaleDateString()}</span>
            </div>
            {battleDuration && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Duration: {battleDuration}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Battle Explanation */}
      {battle.explanation && (
        <div className="p-6 bg-gray-800/50 border border-gray-600 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Battle Analysis</span>
          </h3>
          <div className="p-4 bg-gray-900/50 rounded border border-gray-700">
            <p className="text-gray-300 leading-relaxed">
              {battle.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Opponent Card Info (if available) */}
      {opponentCard && (
        <div className="p-6 bg-gray-800/50 border border-gray-600 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4">Opponent's Card</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xl font-bold text-white">{opponentCard.card_name}</span>
              <span className={`ml-3 font-bold ${getCardRarityColor(opponentCard.rarity)}`}>
                {opponentCard.rarity.toUpperCase()}
              </span>
            </div>
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Sword className="h-4 w-4 text-red-400" />
                <span>STR: {opponentCard.attributes.str}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span>DEX: {opponentCard.attributes.dex}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Brain className="h-4 w-4 text-purple-400" />
                <span>INT: {opponentCard.attributes.int}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-400">
            Total Power: {opponentCard.attributes.str + opponentCard.attributes.dex + opponentCard.attributes.int}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <Button
          onClick={handleFindNewBattle}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 text-lg"
        >
          <RotateCcw className="h-5 w-5" />
          <span>Find New Battle</span>
        </Button>
        
        <Button
          onClick={handleReturnToLobby}
          variant="outline"
          className="flex items-center space-x-2 border-gray-600 text-gray-300 hover:bg-gray-800 px-8 py-3 text-lg"
        >
          <Home className="h-5 w-5" />
          <span>Return to Lobby</span>
        </Button>
      </div>

      {/* Motivational Message */}
      <div className="text-center p-4 bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-lg border border-gray-600">
        {userWon ? (
          <p className="text-green-300">
            🎉 <strong>Well fought!</strong> Your strategic card choice led you to victory. 
            Keep building your collection to dominate future battles!
          </p>
        ) : (
          <p className="text-blue-300">
            💪 <strong>Every defeat teaches us something!</strong> Your {lostCard?.card_name || 'card'} fought valiantly. 
            Collect stronger cards and return to claim victory!
          </p>
        )}
      </div>

      {/* Refresh Option */}
      <div className="text-center">
        <button
          onClick={handleRefresh}
          className="text-sm text-gray-400 hover:text-gray-300 underline"
        >
          Try loading full battle details again
        </button>
      </div>
    </div>
  );
};