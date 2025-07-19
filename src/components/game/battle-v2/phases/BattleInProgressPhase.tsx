/**
 * BattleInProgressPhase Component V2
 * Shows battle calculation in progress with animated battle grid
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Sword, Brain, Zap, Target, Clock } from 'lucide-react';
import { BattleInstance, HumanoidCard } from '@/types/battle-v2';
import { CardDisplay } from '../../CardDisplay';
import { calculateBattleResult, getCardRarityColor } from '@/lib/battle-v2/utils';

interface BattleInProgressPhaseProps {
  battle: BattleInstance;
  playerCard: HumanoidCard;
  opponentCard: HumanoidCard;
  onBattleComplete?: () => void;
}

interface BattleStep {
  attribute: 'str' | 'dex' | 'int';
  playerValue: number;
  opponentValue: number;
  winner: 'player' | 'opponent' | 'tie';
  description: string;
}

export const BattleInProgressPhase: React.FC<BattleInProgressPhaseProps> = ({
  battle,
  playerCard,
  opponentCard,
  onBattleComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [battleSteps, setBattleSteps] = useState<BattleStep[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);

  // Initialize battle calculation
  useEffect(() => {
    const initializeBattle = () => {
      // Calculate the full battle result
      const result = calculateBattleResult(playerCard, opponentCard);
      setBattleResult(result);

      // Create battle steps for animation
      const steps: BattleStep[] = result.attributeComparisons.map((comp: any) => ({
        attribute: comp.attribute,
        playerValue: comp.playerValue,
        opponentValue: comp.opponentValue,
        winner: comp.winner,
        description: `${comp.attribute.toUpperCase()} comparison: ${comp.playerValue} vs ${comp.opponentValue}`
      }));

      setBattleSteps(steps);
      
      // Start the battle animation sequence
      setTimeout(() => {
        setIsCalculating(false);
        startBattleSequence();
      }, 2000);
    };

    initializeBattle();
  }, [playerCard, opponentCard]);

  // Animate through battle steps
  const startBattleSequence = () => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = prev + 1;
        
        if (nextStep >= battleSteps.length) {
          clearInterval(stepInterval);
          // Show final result after all steps
          setTimeout(() => {
            setShowResult(true);
            // Notify parent component after showing result
            setTimeout(() => {
              if (onBattleComplete) {
                onBattleComplete();
              }
            }, 3000);
          }, 1000);
          return prev;
        }
        
        return nextStep;
      });
    }, 1500); // 1.5 seconds per step
  };

  const getAttributeIcon = (attribute: string) => {
    switch (attribute) {
      case 'str': return <Sword className="h-6 w-6 text-red-400" />;
      case 'dex': return <Zap className="h-6 w-6 text-yellow-400" />;
      case 'int': return <Brain className="h-6 w-6 text-purple-400" />;
      default: return <Target className="h-6 w-6 text-gray-400" />;
    }
  };

  const getAttributeName = (attribute: string) => {
    switch (attribute) {
      case 'str': return 'Strength';
      case 'dex': return 'Dexterity';
      case 'int': return 'Intelligence';
      default: return attribute;
    }
  };

  if (isCalculating) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6">
        <div className="relative">
          <Loader2 className="h-24 w-24 animate-spin text-purple-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Target className="h-8 w-8 text-white animate-pulse" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Battle in Progress</h2>
          <p className="text-xl text-gray-300">Calculating battle outcome...</p>
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <Clock className="h-4 w-4" />
            <span>This may take a few moments</span>
          </div>
        </div>

        {/* Battle preview cards */}
        <div className="grid grid-cols-2 gap-8 mt-8 opacity-50">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Your Card</h3>
            <div className="w-32 mx-auto">
              <CardDisplay card={playerCard} isRevealed={true} />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Opponent</h3>
            <div className="w-32 mx-auto">
              <CardDisplay card={opponentCard} isRevealed={true} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center p-6 bg-gradient-to-r from-purple-900/30 to-red-900/30 border border-purple-500/50 rounded-lg">
        <h1 className="text-3xl font-bold text-white mb-2">⚔️ Battle Resolution</h1>
        <p className="text-lg text-gray-300">Comparing card attributes...</p>
      </div>

      {/* Battle Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Player Card */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-blue-400">Your Champion</h2>
            <p className="text-sm text-gray-400">{playerCard.card_name}</p>
          </div>
          <div className="p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <CardDisplay card={playerCard} isRevealed={true} />
            <div className="mt-4 space-y-2">
              <div className={`flex justify-between p-2 rounded ${
                currentStep > 0 && battleSteps[0]?.winner === 'player' ? 'bg-green-900/30 border border-green-500' : ''
              }`}>
                <span className="flex items-center space-x-2">
                  <Sword className="h-4 w-4 text-red-400" />
                  <span>STR</span>
                </span>
                <span className="font-bold">{playerCard.attributes.str}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                currentStep > 1 && battleSteps[1]?.winner === 'player' ? 'bg-green-900/30 border border-green-500' : ''
              }`}>
                <span className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span>DEX</span>
                </span>
                <span className="font-bold">{playerCard.attributes.dex}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                currentStep > 2 && battleSteps[2]?.winner === 'player' ? 'bg-green-900/30 border border-green-500' : ''
              }`}>
                <span className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span>INT</span>
                </span>
                <span className="font-bold">{playerCard.attributes.int}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Progress */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-4">Battle Progress</h3>
          </div>

          {/* Attribute Comparisons */}
          <div className="space-y-4">
            {battleSteps.map((step, index) => (
              <div
                key={step.attribute}
                className={`p-4 rounded-lg border transition-all duration-500 ${
                  index < currentStep
                    ? step.winner === 'player'
                      ? 'bg-green-900/30 border-green-500'
                      : step.winner === 'opponent'
                      ? 'bg-red-900/30 border-red-500'
                      : 'bg-yellow-900/30 border-yellow-500'
                    : index === currentStep
                    ? 'bg-blue-900/30 border-blue-500 animate-pulse'
                    : 'bg-gray-800/30 border-gray-600 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getAttributeIcon(step.attribute)}
                    <span className="font-semibold">{getAttributeName(step.attribute)}</span>
                  </div>
                  
                  {index < currentStep && (
                    <div className="text-right">
                      {step.winner === 'player' ? (
                        <span className="text-green-400 font-bold">You Win!</span>
                      ) : step.winner === 'opponent' ? (
                        <span className="text-red-400 font-bold">They Win!</span>
                      ) : (
                        <span className="text-yellow-400 font-bold">Tie!</span>
                      )}
                    </div>
                  )}
                  
                  {index === currentStep && (
                    <div className="text-blue-400 font-semibold animate-pulse">
                      Calculating...
                    </div>
                  )}
                </div>
                
                {index < currentStep && (
                  <div className="mt-2 text-sm text-gray-400">
                    {step.playerValue} vs {step.opponentValue}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Final Result */}
          {showResult && battleResult && (
            <div className={`p-6 rounded-lg border-2 animate-pulse ${
              battleResult.winner === 'player'
                ? 'bg-green-900/30 border-green-400'
                : battleResult.winner === 'opponent'
                ? 'bg-red-900/30 border-red-400'
                : 'bg-yellow-900/30 border-yellow-400'
            }`}>
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${
                  battleResult.winner === 'player'
                    ? 'text-green-400'
                    : battleResult.winner === 'opponent'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}>
                  {battleResult.winner === 'player'
                    ? '🎉 Victory!'
                    : battleResult.winner === 'opponent'
                    ? '💀 Defeat!'
                    : '🤝 Draw!'}
                </div>
                <p className="text-lg text-gray-300">
                  Final Score: {battleResult.playerScore} - {battleResult.opponentScore}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Opponent Card */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-400">Opponent</h2>
            <p className="text-sm text-gray-400">{opponentCard.card_name}</p>
          </div>
          <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
            <CardDisplay card={opponentCard} isRevealed={true} />
            <div className="mt-4 space-y-2">
              <div className={`flex justify-between p-2 rounded ${
                currentStep > 0 && battleSteps[0]?.winner === 'opponent' ? 'bg-green-900/30 border border-green-500' : ''
              }`}>
                <span className="flex items-center space-x-2">
                  <Sword className="h-4 w-4 text-red-400" />
                  <span>STR</span>
                </span>
                <span className="font-bold">{opponentCard.attributes.str}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                currentStep > 1 && battleSteps[1]?.winner === 'opponent' ? 'bg-green-900/30 border border-green-500' : ''
              }`}>
                <span className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span>DEX</span>
                </span>
                <span className="font-bold">{opponentCard.attributes.dex}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${
                currentStep > 2 && battleSteps[2]?.winner === 'opponent' ? 'bg-green-900/30 border border-green-500' : ''
              }`}>
                <span className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span>INT</span>
                </span>
                <span className="font-bold">{opponentCard.attributes.int}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};