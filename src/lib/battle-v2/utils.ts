/**
 * Battle V2 Utility Functions
 */

import { HumanoidCard, BattleCalculation, AttributeComparison } from '@/types/battle-v2';

/**
 * Calculate battle result between two humanoid cards
 */
export function calculateBattleResult(
  playerCard: HumanoidCard,
  opponentCard: HumanoidCard
): BattleCalculation {
  const attributeComparisons: AttributeComparison[] = [];
  let playerScore = 0;
  let opponentScore = 0;

  // Compare each attribute
  const attributes: (keyof HumanoidCard['attributes'])[] = ['str', 'dex', 'int'];
  
  attributes.forEach(attr => {
    const playerValue = playerCard.attributes[attr];
    const opponentValue = opponentCard.attributes[attr];
    
    let winner: 'player' | 'opponent' | 'tie';
    if (playerValue > opponentValue) {
      winner = 'player';
      playerScore++;
    } else if (opponentValue > playerValue) {
      winner = 'opponent';
      opponentScore++;
    } else {
      winner = 'tie';
    }

    attributeComparisons.push({
      attribute: attr,
      playerValue,
      opponentValue,
      winner
    });
  });

  // Determine overall winner
  let overallWinner: 'player' | 'opponent' | 'tie';
  if (playerScore > opponentScore) {
    overallWinner = 'player';
  } else if (opponentScore > playerScore) {
    overallWinner = 'opponent';
  } else {
    // Tie-breaker: sum of all attributes
    const playerTotal = playerCard.attributes.str + playerCard.attributes.dex + playerCard.attributes.int;
    const opponentTotal = opponentCard.attributes.str + opponentCard.attributes.dex + opponentCard.attributes.int;
    
    if (playerTotal > opponentTotal) {
      overallWinner = 'player';
    } else if (opponentTotal > playerTotal) {
      overallWinner = 'opponent';
    } else {
      overallWinner = 'tie';
    }
  }

  // Generate explanation
  const explanation = generateBattleExplanation(
    playerCard,
    opponentCard,
    attributeComparisons,
    overallWinner
  );

  return {
    winner: overallWinner,
    playerScore,
    opponentScore,
    attributeComparisons,
    explanation
  };
}

/**
 * Generate human-readable battle explanation
 */
function generateBattleExplanation(
  playerCard: HumanoidCard,
  opponentCard: HumanoidCard,
  comparisons: AttributeComparison[],
  winner: 'player' | 'opponent' | 'tie'
): string {
  const playerName = playerCard.card_name;
  const opponentName = opponentCard.card_name;
  
  let explanation = `${playerName} vs ${opponentName}:\n\n`;
  
  // Add attribute comparisons
  comparisons.forEach(comp => {
    const attrName = comp.attribute.toUpperCase();
    explanation += `${attrName}: ${playerName} (${comp.playerValue}) vs ${opponentName} (${comp.opponentValue}) - `;
    
    if (comp.winner === 'player') {
      explanation += `${playerName} wins!\n`;
    } else if (comp.winner === 'opponent') {
      explanation += `${opponentName} wins!\n`;
    } else {
      explanation += 'Tie!\n';
    }
  });
  
  // Add final result
  explanation += '\n';
  if (winner === 'player') {
    explanation += `🏆 ${playerName} wins the battle!`;
  } else if (winner === 'opponent') {
    explanation += `🏆 ${opponentName} wins the battle!`;
  } else {
    explanation += `🤝 The battle ends in a tie!`;
  }
  
  return explanation;
}

/**
 * Format time remaining for countdown
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get card rarity color class
 */
export function getCardRarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'bronze':
      return 'text-amber-600 border-amber-600';
    case 'silver':
      return 'text-gray-400 border-gray-400';
    case 'gold':
      return 'text-yellow-400 border-yellow-400';
    default:
      return 'text-gray-500 border-gray-500';
  }
}

/**
 * Generate unique battle event ID
 */
export function generateEventId(): string {
  return `battle_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function for real-time updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if battle is expired
 */
export function isBattleExpired(createdAt: string, maxDurationMinutes: number = 30): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
  
  return diffMinutes > maxDurationMinutes;
}

/**
 * Get battle phase display name
 */
export function getBattlePhaseDisplayName(status: string): string {
  switch (status) {
    case 'active':
      return 'Card Selection';
    case 'cards_revealed':
      return 'Cards Revealed';
    case 'in_progress':
      return 'Battle in Progress';
    case 'completed':
      return 'Battle Completed';
    default:
      return 'Unknown Phase';
  }
}