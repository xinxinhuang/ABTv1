/**
 * CardsRevealedPhase Component V2
 * Shows both players' humanoid cards with reveal animation and countdown
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Sword, Shield, Brain, Clock, Zap } from 'lucide-react';
import { BattleInstance, HumanoidCard } from '@/types/battle-v2';
import { User } from '@supabase/supabase-js';
import { CardDisplay } from '../../CardDisplay';
import { useCountdownTimerWithWarnings } from '@/hooks/battle-v2/useCountdownTimer';
import { useBattleActions } from '@/hooks/battle-v2/useBattleActions';
import { calculateBattleResult, formatTimeRemaining, getCardRarityColor } from '@/lib/battle-v2/utils';
import { BATTLE_CONFIG } from '@/lib/battle-v2/types';

interface CardsRevealedPhaseProps {
  battle: BattleInstance;
  playerCard: HumanoidCard;
  opponentCard: HumanoidCard;
  user: User;
  onResolutionTriggered?: () => void;
}

export const CardsRevealedPhase: React.FC<CardsRevealedPhaseProps> = ({
  battle,
  playerCard,
  opponentCard,
  user,
  onResolutionTriggered
}) => {
  const [cardsRevealed, setCardsRevealed] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [battlePreview, setBattlePreview] = useState<any>(null);

  // Hooks
  const { triggerResolution, isProcessing } = useBattleActions(battle.id);
  
  const countdown = useCountdownTimerWithWarnings(
    [5, 3, 1], // Warning at 5, 3, 1 seconds
    async () => {
      // Auto-trigger resolution when countdown completes
      try {
        console.log('Auto-triggering battle resolution for battle:', battle.id);
        await triggerResolution();
        if (onResolutionTriggered) {
          onResolutionTriggered();
        }
      } catch (error) {
        console.error('Auto-resolution failed:', error);
        // Show error to user
        alert(`Auto-resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Restart countdown if resolution fails
        countdown.start(BATTLE_CONFIG.CARDS_REVEALED_COUNTDOWN);
      }
    },
    (seconds) => {
      console.log(`Battle auto-resolution in ${seconds} seconds for battle ${battle.id}`);
    }
  );

  // Determine which card belongs to which player
  const isPlayerCard1 = playerCard.player_id === user.id;
  const userCard = playerCard;
  const enemyCard = opponentCard;

  // Card reveal animation sequence
  useEffect(() => {
    const revealSequence = async () => {
      console.log('Starting card reveal sequence for battle:', battle.id);
      
      // Start countdown immediately
      countdown.start(BATTLE_CONFIG.CARDS_REVEALED_COUNTDOWN);
      
      // Reveal cards with animation delay
      setTimeout(() => {
        setCardsRevealed(true);
      }, 500);

      // Show comparison after cards are revealed
      setTimeout(() => {
        setShowComparison(true);
        
        // Calculate battle preview
        const preview = calculateBattleResult(userCard, enemyCard);
        setBattlePreview(preview);
        console.log('Battle preview calculated:', preview);
      }, 1500);
    };

    revealSequence();
    
    // Listen for battle resolution errors
    const handleResolutionError = (event: any) => {
      if (event.detail?.type === 'battle_resolution_error' && 
          event.detail?.battleId === battle.id) {
        console.error('Battle resolution error detected:', event.detail);
        // Restart countdown with a longer duration
        countdown.stop();
        countdown.start(BATTLE_CONFIG.CARDS_REVEALED_COUNTDOWN * 2);
      }
    };
    
    // Add event listener for custom battle resolution error events
    window.addEventListener('battle_resolution_error', handleResolutionError);
    
    // Cleanup function
    return () => {
      countdown.stop();
      window.removeEventListener('battle_resolution_error', handleResolutionError);
    };
  }, [userCard, enemyCard, countdown, battle.id]);

  // Manual resolution trigger
  const handleManualResolution = async () => {
    try {
      countdown.stop();
      console.log('Manually triggering battle resolution for battle:', battle.id);
      await triggerResolution();
      if (onResolutionTriggered) {
        onResolutionTriggered();
      }
    } catch (error) {
      console.error('Manual resolution failed:', error);
      // Show error to user
      alert(`Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Restart countdown if resolution fails
      countdown.start(BATTLE_CONFIG.CARDS_REVEALED_COUNTDOWN);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with countdown */}
      <div className="text-center p-6 bg-gradient-to-r from-purple-900/30 to-red-900/30 border border-purple-500/50 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-2">Cards Revealed!</h1>
        <div className="flex items-center justify-center space-x-4">
          <Clock className="h-6 w-6 text-yellow-400" />
          <span className="text-2xl font-bold text-yellow-400">
            {formatTimeRemaining(countdown.seconds)}
          </span>
          <span className="text-gray-300">until auto-resolution</span>
        </div>
        {countdown.seconds <= 5 && countdown.seconds > 0 && (
          <p className="text-red-400 font-semibold mt-2 animate-pulse">
            ⚠️ Battle resolving soon!
          </p>
        )}
      </div>

      {/* Cards Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Player Card */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-blue-400 mb-2">Your Card</h2>
            <p className="text-gray-400">Fighting for victory</p>
          </div>
          
          <div className={`transform transition-all duration-1000 ${
            cardsRevealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}>
            <div className="relative">
              <div className="p-4 bg-blue-900/20 border-2 border-blue-500 rounded-lg">
                <CardDisplay card={userCard} isRevealed={true} />
                
                {/* Card Stats */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{userCard.card_name}</span>
                    <span className={`font-bold ${getCardRarityColor(userCard.rarity)}`}>
                      {userCard.rarity.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center space-y-1">
                      <Sword className="h-5 w-5 text-red-400" />
                      <span className="text-sm text-gray-400">STR</span>
                      <span className="text-xl font-bold text-white">{userCard.attributes.str}</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <span className="text-sm text-gray-400">DEX</span>
                      <span className="text-xl font-bold text-white">{userCard.attributes.dex}</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Brain className="h-5 w-5 text-purple-400" />
                      <span className="text-sm text-gray-400">INT</span>
                      <span className="text-xl font-bold text-white">{userCard.attributes.int}</span>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2 border-t border-gray-600">
                    <span className="text-lg font-bold text-blue-400">
                      Total: {userCard.attributes.str + userCard.attributes.dex + userCard.attributes.int}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Opponent Card */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Opponent's Card</h2>
            <p className="text-gray-400">Your challenger</p>
          </div>
          
          <div className={`transform transition-all duration-1000 delay-300 ${
            cardsRevealed ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}>
            <div className="relative">
              <div className="p-4 bg-red-900/20 border-2 border-red-500 rounded-lg">
                <CardDisplay card={enemyCard} isRevealed={true} />
                
                {/* Card Stats */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{enemyCard.card_name}</span>
                    <span className={`font-bold ${getCardRarityColor(enemyCard.rarity)}`}>
                      {enemyCard.rarity.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center space-y-1">
                      <Sword className="h-5 w-5 text-red-400" />
                      <span className="text-sm text-gray-400">STR</span>
                      <span className="text-xl font-bold text-white">{enemyCard.attributes.str}</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <span className="text-sm text-gray-400">DEX</span>
                      <span className="text-xl font-bold text-white">{enemyCard.attributes.dex}</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <Brain className="h-5 w-5 text-purple-400" />
                      <span className="text-sm text-gray-400">INT</span>
                      <span className="text-xl font-bold text-white">{enemyCard.attributes.int}</span>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2 border-t border-gray-600">
                    <span className="text-lg font-bold text-red-400">
                      Total: {enemyCard.attributes.str + enemyCard.attributes.dex + enemyCard.attributes.int}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Battle Comparison */}
      {showComparison && battlePreview && (
        <div className={`transform transition-all duration-1000 ${
          showComparison ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="p-6 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-600 rounded-lg">
            <h3 className="text-xl font-bold text-center text-white mb-4">Battle Preview</h3>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              {battlePreview.attributeComparisons.map((comp: any, index: number) => (
                <div key={comp.attribute} className="space-y-2">
                  <div className="text-sm font-medium text-gray-400 uppercase">
                    {comp.attribute}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold ${
                      comp.winner === 'player' ? 'text-green-400' : 
                      comp.winner === 'opponent' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {comp.playerValue}
                    </span>
                    <span className="text-gray-500">vs</span>
                    <span className={`font-bold ${
                      comp.winner === 'opponent' ? 'text-green-400' : 
                      comp.winner === 'player' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {comp.opponentValue}
                    </span>
                  </div>
                  <div className="text-xs">
                    {comp.winner === 'player' ? '🏆 You win' : 
                     comp.winner === 'opponent' ? '💀 They win' : '🤝 Tie'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <div className={`text-2xl font-bold ${
                battlePreview.winner === 'player' ? 'text-green-400' : 
                battlePreview.winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {battlePreview.winner === 'player' ? '🎉 You are likely to win!' : 
                 battlePreview.winner === 'opponent' ? '😤 Tough fight ahead!' : '⚔️ Even match!'}
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Score: You {battlePreview.playerScore} - {battlePreview.opponentScore} Opponent
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Resolution Button */}
      <div className="text-center">
        <button
          onClick={handleManualResolution}
          disabled={isProcessing}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          {isProcessing ? (
            <span className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Resolving Battle...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Resolve Battle Now</span>
            </span>
          )}
        </button>
        <p className="text-sm text-gray-400 mt-2">
          Or wait for automatic resolution in {formatTimeRemaining(countdown.seconds)}
        </p>
      </div>
    </div>
  );
};