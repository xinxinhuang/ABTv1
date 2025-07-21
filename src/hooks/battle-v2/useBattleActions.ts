/**
 * useBattleActions Hook
 * Handles battle actions like card selection and battle resolution
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { BattleErrorCode } from '@/types/battle-v2';
import { UseBattleActionsReturn } from './types';
import { useBattleBroadcast } from './useBattleRealtime';

/**
 * Custom hook for battle actions
 */
export function useBattleActions(battleId: string): UseBattleActionsReturn {
    const { user } = useUser();
    const supabase = createClient();
    const { broadcast } = useBattleBroadcast(battleId);

    const [isProcessing, setIsProcessing] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    /**
     * Clear any existing errors
     */
    const clearError = useCallback(() => {
        setActionError(null);
    }, []);

    /**
     * Select a card for battle
     */
    const selectCard = useCallback(async (cardId: string) => {
        if (!user || !battleId || isProcessing) return;

        setIsProcessing(true);
        setActionError(null);

            try {
      console.log('Selecting card:', { battleId, cardId, userId: user.id });

      // Call the select-card-v2 edge function with correct parameters
      const response = await supabase.functions.invoke('select-card-v2', {
        body: {
          battle_id: battleId,
          user_id: user.id, // Current function uses user_id
          selected_card_id: cardId // Current function uses selected_card_id
        }
      });

      console.log('Select card response:', response);

            // Check for function invocation errors
            if (response.error) {
                throw new Error(response.error.message || 'Failed to invoke select-card function');
            }

            // Check for application errors in the response data
            if (response.data?.error) {
                const errorCode = response.data.error;
                let errorMessage = response.data.message || 'Card selection failed';

                // Handle specific error cases
                switch (errorCode) {
                    case 'Card already selected':
                        errorMessage = 'You have already selected a card for this battle';
                        break;
                    case 'Card not owned':
                        errorMessage = 'You do not own this card';
                        break;
                    case 'Invalid card type':
                        errorMessage = 'Only humanoid cards can be used in battles';
                        break;
                    case 'Battle not found':
                        errorMessage = 'This battle no longer exists';
                        break;
                    case 'Invalid battle status':
                        errorMessage = 'Card selection is not allowed in the current battle state';
                        break;
                    default:
                        errorMessage = response.data.message || 'An unexpected error occurred';
                }

                throw new Error(errorMessage);
            }

            // Success - broadcast the card selection
            await broadcast('card_selected', {
                card_id: cardId,
                battle_status: response.data?.status,
                both_submitted: response.data?.both_submitted
            });

            console.log('Card selection successful');

        } catch (err) {
            console.error('Error selecting card:', err);
            setActionError(err instanceof Error ? err.message : 'Failed to select card');
            throw err; // Re-throw so calling component can handle it
        } finally {
            setIsProcessing(false);
        }
    }, [user, battleId, isProcessing, supabase, broadcast]);

    /**
     * Confirm card selection (if needed for two-step process)
     */
    const confirmSelection = useCallback(async () => {
        if (!user || !battleId || isProcessing) return;

        setIsProcessing(true);
        setActionError(null);

        try {
            // This could be used for a two-step selection process
            // For now, it's a placeholder that could trigger battle progression

            await broadcast('selection_confirmed', {
                confirmed: true
            });

            console.log('Selection confirmed');

        } catch (err) {
            console.error('Error confirming selection:', err);
            setActionError(err instanceof Error ? err.message : 'Failed to confirm selection');
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [user, battleId, isProcessing, broadcast]);

    /**
     * Trigger battle resolution
     */
    const triggerResolution = useCallback(async () => {
        if (!user || !battleId || isProcessing) return;

        setIsProcessing(true);
        setActionError(null);

        try {
            console.log('Triggering battle resolution:', { battleId, userId: user.id });

            // Call the resolve-battle-v2 edge function (updated to use v2)
            const response = await supabase.functions.invoke('resolve-battle-v2', {
                body: {
                    battle_id: battleId,
                    player_id: user.id
                }
            });

            console.log('Resolve battle response:', response);

            // Check for function invocation errors
            if (response.error) {
                throw new Error(response.error.message || 'Failed to invoke resolve-battle-v2 function');
            }

            // Check for application errors in the response data
            if (response.data?.error) {
                throw new Error(response.data.message || 'Battle resolution failed');
            }

            // Success - broadcast the resolution trigger
            await broadcast('battle_resolution_triggered', {
                triggered_by: user.id,
                result: response.data
            });

            console.log('Battle resolution triggered successfully');

        } catch (err) {
            console.error('Error triggering resolution:', err);
            setActionError(err instanceof Error ? err.message : 'Failed to trigger battle resolution');
            
            // Broadcast resolution error to help other clients
            try {
                await broadcast('battle_resolution_error', {
                    error: err instanceof Error ? err.message : 'Failed to trigger battle resolution',
                    triggered_by: user.id
                });
                
                // Dispatch custom event for local components to react
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('battle_resolution_error', {
                        detail: {
                            type: 'battle_resolution_error',
                            battleId,
                            error: err instanceof Error ? err.message : 'Failed to trigger battle resolution'
                        }
                    }));
                }
            } catch (broadcastError) {
                console.error('Failed to broadcast resolution error:', broadcastError);
            }
            
            throw err;
        } finally {
            setIsProcessing(false);
        }
    }, [user, battleId, isProcessing, supabase, broadcast]);

    return {
        selectCard,
        confirmSelection,
        triggerResolution,
        isProcessing,
        actionError,
        clearError
    };
}

