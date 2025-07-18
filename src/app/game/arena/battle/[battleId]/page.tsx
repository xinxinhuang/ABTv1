'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';

import { BattleGrid } from '@/components/game/battle/BattleGrid';
import { CardSelectionGrid } from '@/components/game/battle/CardSelectionGrid';
import { GameLog } from '@/components/game/battle/GameLog';
import { BattleInstance, BattleSelection } from '@/types/battle';
import { Card } from '@/types/game';

export default function BattlePage() {
  const { battleId } = useParams();
  const { user } = useUser();
  const supabase = createClient();
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [selection, setSelection] = useState<any>(null);
  const [player1Card, setPlayer1Card] = useState<any>(null);
  const [player2Card, setPlayer2Card] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingSelection, setCheckingSelection] = useState(true);
  const [playerHasSelectedCard, setPlayerHasSelectedCard] = useState(false);
  const [opponentHasSelectedCard, setOpponentHasSelectedCard] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  
  // Ref to track if subscriptions are already set up to prevent multiple setups
  const subscriptionsSetupRef = useRef(false);

  // Determine if the current player has already submitted a card
  const hasPlayerSelected = useMemo(() => {
    if (!user || !battle || !selection) return false;
    const isChallenger = user.id === battle.challenger_id;
    return isChallenger ? !!selection.player1_card_id : !!selection.player2_card_id;
  }, [selection, user, battle]);

  // Check opponent selection status
  const hasOpponentSelected = useMemo(() => {
    if (!user || !battle || !selection) return false;
    const isChallenger = user.id === battle.challenger_id;
    return isChallenger ? !!selection.player2_card_id : !!selection.player1_card_id;
  }, [selection, user, battle]);

  // Update opponent selection status when selection changes
  useEffect(() => {
    setOpponentHasSelectedCard(hasOpponentSelected);
    if (hasOpponentSelected) {
      setLastUpdateTime(new Date().toLocaleTimeString());
    }
  }, [hasOpponentSelected]);

  // Track last fetch attempts and failures to prevent rapid repeated fetches
  const [failedFetches, setFailedFetches] = useState<Set<string>>(new Set());
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0);
  
  // Function to fetch card details when selections are made
  const fetchCardDetails = useCallback(async (selectionData: any) => {
    if (!battle?.id || !selectionData || !user?.id) return;

    // Throttle fetch attempts to prevent rapid retries
    const now = Date.now();
    if (now - lastFetchAttempt < 2000) {
      console.log('Throttling card details fetch - too soon since last attempt');
      return;
    }
    setLastFetchAttempt(now);

    const fetchPlayerCard = async (playerId: string, cardId: string, setter: (card: any) => void) => {
      if (!cardId) return;
      
      // For completed battles, try to fetch from battle_cards table first, then fallback to player_cards
      if (battle.status === 'completed') {
        try {
          const { data, error } = await supabase
            .from('battle_cards')
            .select(`
              *,
              player_cards:card_id (
                id,
                card_name,
                card_type,
                attributes,
                rarity,
                obtained_at
              )
            `)
            .eq('battle_id', battle.id)
            .eq('player_id', playerId)
            .maybeSingle();
          
          if (data && !error && data.player_cards) {
            // Use the joined player_cards data
            const cardData = {
              id: data.player_cards.id,
              player_id: data.player_id,
              card_name: data.player_cards.card_name,
              card_type: data.player_cards.card_type,
              attributes: data.player_cards.attributes,
              rarity: data.player_cards.rarity,
              obtained_at: data.player_cards.obtained_at
            };
            setter(cardData);
            return;
          }
        } catch (err) {
          console.warn(`Error fetching battle card for player ${playerId}:`, err);
        }
        
        // Fallback: fetch directly from player_cards table
        try {
          const { data: cardData, error: cardError } = await supabase
            .from('player_cards')
            .select('*')
            .eq('id', cardId)
            .single();
          
          if (cardData && !cardError) {
            setter(cardData);
            return;
          } else {
            console.warn(`Could not fetch card from player_cards for ${cardId}:`, cardError);
          }
        } catch (err) {
          console.warn(`Error fetching card from player_cards for ${cardId}:`, err);
        }
        
        // Final fallback: create placeholder card
        const fallbackCard = {
          id: cardId,
          player_id: playerId,
          card_name: 'Battle Card',
          card_type: 'unknown',
          attributes: { str: 0, dex: 0, int: 0 },
          rarity: 'unknown',
          obtained_at: new Date().toISOString()
        };
        setter(fallbackCard);
        return;
      }
      
      // For active battles, only fetch card details if the current user owns the card (due to RLS policy)
      if (playerId === user.id) {
        try {
          const { data, error } = await supabase
            .from('player_cards')
            .select('*')
            .eq('id', cardId)
            .single();
          
          if (data && !error) {
            setter(data);
          } else {
            console.warn(`Could not fetch card details for card ${cardId}:`, error);
            // For active battles where card fetch fails, create a fallback
            const fallbackCard = {
              id: cardId,
              player_id: playerId,
              card_name: 'Card Not Found',
              card_type: 'unknown',
              attributes: { str: 0, dex: 0, int: 0 },
              rarity: 'unknown',
              obtained_at: new Date().toISOString()
            };
            setter(fallbackCard);
          }
        } catch (err) {
          console.warn(`Error fetching card ${cardId}:`, err);
        }
      } else {
        // For opponent's cards in active battles, create a placeholder since RLS prevents direct access
        const placeholderCard = {
          id: cardId,
          player_id: playerId,
          card_name: 'Hidden Card',
          card_type: 'unknown',
          attributes: { str: 0, dex: 0, int: 0 },
          rarity: 'unknown',
          obtained_at: new Date().toISOString()
        };
        setter(placeholderCard);
      }
    };

    // Determine which player is player1 and player2 based on battle structure
    const isCurrentUserPlayer1 = user.id === battle.challenger_id;
    
    if (isCurrentUserPlayer1) {
      // Current user is player1 (challenger)
      fetchPlayerCard(battle.challenger_id, selectionData.player1_card_id, setPlayer1Card);
      if (battle.opponent_id) {
        fetchPlayerCard(battle.opponent_id, selectionData.player2_card_id, setPlayer2Card);
      }
    } else {
      // Current user is player2 (opponent)
      fetchPlayerCard(battle.challenger_id, selectionData.player1_card_id, setPlayer1Card);
      if (battle.opponent_id) {
        fetchPlayerCard(battle.opponent_id, selectionData.player2_card_id, setPlayer2Card);
      }
    }

  }, [battle?.id, battle?.challenger_id, battle?.opponent_id, battle?.status, user?.id, supabase]);

  // Check if this player has already selected a card when the component mounts or battle changes
  useEffect(() => {
    if (!user || !battle?.id) return;
    
    const checkPlayerSelection = async () => {
      setCheckingSelection(true);
      try {
        console.log('Checking if player has already selected a card...');
        const { data, error } = await supabase
          .from('battle_selections')
          .select('*')
          .eq('battle_id', battle.id)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching battle selection:', error);
        }
          
        if (data) {
          // Update the selection state with the data from the database
          setSelection(data);
          
          // Determine if this player has already selected their card
          const isChallenger = user.id === battle.challenger_id;
          const hasSelected = isChallenger ? !!data.player1_card_id : !!data.player2_card_id;
          const opponentSelected = isChallenger ? !!data.player2_card_id : !!data.player1_card_id;
          
          console.log(`Player selection status: ${hasSelected ? 'already selected' : 'not selected yet'} (${isChallenger ? 'Challenger' : 'Opponent'})`);
          console.log(`Opponent selection status: ${opponentSelected ? 'already selected' : 'not selected yet'}`);
          
          setPlayerHasSelectedCard(hasSelected);
          setOpponentHasSelectedCard(opponentSelected);
          
          // Set timestamp if opponent has already selected
          if (opponentSelected) {
            setLastUpdateTime(new Date().toLocaleTimeString());
          }
        } else {
          // No selection record exists yet
          console.log('No selection record found for this battle');
          setPlayerHasSelectedCard(false);
          setOpponentHasSelectedCard(false);
        }
      } catch (err) {
        console.error('Error checking player selection:', err);
      } finally {
        setCheckingSelection(false);
      }
    };
    
    checkPlayerSelection();
  }, [battle?.id, battle?.challenger_id, user?.id, user, supabase]);

  // This effect fetches the initial battle and selection data
  useEffect(() => {
    if (!battleId || !user?.id) return;

    const fetchBattleData = async () => {
      setLoading(true);
      try {
        const { data: battleData, error: battleError } = await supabase
          .from('battle_instances')
          .select('*')
          .eq('id', battleId)
          .single();

        if (battleError || !battleData) throw new Error('Battle not found');
        setBattle(battleData);

        const { data: selectionData, error: selectionError } = await supabase
          .from('battle_selections')
          .select('*')
          .eq('battle_id', battleId)
          .maybeSingle();

        if (selectionData) setSelection(selectionData);

      } catch (err) {
        console.error('Error fetching initial battle data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBattleData();
  }, [battleId, user?.id, supabase]);

  // This effect fetches card details whenever the selection changes
  useEffect(() => {
    if (selection) {
      // Add a small delay for completed battles to ensure database consistency
      if (battle?.status === 'completed') {
        const timer = setTimeout(() => {
          fetchCardDetails(selection);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        fetchCardDetails(selection);
      }
    }
  }, [selection, fetchCardDetails, battle?.status]);

  // Add a retry mechanism for completed battles that don't have cards loaded yet
  useEffect(() => {
    if (battle?.status === 'completed' && selection && (!player1Card || !player2Card)) {
      console.log('Completed battle missing card data, setting up retry mechanism');
      
      let retryCount = 0;
      const maxRetries = 5;
      
      const retryTimer = setInterval(() => {
        if (retryCount >= maxRetries) {
          console.log('Max retries reached for card data fetch');
          clearInterval(retryTimer);
          return;
        }
        
        if (!player1Card || !player2Card) {
          console.log(`Retry ${retryCount + 1}/${maxRetries}: Attempting to fetch card data`);
          fetchCardDetails(selection);
          retryCount++;
        } else {
          console.log('Card data loaded successfully, stopping retry');
          clearInterval(retryTimer);
        }
      }, 3000); // Retry every 3 seconds
      
      return () => clearInterval(retryTimer);
    }
  }, [battle?.status, selection, player1Card, player2Card, fetchCardDetails]);


  // This effect sets up and tears down the real-time subscriptions
  useEffect(() => {
    if (!battleId || !user?.id) return;

    console.log('🔄 Setting up real-time subscriptions for battle:', battleId);

    // Create a local refresh function to avoid dependency issues
    const refreshBattleData = async () => {
      console.log('🔄 Refreshing battle data from real-time subscription');
      try {
        const { data: battleData, error: battleError } = await supabase
          .from('battle_instances')
          .select('*')
          .eq('id', battleId)
          .single();

        if (battleData && !battleError) {
          setBattle(battleData);
        }

        const { data: selectionData, error: selectionError } = await supabase
          .from('battle_selections')
          .select('*')
          .eq('battle_id', battleId)
          .maybeSingle();

        if (selectionData && !selectionError) {
          setSelection(selectionData);
        }
      } catch (err) {
        console.warn('Error refreshing battle data:', err);
      }
    };

    // 1. Database changes subscription
    const dbChannel = supabase
      .channel(`battle-db:${battleId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'battle_selections', 
        filter: `battle_id=eq.${battleId}` 
      }, (payload) => {
        console.log('📡 Battle selection updated via DB subscription:', payload.new);
        if (payload.new) {
          const newSelection = payload.new as BattleSelection;
          setSelection(newSelection);
          
          // Check if both players have submitted cards
          const bothSubmitted = newSelection.player1_card_id && newSelection.player2_card_id;
          if (bothSubmitted) {
            console.log('🎯 Both players have submitted cards, checking battle status');
            refreshBattleData();
          }
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'battle_instances', 
        filter: `id=eq.${battleId}` 
      }, (payload) => {
        console.log('📡 Battle instance updated via DB subscription:', payload.new);
        if (payload.new) {
          setBattle(payload.new as BattleInstance);
          
          // If battle status changed to cards_revealed, log it
          if (payload.new.status === 'cards_revealed') {
            console.log('🎯 Battle status changed to cards_revealed via DB subscription');
          }
        }
      })
      .subscribe();

    // 2. Broadcast channel subscription for immediate updates
    const broadcastChannel = supabase
      .channel(`battle-broadcast:${battleId}`)
      .on('broadcast', { event: 'card_submitted' }, (payload) => {
        console.log('📢 Card submitted broadcast received:', payload);
        console.log('📢 Payload details:', JSON.stringify(payload, null, 2));
        
        // Check if both players have submitted
        if (payload.payload?.both_submitted) {
          console.log('🎯 Broadcast indicates both players have submitted cards');
          setTimeout(() => refreshBattleData(), 500); // Small delay to ensure DB consistency
        } else {
          refreshBattleData();
        }
      })
      .on('broadcast', { event: 'battle_update' }, (payload) => {
        console.log('📢 Battle update broadcast received:', payload);
        console.log('📢 Battle update payload:', JSON.stringify(payload, null, 2));
        
        if (payload.payload?.status === 'cards_revealed' || payload.payload?.both_submitted) {
          console.log('🎯 Battle status broadcast: cards_revealed or both submitted');
          setTimeout(() => refreshBattleData(), 500); // Small delay to ensure DB consistency
        }
      })
      .subscribe();

    // 3. Fallback polling for critical state changes
    const pollInterval = setInterval(async () => {
      // Only poll if we're in an active battle
      if (battle?.status === 'active') {
        console.log('🔄 Fallback polling: checking for battle updates...');
        try {
          const { data: currentBattle } = await supabase
            .from('battle_instances')
            .select('*')
            .eq('id', battleId)
            .single();
            
          if (currentBattle && currentBattle.status !== battle?.status) {
            console.log('🎯 Polling detected status change:', battle?.status, '->', currentBattle.status);
            setBattle(currentBattle);
          }

          // Also check selection status
          const { data: currentSelection } = await supabase
            .from('battle_selections')
            .select('*')
            .eq('battle_id', battleId)
            .maybeSingle();
            
          if (currentSelection) {
            const bothSubmitted = currentSelection.player1_card_id && currentSelection.player2_card_id;
            if (bothSubmitted && currentBattle?.status === 'active') {
              console.log('🎯 Polling detected both cards submitted but battle still active');
              // This might indicate the status update didn't trigger properly
              setTimeout(() => refreshBattleData(), 2000);
            }
          }
        } catch (err) {
          console.warn('Polling error:', err);
        }
      }
    }, 5000); // Poll every 5 seconds as fallback

    return () => {
      console.log('🧹 Cleaning up real-time subscriptions');
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(broadcastChannel);
      clearInterval(pollInterval);
    };
  }, [battleId, user?.id, supabase, battle?.status]);

  // Auto-resolve battle when both players have submitted cards
  useEffect(() => {
    if (!battle || !selection || battle.status !== 'cards_revealed') return;

    const bothSubmitted = selection.player1_card_id && selection.player2_card_id;
    if (!bothSubmitted) return;

    console.log('✅ Both players have submitted, preparing to resolve battle...');
    console.log('🎯 Battle status:', battle.status);
    console.log('🎯 Selection data:', selection);
    
    // Start countdown from 8 seconds
    setCountdownSeconds(8);
    
    const countdownInterval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(async () => {
      console.log('🎯 Calling resolve-battle-v2...');
      try {
        const { data, error } = await supabase.functions.invoke('resolve-battle-v2', {
          body: { battle_id: battle.id }
        });
        
        if (error) {
          console.error('Error resolving battle:', error);
          // Reset countdown on error
          setCountdownSeconds(0);
        } else {
          console.log('Battle resolved successfully:', data);
        }
      } catch (err) {
        console.error('Failed to resolve battle:', err);
        setCountdownSeconds(0);
      }
    }, 8000); // Increased to 8-second delay for better UX

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
      setCountdownSeconds(0);
    };
  }, [battle?.id, battle?.status, selection?.player1_card_id, selection?.player2_card_id, supabase]);

  const handleSelectionConfirmed = async (cardId: string) => {
    if (!user || !battle || !cardId) return;

    console.log(`Player ${user.id} selected card ${cardId} for battle ${battle.id}`);
    setPlayerHasSelectedCard(true); // Update UI state
    
    // No need to make another API call - CardSelectionGrid.tsx already handled the submission
    // The realtime subscription will handle updating the state from the database.
    console.log('Card selection confirmed in battle page component');
  };
// Manual trigger function removed - auto-resolve is now working properly

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');
  }, []);

  useEffect(() => {
    if (!battleId || !user) return;
    
    // Prevent multiple subscription setups
    if (subscriptionsSetupRef.current) {
      console.log('Subscriptions already set up, skipping');
      return;
    }
    
    subscriptionsSetupRef.current = true;
    fetchBattleData();

    // Add debounce mechanism to prevent excessive refreshes
    let refreshTimeout: NodeJS.Timeout | null = null;
    
    const debouncedRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      refreshTimeout = setTimeout(async () => {
        // Only refresh if we don't have complete data yet
        const currentBattle = battle;
        const currentSelection = selection;
        
        if (!currentBattle || !currentSelection || 
            (currentBattle.status === 'active' && (!player1Card || !player2Card))) {
          console.log('Battle presence sync - refreshing battle data (incomplete data)');
          await fetchBattleData(true);
        } else {
          console.log('Battle presence sync - skipping refresh (complete data available)');
        }
      }, 3000); // Debounce by 3 seconds to reduce frequency
    };

    // Set up a simplified real-time channel for battle updates
    const battleChannel = supabase
      .channel(`battle-realtime:${battleId}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      })
      .on('presence', { event: 'sync' }, debouncedRefresh)
      .on('broadcast', { event: 'card_submitted' }, async (payload) => {
        console.log('Card submitted broadcast received:', payload);
        // Immediately refresh battle data when someone submits a card
        await fetchBattleData(true);
      })
      .on('broadcast', { event: 'battle_update' }, async (payload) => {
        console.log('Battle update broadcast received:', payload);
        // Immediately refresh battle data when battle updates
        await fetchBattleData(true);
      })
      .subscribe(async (status: string) => {
        console.log(`Battle presence subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          // Track this user's presence in the battle (only once)
          await battleChannel.track({
            user_id: user.id,
            status: 'in_battle',
            last_seen: new Date().toISOString(),
          });
        }
      });

    // Set up intelligent polling - more frequent during active phases, less frequent during waiting
    const pollInterval = setInterval(async () => {
      // Get current state values inside the interval to avoid stale closures
      const currentBattle = battle;
      const currentPlayer1Card = player1Card;
      const currentPlayer2Card = player2Card;
      const currentSelection = selection;
      
      if (currentBattle?.status === 'active' || currentBattle?.status === 'cards_revealed') {
        // Only poll if we don't have both cards yet and selection data is missing
        if (!currentPlayer1Card || !currentPlayer2Card || !currentSelection) {
          console.log('Polling for battle updates during active phase...');
          await fetchBattleData(true);
        } else {
          console.log('Already have both cards and selection data, skipping poll');
        }
      } else if (currentBattle?.status === 'completed') {
        console.log('Battle completed, stopping polling');
        clearInterval(pollInterval);
      }
    }, 8000); // Poll every 8 seconds during active phases (reduced frequency)

    // Database subscription for critical battle updates
    const dbChannel = supabase
      .channel(`battle-db:${battleId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public', 
        table: 'battle_instances',
        filter: `id=eq.${battleId}`,
      }, async (payload) => {
        console.log('Database battle update:', payload.new);
        const newBattleData = payload.new as BattleInstance;
        const currentBattle = battle; // Get current state to avoid stale closure
        const previousStatus = currentBattle?.status;
        setBattle(newBattleData);
        
        // Only refresh full data when battle status actually changes to important states
        if (previousStatus !== newBattleData.status && 
            (newBattleData.status === 'cards_revealed' || newBattleData.status === 'completed')) {
          console.log(`Battle status changed to: ${newBattleData.status}, refreshing data`);
          await fetchBattleData(true);
        } else {
          console.log(`Battle updated but status unchanged or not critical: ${newBattleData.status}`);
        }
        
        // Broadcast to other players only on status changes
        if (previousStatus !== newBattleData.status) {
          await battleChannel.send({
            type: 'broadcast',
            event: 'battle_update',
            payload: { 
              battle_id: battleId,
              new_status: newBattleData.status,
              updated_at: new Date().toISOString()
            }
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_selections', 
        filter: `battle_id=eq.${battleId}`
      }, async (payload) => {
        console.log('Database selection update:', payload.new);
        const data = payload.new as any;
        if (!data) return;
        
        setSelection(data);
        
        // Update player selection status immediately
        const currentBattle = battle; // Get current state to avoid stale closure
        const currentPlayer1Card = player1Card;
        const currentPlayer2Card = player2Card;
        
        if (user && currentBattle) {
          const isChallenger = user.id === currentBattle.challenger_id;
          const hasSelected = isChallenger ? !!data.player1_card_id : !!data.player2_card_id;
          const opponentSelected = isChallenger ? !!data.player2_card_id : !!data.player1_card_id;
          
          console.log(`Selection update - Player: ${hasSelected}, Opponent: ${opponentSelected}`);
          setPlayerHasSelectedCard(hasSelected);
          setOpponentHasSelectedCard(opponentSelected);
          
          if (opponentSelected) {
            setLastUpdateTime(new Date().toLocaleTimeString());
          }
        }
        
        // Fetch card details only if we don't already have them
        if ((!currentPlayer1Card && data.player1_card_id) || (!currentPlayer2Card && data.player2_card_id)) {
          console.log('Fetching missing card details after selection update');
          await fetchCardDetails(data);
        } else {
          console.log('Card details already available, skipping fetch');
        }
        
        // If both players submitted, broadcast update
        const bothSubmitted = data.player1_card_id && data.player2_card_id;
        if (bothSubmitted) {
          console.log('Both players submitted - broadcasting card_submitted event');
          await battleChannel.send({
            type: 'broadcast',
            event: 'card_submitted',
            payload: { 
              battle_id: battleId,
              both_submitted: true,
              submitted_at: new Date().toISOString()
            }
          });
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up battle subscriptions');
      subscriptionsSetupRef.current = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      clearInterval(pollInterval);
      supabase.removeChannel(battleChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [battleId, user, supabase, fetchCardDetails, fetchBattleData]);
  
  // We no longer need to trigger battle resolution from the client side
  // The Postgres database trigger automatically calls the resolve-battle Edge Function
  // when battle status changes to 'cards_revealed'
  useEffect(() => {
    // Add more detailed logging of battle status changes
    console.log(`Battle status changed in component state: ${battle?.status}`);
    
    // Reset resolution flag when battle changes to prevent persistence across battles
    if (battle?.status === 'active') {
      setHasAttemptedResolution(false);
    }
    
    if (battle?.status === 'cards_revealed' && battle.id) {
      console.log('Battle status is cards_revealed. Waiting for server-side resolution...');
    }
  }, [battle?.status, battle?.id]);

  // Check if both players have submitted their cards
  const bothPlayersSubmitted = useMemo(() => {
    return selection?.player1_card_id && selection?.player2_card_id;
  }, [selection]);
  
  // Track if the current user has submitted their card
  const hasSubmittedCard = useMemo(() => {
    if (!user || !selection) return false;
    const isChallenger = user.id === battle?.challenger_id;
    return isChallenger ? !!selection.player1_card_id : !!selection.player2_card_id;
  }, [selection, user, battle]);

  // Countdown timer for cards_revealed phase
  useEffect(() => {
    if (battle?.status === 'cards_revealed') {
      console.log('Starting countdown for cards_revealed phase');
      setCountdownSeconds(4); // 4 second countdown
      
      const countdownInterval = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    } else {
      setCountdownSeconds(0);
    }
  }, [battle?.status]);

  // Auto-resolve battle when both players have submitted cards - with proper delay for cards_revealed phase
  const [hasAttemptedResolution, setHasAttemptedResolution] = useState(false);
  
  useEffect(() => {
    const autoResolveBattle = async () => {
      console.log('Auto-resolve check triggered');
      console.log('Battle:', battle);
      console.log('Selection:', selection);
      
      if (!battle || !selection) {
        console.log('Missing battle or selection data, skipping auto-resolve');
        return;
      }
      
      // Check if both players have submitted their cards
      const bothSubmitted = selection.player1_card_id && selection.player2_card_id;
      
      console.log('Both players submitted:', bothSubmitted);
      console.log('Player 1 card ID:', selection.player1_card_id);
      console.log('Player 2 card ID:', selection.player2_card_id);
      console.log('Battle status:', battle.status);
      
      if (!bothSubmitted) {
        console.log('Not both players have submitted cards yet');
        return;
      }
      
      // Only try to resolve if battle is still in cards_revealed state and we haven't attempted resolution yet
      if (battle.status === 'cards_revealed' && !hasAttemptedResolution) {
        console.log('✅ Both players have submitted cards and battle is cards_revealed');
        console.log('⏱️ Waiting 4 seconds to allow players to see the revealed cards...');
        
        // Mark that we've attempted resolution to prevent multiple attempts
        setHasAttemptedResolution(true);
        
        // Wait 4 seconds to allow players to see the revealed cards
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Double-check the battle is still in cards_revealed state after the delay
        try {
          const { data: currentBattle, error: battleCheckError } = await supabase
            .from('battle_instances')
            .select('status')
            .eq('id', battle.id)
            .single();
            
          if (battleCheckError || !currentBattle) {
            console.error('Error checking battle status:', battleCheckError);
            return;
          }
          
          if (currentBattle.status !== 'cards_revealed') {
            console.log(`Battle status changed to ${currentBattle.status}, skipping resolution`);
            return;
          }
          
          console.log('🎯 Now calling resolve-battle after delay...');
          
          try {
            const { data, error } = await supabase.functions.invoke('resolve-battle', {
              body: { battle_id: battle.id }
            });
            
            if (error) {
              console.error('Error calling resolve-battle:', error);
              // Log the specific error details for debugging
              if (error.message) {
                console.error('Error message:', error.message);
              }
              if (error.details) {
                console.error('Error details:', error.details);
              }
            } else {
              console.log('Battle resolved successfully:', data);
            }
          } catch (err) {
            console.error('Error invoking resolve-battle function:', err);
            // Log the specific error for debugging
            if (err instanceof Error) {
              console.error('Error details:', err.message);
            }
          }
        } catch (err) {
          console.error('Error invoking resolve-battle function:', err);
          // Log the specific error for debugging
          if (err instanceof Error) {
            console.error('Error details:', err.message);
          }
        }
      } else {
        if (hasAttemptedResolution) {
          console.log('Resolution already attempted for this battle');
        } else {
          console.log(`Battle status is ${battle.status}, not cards_revealed`);
        }
      }
    };
    
    // Only trigger auto-resolve if we're in the right state and haven't attempted resolution
    if (battle?.status === 'cards_revealed' && 
        selection?.player1_card_id && 
        selection?.player2_card_id && 
        !hasAttemptedResolution) {
      console.log('🚀 Starting delayed auto-resolve process...');
      autoResolveBattle();
    }
    
  }, [battle?.status, selection?.player1_card_id, selection?.player2_card_id, hasAttemptedResolution, supabase]);

  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /> Loading Battle...</div>;
    }

    if (!battle) {
      return <div className="p-4 text-xl font-bold text-red-500">Battle not found.</div>;
    }

    // Phase 1: Card Selection
    if (battle.status === 'active') {
      if (checkingSelection) {
        return <div className="text-center p-8"><Loader2 className="mx-auto h-12 w-12 animate-spin" /> Checking game state...</div>;
      }
      
      // Show card selection only if the player hasn't selected a card yet
      // Check both database state and local state to be extra safe
      if (!playerHasSelectedCard && !hasPlayerSelected) {
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
              <h2 className="text-xl font-bold text-blue-400">Choose Your Card</h2>
              <p className="text-gray-400">Select a card to battle with</p>
              {opponentHasSelectedCard && (
                <p className="text-green-400 mt-2">✓ Opponent has selected their card ({lastUpdateTime})</p>
              )}
            </div>
            <CardSelectionGrid battleId={battle.id} onSelectionConfirmed={handleSelectionConfirmed} />
          </div>
        );
      }
      
      // Check if both players have submitted their cards
      if (selection?.player1_card_id && selection?.player2_card_id) {
        return (
          <div className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin" />
            <h2 className="text-2xl font-bold mt-4">Both Players Ready!</h2>
            <p className="text-gray-400">Cards will be revealed momentarily...</p>
            <div className="mt-4 space-y-2">
              <p className="text-green-400">✓ You have selected your card</p>
              <p className="text-green-400">✓ Opponent has selected their card</p>
              <p className="text-yellow-400">⏳ Waiting for battle to start...</p>
            </div>
            
            {/* Debug: Manual trigger button for testing */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6">
                <button
                  onClick={async () => {
                    console.log('🔧 Manual trigger: Forcing battle status check');
                    await handleRefresh();
                    
                    // If still active after refresh, try to force the status update
                    setTimeout(async () => {
                      const { data: currentBattle } = await supabase
                        .from('battle_instances')
                        .select('*')
                        .eq('id', battleId)
                        .single();
                        
                      if (currentBattle?.status === 'active') {
                        console.log('🔧 Battle still active, attempting manual status update');
                        // This is for debugging - in production this should be handled by the Edge Function
                        const { error } = await supabase
                          .from('battle_instances')
                          .update({ status: 'cards_revealed' })
                          .eq('id', battleId);
                          
                        if (!error) {
                          console.log('🔧 Manual status update successful');
                          setBattle(prev => prev ? { ...prev, status: 'cards_revealed' } : null);
                        }
                      }
                    }, 1000);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  🔧 Force Battle Progress (Debug)
                </button>
              </div>
            )}
          </div>
        );
      }
      
      return (
        <div className="text-center p-8">
          <Loader2 className="mx-auto h-12 w-12 animate-spin" />
          <h2 className="text-2xl font-bold mt-4">Cards Submitted!</h2>
          <div className="mt-4 space-y-2">
            <p className="text-green-400">✓ You have selected your card</p>
            <p className={`${opponentHasSelectedCard ? 'text-green-400' : 'text-gray-400'}`}>
              {opponentHasSelectedCard ? 
                `✓ Opponent has selected their card (${lastUpdateTime})` : 
                '⏳ Waiting for opponent to select their card...'
              }
            </p>
          </div>
        </div>
      );
    }

    // Phase 2: Cards Revealed - Show the reveal animation
    console.log(`Rendering content for battle status: ${battle.status}`);
    if (battle.status === 'cards_revealed') {
      console.log('Rendering cards_revealed state with both cards');
      return (
        <div className="text-center p-8 space-y-6">
          <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-6 animate-pulse">
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">⚔️ Cards Revealed!</h2>
            <p className="text-gray-300">Both players have chosen their cards</p>
            <div className="mt-4 text-yellow-400">
              {countdownSeconds > 0 ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold animate-bounce">{countdownSeconds}</div>
                  <p className="text-sm">Battle resolving in {countdownSeconds} second{countdownSeconds !== 1 ? 's' : ''}...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="text-sm">Resolving battle now...</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Determine which card belongs to current user */}
            {(() => {
              const isChallenger = user?.id === battle.challenger_id;
              const currentUserCard = isChallenger ? player1Card : player2Card;
              const opponentCard = isChallenger ? player2Card : player1Card;
              
              return (
                <>
                  {/* Current User's Card */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4 text-blue-400">Your Card</h3>
                                          {currentUserCard ? (
                        <div className="bg-gray-800 p-6 rounded-lg border-2 border-blue-500 transform transition-all duration-500 hover:scale-105 animate-fadeIn">
                          <h4 className="text-xl font-bold text-blue-400 mb-2">{currentUserCard.card_name}</h4>
                          <p className="text-sm text-gray-400 mb-2">{currentUserCard.card_type}</p>
                          <p className="text-sm text-gray-400 mb-4">{currentUserCard.rarity}</p>
                          {currentUserCard.rarity === 'unknown' && currentUserCard.card_name.includes('(') ? (
                            <p className="text-xs text-yellow-400 mb-2">ⓘ Card transferred - showing battle info</p>
                          ) : null}
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>STR:</span>
                              <span className="font-bold">{currentUserCard.attributes?.str || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>DEX:</span>
                              <span className="font-bold">{currentUserCard.attributes?.dex || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>INT:</span>
                              <span className="font-bold">{currentUserCard.attributes?.int || 0}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-800 p-6 rounded-lg border-2 border-blue-500 animate-pulse">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />
                          <p className="text-gray-400 mt-2">Loading card...</p>
                        </div>
                      )}
                  </div>
                  
                  {/* Opponent's Card */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-4 text-red-400">Opponent's Card</h3>
                                          {opponentCard ? (
                        <div className="bg-gray-800 p-6 rounded-lg border-2 border-red-500 transform transition-all duration-500 hover:scale-105 animate-fadeIn animation-delay-200">
                          <h4 className="text-xl font-bold text-red-400 mb-2">{opponentCard.card_name}</h4>
                          <p className="text-sm text-gray-400 mb-2">{opponentCard.card_type}</p>
                          <p className="text-sm text-gray-400 mb-4">{opponentCard.rarity}</p>
                          {opponentCard.rarity === 'unknown' && opponentCard.card_name.includes('(') ? (
                            <p className="text-xs text-yellow-400 mb-2">ⓘ Card transferred - showing battle info</p>
                          ) : null}
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>STR:</span>
                              <span className="font-bold">{opponentCard.attributes?.str || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>DEX:</span>
                              <span className="font-bold">{opponentCard.attributes?.dex || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>INT:</span>
                              <span className="font-bold">{opponentCard.attributes?.int || 0}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-800 p-6 rounded-lg border-2 border-red-500 animate-pulse">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-400" />
                          <p className="text-gray-400 mt-2">Loading card...</p>
                        </div>
                      )}
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">Determining winner...</p>
          </div>
        </div>
      );
    }
    
    // Phase 3: Battle In Progress
    if (battle.status === 'in_progress') {
      return <BattleGrid 
        battle={battle} 
        player1Card={player1Card} 
        player2Card={player2Card} 
        onResolveBattle={() => {
          if (battle.id) {
            console.log('Explicitly calling resolve-battle for in_progress state');
            supabase.functions.invoke('resolve-battle', {
              body: { battle_id: battle.id }
            })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error resolving battle:', error);
                return;
              }
              console.log('Battle resolved successfully:', data);
            });
          }
        }} 
      />;
    }

    // Phase 4: Battle Completed - Show results
    if (battle.status === 'completed') {
      console.log('Rendering completed battle results');
      
      const isWinner = battle.winner_id === user?.id;
      const isDraw = !battle.winner_id;
      
      return (
        <div className="text-center p-8 space-y-6">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h1 className={`text-4xl font-bold mb-4 ${
              isDraw ? 'text-yellow-400' : 
              isWinner ? 'text-green-400' : 'text-red-400'
            }`}>
              {isDraw ? 'It\'s a Draw!' : isWinner ? 'You Won!' : 'You Lost!'}
            </h1>
            
            {battle.winner_id && (
              <p className="text-gray-300 mb-4">
                Winner: {battle.winner_id === battle.challenger_id ? 'Challenger' : 'Opponent'}
              </p>
            )}
            
            <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto mt-6">
              {/* Determine which card belongs to current user for completed battle */}
              {(() => {
                const isChallenger = user?.id === battle.challenger_id;
                const currentUserCard = isChallenger ? player1Card : player2Card;
                const opponentCard = isChallenger ? player2Card : player1Card;
                
                return (
                  <>
                    {/* Current User's Card */}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Your Card</h3>
                                             {currentUserCard ? (
                         <div className="bg-gray-800 p-4 rounded-lg">
                           <h4 className="font-bold text-blue-400">{currentUserCard.card_name}</h4>
                           <p className="text-sm text-gray-400">{currentUserCard.card_type}</p>
                           <p className="text-sm text-gray-400">{currentUserCard.rarity}</p>
                           {currentUserCard.rarity === 'unknown' && currentUserCard.card_name.includes('(') ? (
                             <p className="text-xs text-yellow-400 mt-1">ⓘ Card transferred - showing battle info</p>
                           ) : null}
                           <div className="mt-2 text-sm">
                             <div>STR: {currentUserCard.attributes?.str || 0}</div>
                             <div>DEX: {currentUserCard.attributes?.dex || 0}</div>
                             <div>INT: {currentUserCard.attributes?.int || 0}</div>
                           </div>
                         </div>
                       ) : (
                         <div className="bg-gray-800 p-4 rounded-lg">
                           <p className="text-gray-400">Card data unavailable</p>
                         </div>
                       )}
                    </div>
                    
                    {/* Opponent's Card */}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Opponent's Card</h3>
                                             {opponentCard ? (
                         <div className="bg-gray-800 p-4 rounded-lg">
                           <h4 className="font-bold text-red-400">{opponentCard.card_name}</h4>
                           <p className="text-sm text-gray-400">{opponentCard.card_type}</p>
                           <p className="text-sm text-gray-400">{opponentCard.rarity}</p>
                           {opponentCard.rarity === 'unknown' && opponentCard.card_name.includes('(') ? (
                             <p className="text-xs text-yellow-400 mt-1">ⓘ Card transferred - showing battle info</p>
                           ) : null}
                           <div className="mt-2 text-sm">
                             <div>STR: {opponentCard.attributes?.str || 0}</div>
                             <div>DEX: {opponentCard.attributes?.dex || 0}</div>
                             <div>INT: {opponentCard.attributes?.int || 0}</div>
                           </div>
                         </div>
                       ) : (
                         <div className="bg-gray-800 p-4 rounded-lg">
                           <p className="text-gray-400">Card data unavailable</p>
                         </div>
                       )}
                    </div>
                  </>
                );
              })()}
            </div>
            
            <div className="mt-6 space-y-4">
              <button
                onClick={() => window.location.href = '/game'}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Return to Game
              </button>
              
              <button
                onClick={() => window.location.href = '/game/arena/lobby'}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold ml-4"
              >
                Find New Battle
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <div className="p-4 text-xl font-bold">Unhandled battle status: {battle.status}</div>;
  };

  return (
    <div className="content-height">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Battle Arena - {battle?.id}</h1>
          <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Debug Panel - Remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <h3 className="text-sm font-bold text-yellow-400 mb-2">🔧 Debug Info</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p><strong>Battle Status:</strong> {battle?.status || 'N/A'}</p>
              <p><strong>Battle ID:</strong> {battle?.id || 'N/A'}</p>
              <p><strong>User ID:</strong> {user?.id?.slice(0, 8) || 'N/A'}...</p>
              <p><strong>Is Challenger:</strong> {user?.id === battle?.challenger_id ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p><strong>Player1 Card:</strong> {selection?.player1_card_id ? '✅' : '❌'}</p>
              <p><strong>Player2 Card:</strong> {selection?.player2_card_id ? '✅' : '❌'}</p>
              <p><strong>Both Submitted:</strong> {selection?.player1_card_id && selection?.player2_card_id ? '✅' : '❌'}</p>
              <p><strong>Countdown:</strong> {countdownSeconds > 0 ? `${countdownSeconds}s` : 'N/A'}</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs"><strong>Selection Data:</strong> {JSON.stringify(selection, null, 2)}</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {battle?.status === 'cards_revealed' && (
            <button
              onClick={() => {
                if (battle.id) {
                  console.log('Explicitly calling resolve-battle-v2 for cards_revealed state');
                  supabase.functions.invoke('resolve-battle-v2', {
                    body: { battle_id: battle.id }
                  })
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('Error resolving battle:', error);
                      return;
                    }
                    console.log('Battle resolved successfully:', data);
                  });
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
          {/* Manual resolve button removed - auto-resolve is now working properly */}
        </div>
      </div>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-3/4">
            {renderContent()}
          </div>
          <div className="w-full lg:w-1/4">
            {battle && <GameLog battleState={battle} />}
          </div>
        </div>
      </div>
    </div>
  );
}
