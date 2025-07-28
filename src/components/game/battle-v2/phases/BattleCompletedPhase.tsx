/**
 * BattleCompletedPhase Component V2
 * Shows final battle results with winner/loser information and navigation options
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Target, RotateCcw, Home, Sword, Brain, Zap, Calendar, Clock } from 'lucide-react';
import { User } from '@supabase/supabase-js';

import { BattleInstance, HumanoidCard } from '@/types/battle-consolidated';
import { Button } from '@/components/ui/Button';
import { calculateBattleResult, getCardRarityColor } from '@/lib/battle-v2/utils';

import { CardDisplay } from '@/components/game/CardDisplay';

interface BattleCompletedPhaseProps {
  battle: BattleInstance;
  playerCard: HumanoidCard;
  opponentCard: HumanoidCard;
  user: User;
  onReturnToLobby?: () => void;
  onFindNewBattle?: () => void;
}

export const BattleCompletedPhase: React.FC<BattleCompletedPhaseProps> = ({
  battle,
  playerCard,
  opponentCard,
  user,
  onReturnToLobby,
  onFindNewBattle
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [battleDuration, setBattleDuration] = useState<string>('');

  // Determine if user won
  const userWon = battle.winner_id === user.id;
  const isChallenger = user.id === battle.challenger_id;

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

  // Calculate detailed battle result
  useEffect(() => {
    const result = calculateBattleResult(playerCard, opponentCard);
    setBattleResult(result);
    
    // Show celebration animation for winners
    if (userWon) {
      setTimeout(() => setShowCelebration(true), 500);
    }
  }, [playerCard, opponentCard, userWon]);

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

  return (
    <div className="space-y-8">
      {/* Victory/Defeat Header */}
      <div className={`text-center p-8 rounded-lg border-2 ${
        userWon 
          ? 'bg-gradient-to-r from-green-900/30 to-yellow-900/30 border-green-400' 
          : 'bg-gradient-to-r from-red-900/30 to-gray-900/30 border-red-400'
      } ${showCelebration ? 'animate-pulse' : ''}`}>
        <div className="space-y-4">
          {userWon ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h1 className="text-4xl font-bold text-green-400">Victory!</h1>
              <p className="text-xl text-green-300">Congratulations! You won the battle!</p>
              <p className="text-lg text-green-200 mt-2">
                You gained your opponent's <span className={`font-bold ${getCardRarityColor(opponentCard.rarity)}`}>
                  {opponentCard.card_name}
                </span>!
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">💔</div>
              <h1 className="text-4xl font-bold text-red-400">Defeat</h1>
              <p className="text-xl text-red-300">Your card has been lost in battle</p>
              <div className="mt-4 p-4 bg-red-900/30 border border-red-600 rounded-lg">
                <p className="text-lg text-red-200 mb-2">
                  <strong>Card Lost:</strong> <span className={`font-bold ${getCardRarityColor(playerCard.rarity)}`}>
                    {playerCard.card_name}
                  </span>
                </p>
                <p className="text-sm text-red-300">
                  Your {playerCard.rarity} card with {playerCard.attributes.str + playerCard.attributes.dex + playerCard.attributes.int} total power 
                  has been transferred to your opponent.
                </p>
              </div>
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

      {/* Battle Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Player Card Result */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className={`text-2xl font-bold ${userWon ? 'text-green-400' : 'text-red-400'}`}>
              Your Card
            </h2>
            <p className="text-gray-400">
              {userWon ? '🏆 Champion' : '💀 Defeated'}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg border-2 ${
            userWon ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'
          }`}>
            <CardDisplay card={playerCard} isRevealed={true} />
            
            {/* Card Details */}
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{playerCard.card_name}</span>
                <span className={`font-bold ${getCardRarityColor(playerCard.rarity)}`}>
                  {playerCard.rarity.toUpperCase()}
                </span>
              </div>
              
              {/* Attributes with battle results */}
              <div className="space-y-2">
                {battleResult?.attributeComparisons.map((comp: any, index: number) => (
                  <div
                    key={comp.attribute}
                    className={`flex justify-between items-center p-2 rounded ${
                      comp.winner === 'player' 
                        ? 'bg-green-900/30 border border-green-600' 
                        : comp.winner === 'tie'
                        ? 'bg-yellow-900/30 border border-yellow-600'
                        : 'bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {comp.attribute === 'str' && <Sword className="h-4 w-4 text-red-400" />}
                      {comp.attribute === 'dex' && <Zap className="h-4 w-4 text-yellow-400" />}
                      {comp.attribute === 'int' && <Brain className="h-4 w-4 text-purple-400" />}
                      <span className="font-medium">{comp.attribute.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{comp.playerValue}</span>
                      {comp.winner === 'player' && <span className="text-green-400 text-sm">✓</span>}
                      {comp.winner === 'tie' && <span className="text-yellow-400 text-sm">≈</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-3 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-300">Total Power</span>
                  <span className={`text-xl font-bold ${userWon ? 'text-green-400' : 'text-white'}`}>
                    {playerCard.attributes.str + playerCard.attributes.dex + playerCard.attributes.int}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Opponent Card Result */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className={`text-2xl font-bold ${!userWon ? 'text-green-400' : 'text-red-400'}`}>
              Opponent's Card
            </h2>
            <p className="text-gray-400">
              {!userWon ? '🏆 Champion' : '💀 Defeated'}
            </p>
          </div>
          
          <div className={`p-6 rounded-lg border-2 ${
            !userWon ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'
          }`}>
            <CardDisplay card={opponentCard} isRevealed={true} />
            
            {/* Card Details */}
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{opponentCard.card_name}</span>
                <span className={`font-bold ${getCardRarityColor(opponentCard.rarity)}`}>
                  {opponentCard.rarity.toUpperCase()}
                </span>
              </div>
              
              {/* Attributes with battle results */}
              <div className="space-y-2">
                {battleResult?.attributeComparisons.map((comp: any, index: number) => (
                  <div
                    key={comp.attribute}
                    className={`flex justify-between items-center p-2 rounded ${
                      comp.winner === 'opponent' 
                        ? 'bg-green-900/30 border border-green-600' 
                        : comp.winner === 'tie'
                        ? 'bg-yellow-900/30 border border-yellow-600'
                        : 'bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {comp.attribute === 'str' && <Sword className="h-4 w-4 text-red-400" />}
                      {comp.attribute === 'dex' && <Zap className="h-4 w-4 text-yellow-400" />}
                      {comp.attribute === 'int' && <Brain className="h-4 w-4 text-purple-400" />}
                      <span className="font-medium">{comp.attribute.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{comp.opponentValue}</span>
                      {comp.winner === 'opponent' && <span className="text-green-400 text-sm">✓</span>}
                      {comp.winner === 'tie' && <span className="text-yellow-400 text-sm">≈</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-3 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-300">Total Power</span>
                  <span className={`text-xl font-bold ${!userWon ? 'text-green-400' : 'text-white'}`}>
                    {opponentCard.attributes.str + opponentCard.attributes.dex + opponentCard.attributes.int}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Analysis */}
      {battleResult && (
        <div className="p-6 bg-gray-800/50 border border-gray-600 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Battle Analysis</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {battleResult.playerScore}
              </div>
              <div className="text-sm text-gray-400">Your Wins</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg text-gray-400 mb-1">vs</div>
              <div className="text-sm text-gray-500">Final Score</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">
                {battleResult.opponentScore}
              </div>
              <div className="text-sm text-gray-400">Their Wins</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-900/50 rounded border border-gray-700">
            <p className="text-sm text-gray-300 leading-relaxed">
              {battleResult.explanation}
            </p>
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
            You've gained {opponentCard.card_name} to strengthen your collection!
          </p>
        ) : (
          <p className="text-blue-300">
            💪 <strong>Every defeat teaches us something!</strong> Your {playerCard.card_name} fought valiantly but wasn't strong enough this time. 
            Collect more powerful cards and return to reclaim your honor!
          </p>
        )}
      </div>
    </div>
  );
};