/**
 * Hook for validating battle actions before execution
 */
export function useBattleActionValidation(battleId: string) {
    const { user } = useUser();
    const supabase = createClient();

    /**
     * Validate if card selection is allowed
     */
    const canSelectCard = useCallback(async (cardId: string): Promise<{ valid: boolean; error?: string }> => {
        if (!user || !battleId || !cardId) {
            return { valid: false, error: 'Missing required parameters' };
        }

        try {
            // Check if user owns the card and it's a humanoid
            const { data: card, error: cardError } = await supabase
                .from('player_cards')
                .select('*')
                .eq('id', cardId)
                .eq('player_id', user.id)
                .eq('card_type', 'humanoid')
                .single();

            if (cardError || !card) {
                return { valid: false, error: 'Card not found or not owned' };
            }

            // Check if battle is in correct state
            const { data: battle, error: battleError } = await supabase
                .from('battle_instances')
                .select('status')
                .eq('id', battleId)
                .single();

            if (battleError || !battle) {
                return { valid: false, error: 'Battle not found' };
            }

            if (battle.status !== 'active') {
                return { valid: false, error: 'Card selection not allowed in current battle state' };
            }

            // Check if user has already selected a card
            const { data: existingSelection, error: selectionError } = await supabase
                .from('battle_cards')
                .select('id')
                .eq('battle_id', battleId)
                .eq('player_id', user.id)
                .maybeSingle();

            if (selectionError) {
                return { valid: false, error: 'Error checking existing selection' };
            }

            if (existingSelection) {
                return { valid: false, error: 'Card already selected for this battle' };
            }

            return { valid: true };

        } catch (err) {
            return { valid: false, error: 'Validation failed' };
        }
    }, [user, battleId, supabase]);

    /**
     * Validate if battle resolution can be triggered
     */
    const canTriggerResolution = useCallback(async (): Promise<{ valid: boolean; error?: string }> => {
        if (!user || !battleId) {
            return { valid: false, error: 'Missing required parameters' };
        }

        try {
            // Check battle status
            const { data: battle, error: battleError } = await supabase
                .from('battle_instances')
                .select('status, challenger_id, opponent_id')
                .eq('id', battleId)
                .single();

            if (battleError || !battle) {
                return { valid: false, error: 'Battle not found' };
            }

            if (battle.status !== 'cards_revealed') {
                return { valid: false, error: `Battle resolution not allowed in current state: ${battle.status}` };
            }

            // Verify that the user is a participant in the battle
            if (user.id !== battle.challenger_id && user.id !== battle.opponent_id) {
                return { valid: false, error: 'You are not a participant in this battle' };
            }

            // Check if both players have submitted cards
            const { data: battleCards, error: cardsError } = await supabase
                .from('battle_cards')
                .select('player_id')
                .eq('battle_id', battleId);

            if (cardsError) {
                return { valid: false, error: 'Error checking battle cards' };
            }

            if (!battleCards || battleCards.length !== 2) {
                return { valid: false, error: 'Both players must submit cards before resolution' };
            }

            return { valid: true };

        } catch (err) {
            return { valid: false, error: 'Validation failed' };
        }
    }, [user, battleId, supabase]);

    return {
        canSelectCard,
        canTriggerResolution
    };
}