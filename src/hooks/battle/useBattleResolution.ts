'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BattleInstance, BattleSelection } from '@/types/battle';

export interface UseBattleResolutionReturn {
  isResolving: boolean;
  resolutionError: string | null;
  hasAttemptedResolution: boolean;
  triggerResolution: () => Promise<void>;
  resetResolutionState: () => void;
  autoTriggerResolution: () => void;
}

export const useBattleResolution = (
  battle: BattleInstance | null,
  selection: BattleSelection | null
): UseBattleResolutionReturn => {
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [hasAttemptedResolution, setHasAttemptedResolution] = useState(false);

  const supabase = createClient();
  const resolutionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptedBattlesRef = useRef<Set<string>>(new Set()); // Track attempted battles by ID

  const resetResolutionState = useCallback(() => {
    setHasAttemptedResolution(false);
    setResolutionError(null);
    setIsResolving(false);

    if (resolutionTimeoutRef.current) {
      clearTimeout(resolutionTimeoutRef.current);
      resolutionTimeoutRef.current = null;
    }
  }, []);

  // Reset resolution state when battle changes
  useEffect(() => {
    if (battle?.id) {
      // If this is a new battle, reset the resolution state
      if (!attemptedBattlesRef.current.has(battle.id)) {
        resetResolutionState();
      }
    }
  }, [battle?.id, resetResolutionState]);

  const triggerResolution = useCallback(async () => {
    if (!battle || !selection) {
      setResolutionError('Missing battle or selection data');
      return;
    }

    // Check if both players have submitted cards
    const bothSubmitted = selection.player1_card_id && selection.player2_card_id;
    if (!bothSubmitted) {
      setResolutionError('Both players must submit cards before resolution');
      return;
    }

    // Prevent duplicate resolution attempts using battle ID tracking
    if (hasAttemptedResolution || isResolving || attemptedBattlesRef.current.has(battle.id)) {
      console.log('Resolution already attempted or in progress, skipping for battle:', battle.id);
      return;
    }

    try {
      setIsResolving(true);
      setResolutionError(null);
      setHasAttemptedResolution(true);
      attemptedBattlesRef.current.add(battle.id); // Mark this battle as attempted

      console.log('🎯 Triggering battle resolution for battle:', battle.id);

      // Double-check the battle is still in the correct state
      const { data: currentBattle, error: battleCheckError } = await supabase
        .from('battle_instances')
        .select('status')
        .eq('id', battle.id)
        .single();

      if (battleCheckError || !currentBattle) {
        throw new Error('Failed to verify battle status');
      }

      if (currentBattle.status === 'completed') {
        console.log('Battle already completed, skipping resolution');
        return;
      }

      // Call the resolve-battle-v2 Edge Function
      const { data, error } = await supabase.functions.invoke('resolve-battle-v2', {
        body: { battle_id: battle.id }
      });

      if (error) {
        throw new Error(`Resolution failed: ${error.message || 'Unknown error'}`);
      }

      console.log('✅ Battle resolved successfully:', data);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown resolution error';
      console.error('Error resolving battle:', error);
      setResolutionError(errorMessage);

      // Reset attempt flag on error so user can retry
      setHasAttemptedResolution(false);
    } finally {
      setIsResolving(false);
    }
  }, [battle, selection, hasAttemptedResolution, isResolving, supabase]);

  const triggerResolutionWithDelay = useCallback(async (delayMs: number = 4000) => {
    if (!battle || !selection) return;

    const bothSubmitted = selection.player1_card_id && selection.player2_card_id;
    if (!bothSubmitted || hasAttemptedResolution) return;

    console.log(`⏱️ Scheduling battle resolution in ${delayMs}ms...`);

    resolutionTimeoutRef.current = setTimeout(async () => {
      await triggerResolution();
    }, delayMs);
  }, [battle, selection, hasAttemptedResolution, triggerResolution]);

  // Auto-trigger resolution for cards_revealed status
  const autoTriggerResolution = useCallback(() => {
    if (!battle || !selection) {
      console.log('❌ Auto-trigger skipped: missing battle or selection');
      return;
    }

    const bothSubmitted = selection.player1_card_id && selection.player2_card_id;

    console.log('🔍 Auto-trigger check:', {
      battleStatus: battle.status,
      bothSubmitted,
      hasAttemptedResolution,
      battleId: battle.id
    });

    if (battle.status === 'cards_revealed' && bothSubmitted && !hasAttemptedResolution) {
      console.log('✅ Auto-triggering resolution for cards_revealed battle:', battle.id);
      triggerResolutionWithDelay(0); // No additional delay since countdown already handled it
    } else {
      console.log('⏭️ Auto-trigger conditions not met');
    }
  }, [battle, selection, hasAttemptedResolution, triggerResolutionWithDelay]);

  return {
    isResolving,
    resolutionError,
    hasAttemptedResolution,
    triggerResolution,
    resetResolutionState,
    autoTriggerResolution, // Export for use in components
  };
};