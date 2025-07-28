/**
 * useBattleActions Hook
 * Handles battle actions like card selection and battle resolution
 */

import { useState, useCallback } from 'react';

import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';

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

            // Skip client-side validation for now since there might be schema issues
            // Let the edge function handle all validation
            console.log('⚠️ Skipping client-side duplicate check due to potential schema issues');

            // Call the select-card-v2 edge function with correct parameters
            // Try both old and new parameter names for compatibility
            const requestBody = {
                battle_id: battleId,
                player_id: user.id, // New parameter name
                user_id: user.id, // Old parameter name (fallback)
                card_id: cardId, // New parameter name
                selected_card_id: cardId // Old parameter name (fallback)
            };
            
            console.log('📤 Sending request to select-card-v2 with body:', requestBody);
            
            const response = await supabase.functions.invoke('select-card-v2', {
                body: requestBody
            });

            console.log('📥 Select card response:', response);

            // Check for function invocation errors
            if (response.error) {
                console.error('🚨 Function invocation error details:', response.error);
                console.error('🚨 Full response:', response);
                console.error('🚨 Response data:', response.data);
                
                // Try to extract the actual error from the 400 response
                let errorMessage = 'Failed to invoke select-card function';
                
                // First try to get error from response.data (this is where 400 errors usually are)
                if (response.data && typeof response.data === 'object') {
                    if (response.data.error) {
                        errorMessage = response.data.error;
                    } else if (response.data.message) {
                        errorMessage = response.data.message;
                    }
                }
                // Then try response.error.message
                else if (response.error.message) {
                    errorMessage = response.error.message;
                } 
                // Finally try response.error.context
                else if (response.error.context) {
                    try {
                        const errorData = JSON.parse(response.error.context);
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch (e) {
                        errorMessage = response.error.context || errorMessage;
                    }
                }
                
                console.error('🚨 Final error message:', errorMessage);
                throw new Error(errorMessage);
            }

            // Check for application errors in the response data
            if (response.data?.error) {
                const errorCode = response.data.error;
                let errorMessage = response.data.message || 'Card selection failed';

                // Handle specific error cases
                switch (errorCode) {
                    case 'CARD_ALREADY_SELECTED':
                        errorMessage = 'You have already selected a card for this battle';
                        break;
                    case 'HUMANOID_CARD_NOT_OWNED':
                        errorMessage = 'You do not own this humanoid card';
                        break;
                    case 'INVALID_CARD_ATTRIBUTES':
                        errorMessage = 'This card has invalid attributes';
                        break;
                    case 'Battle not found':
                        errorMessage = 'This battle no longer exists';
                        break;
                    case 'INVALID_BATTLE_STATUS':
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
            
            let errorMessage = 'Failed to select card';
            
            // Try to extract more detailed error information
            if (err instanceof Error) {
                errorMessage = err.message;
                
                // If it's a generic edge function error, try to get more details
                if (errorMessage.includes('Edge Function returned a non-2xx status code')) {
                    // Try to get the actual error from the response
                    try {
                        // The error might contain additional context
                        if (err.cause || (err as any).context) {
                            const context = err.cause || (err as any).context;
                            if (typeof context === 'string') {
                                try {
                                    const parsed = JSON.parse(context);
                                    errorMessage = parsed.error || parsed.message || errorMessage;
                                } catch (e) {
                                    errorMessage = context;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Could not parse error context:', e);
                    }
                }
            }
            
            setActionError(errorMessage);
            throw new Error(errorMessage); // Re-throw with better message
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