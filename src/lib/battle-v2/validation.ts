/**
 * Battle V2 Validation Utilities
 */

import { Card } from '@/types/game';
import { HumanoidCard, BattleStatus, BattleErrorCode } from '@/types/battle-v2';
import { BATTLE_PHASE_TRANSITIONS } from './types';

/**
 * Type guard to check if a card is a humanoid card
 */
export function isHumanoidCard(card: Card): card is HumanoidCard {
  return (
    card.card_type === 'humanoid' &&
    typeof card.attributes === 'object' &&
    card.attributes !== null &&
    typeof card.attributes.str === 'number' &&
    typeof card.attributes.dex === 'number' &&
    typeof card.attributes.int === 'number'
  );
}

/**
 * Validate battle status
 */
export function isValidBattleStatus(status: string): status is BattleStatus {
  return ['pending', 'active', 'cards_revealed', 'in_progress', 'completed'].includes(status);
}

/**
 * Check if card selection is allowed in current battle state
 */
export function canSelectCard(battleStatus: BattleStatus): boolean {
  return battleStatus === 'active';
}

/**
 * Check if battle resolution can be triggered
 */
export function canTriggerResolution(battleStatus: BattleStatus): boolean {
  return battleStatus === 'cards_revealed';
}

/**
 * Validate battle phase transition
 */
export function canTransitionTo(currentStatus: BattleStatus, newStatus: BattleStatus): boolean {
  const allowedTransitions = BATTLE_PHASE_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Validate card attributes for battle
 */
export function validateCardAttributes(card: HumanoidCard): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (card.attributes.str < 0 || card.attributes.str > 100) {
    errors.push('Strength must be between 0 and 100');
  }

  if (card.attributes.dex < 0 || card.attributes.dex > 100) {
    errors.push('Dexterity must be between 0 and 100');
  }

  if (card.attributes.int < 0 || card.attributes.int > 100) {
    errors.push('Intelligence must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user participation in battle
 */
export function validateBattleParticipation(
  userId: string,
  challengerId: string,
  opponentId: string
): boolean {
  return userId === challengerId || userId === opponentId;
}

/**
 * Create validation error
 */
export function createValidationError(code: BattleErrorCode, message: string, details?: string) {
  return {
    code,
    message,
    details
  };
}

/**
 * Comprehensive battle state validation
 */
export function validateBattleState(battle: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!battle) {
    errors.push('Battle instance is required');
    return { valid: false, errors };
  }

  if (!battle.id || typeof battle.id !== 'string') {
    errors.push('Battle ID is required and must be a string');
  }

  if (!battle.challenger_id || typeof battle.challenger_id !== 'string') {
    errors.push('Challenger ID is required and must be a string');
  }

  if (!battle.opponent_id || typeof battle.opponent_id !== 'string') {
    errors.push('Opponent ID is required and must be a string');
  }

  if (!isValidBattleStatus(battle.status)) {
    errors.push(`Invalid battle status: ${battle.status}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}