'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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

  // Function to fetch card details when selections are made
  const fetchCardDetails = useCallback(async (selectionData: any) => {
    console.log('Fetching card details for selections:', selectionData);
    
    try {
      // Fetch player 1 card details
      if (selectionData.player1_card_id) {
        const { data: player1CardData, error: player1CardError } = await supabase
          .from('player_cards')
          .select('*')
          .eq('id', selectionData.player1_card_id)
          .single();
          
        if (player1CardData && !player1CardError) {
          const { data: cardData, error: cardError } = await supabase
            .from('cards')
            .select('*')
            .eq('id', player1CardData.card_id)
            .single();
            
          if (cardData && !cardError) {
            console.log('Setting player 1 card:', cardData);
            setPlayer1Card(cardData);
          }
        }
      }
      
      // Fetch player 2 card details
      if (selectionData.player2_card_id) {
        const { data: player2CardData, error: player2CardError } = await supabase
          .from('player_cards')
          .select('*')
          .eq('id', selectionData.player2_card_id)
          .single();
          
        if (player2CardData && !player2CardError) {
          const { data: cardData, error: cardError } = await supabase
            .from('cards')
            .select('*')
            .eq('id', player2CardData.card_id)
            .single();
            
          if (cardData && !cardError) {
            console.log('Setting player 2 card:', cardData);
            setPlayer2Card(cardData);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching card details:', err);
    }
  }, [supabase]);
  
  const handleSelectionConfirmed = async (cardId: string) => {
    if (!user || !battle || !cardId) return;

    console.log(`Player ${user.id} selected card ${cardId} for battle ${battle.id}`);
    setPlayerHasSelectedCard(true); // Update UI state
    
    // No need to make another API call - CardSelectionGrid.tsx already handled the submission
    // The realtime subscription will handle updating the state from the database.
    console.log('Card selection confirmed in battle page component');
  };

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
  }, [battle?.id, user, battle?.challenger_id, supabase]);

  // Extract fetchBattleData as a standalone function that can be reused
  const fetchBattleData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      console.log(`Fetching battle data for ${battleId}`);
      const { data: battleData, error: battleError } = await supabase
        .from('battle_instances')
        .select('*')
        .eq('id', battleId)
        .single();

      if (battleError || !battleData) throw new Error('Battle not found');
      console.log(`Retrieved battle data: status=${battleData.status}`);
      setBattle(battleData);

      // Fetch battle selection using Supabase client
      console.log('Fetching battle selection...');
      const { data: selectionData, error: selectionError } = await supabase
        .from('battle_selections')
        .select('*')
        .eq('battle_id', battleId)
        .maybeSingle();
      
      console.log('Selection data:', selectionData);
      console.log('Selection error:', selectionError);

      if (selectionError && selectionError.code !== 'PGRST116') {
        console.error('Error fetching battle selection:', selectionError);
      } else if (selectionData) {
        setSelection(selectionData);
        
        // Set player and opponent selection status
        if (user && battleData) {
          const isChallenger = user.id === battleData.challenger_id;
          const hasSelected = isChallenger ? !!selectionData.player1_card_id : !!selectionData.player2_card_id;
          const opponentSelected = isChallenger ? !!selectionData.player2_card_id : !!selectionData.player1_card_id;
          
          console.log(`Player (${isChallenger ? 'challenger' : 'opponent'}) has selected: ${hasSelected}`);
          console.log(`Opponent has selected: ${opponentSelected}`);
          
          setPlayerHasSelectedCard(hasSelected);
          setOpponentHasSelectedCard(opponentSelected);
          
          if (opponentSelected) {
            setLastUpdateTime(new Date().toLocaleTimeString());
          }
        }
        
        // Use the fetchCardDetails function to get card information
        await fetchCardDetails(selectionData);
      } else {
        console.warn('No selection data found - this may indicate a database issue');
        setSelection(null);
      }
    } catch (err) {
      console.error('Error fetching battle data:', err);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [battleId, user, supabase, fetchCardDetails]);

  // Manual trigger for auto-resolve (for debug purposes)
  const triggerAutoResolve = useCallback(async () => {
    console.log('Manually triggering auto-resolve...');
    if (!battle || !selection) {
      console.log('Missing battle or selection data for manual trigger');
      return;
    }
    
    const bothSubmitted = selection.player1_card_id && selection.player2_card_id;
    console.log('Both players submitted:', bothSubmitted);
    console.log('Battle status:', battle.status);
    
    // Only attempt to resolve if battle is in cards_revealed status
    if (battle.status === 'completed') {
      console.log('Battle is already completed, skipping auto-resolve');
      return;
    }
    
    if (bothSubmitted && battle.status === 'cards_revealed') {
      console.log('Calling resolve-battle-v2 manually...');
      try {
        const { data, error } = await supabase.functions.invoke('resolve-battle-v2', {
          body: { battle_id: battle.id }
        });
        
        if (error) {
          console.error('Manual resolve error:', error);
        } else {
          console.log('Manual resolve success:', data);
        }
      } catch (err) {
        console.error('Manual resolve exception:', err);
      }
    } else {
      console.log(`Battle not ready for resolution. Status: ${battle.status}, Both submitted: ${bothSubmitted}`);
    }
  }, [battle, selection, supabase]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');
    await fetchBattleData(true);
    // After refresh, trigger auto-resolve if needed (but only if battle isn't already completed)
    setTimeout(() => {
      if (battle?.status !== 'completed') {
        triggerAutoResolve();
      } else {
        console.log('Battle already completed, skipping auto-resolve trigger');
      }
    }, 1000);
  }, [fetchBattleData, triggerAutoResolve, battle?.status]);

  useEffect(() => {
    if (!battleId || !user) return;
    fetchBattleData();

    // Set up a single channel for all battle-related subscriptions
    const battleChannel = supabase
      .channel(`battle-page:${battleId}`)
      .on('postgres_changes', {
        event: 'UPDATE', // Only listen for update events, not inserts or deletes
        schema: 'public',
        table: 'battle_instances',
        filter: `id=eq.${battleId}`,
      }, async (payload) => {
        console.log('Battle instance updated:', payload.new);
        const newBattleData = payload.new as BattleInstance;
        
        // Make sure to update the battle state when status changes
        setBattle(newBattleData);
        
        // Log the status change clearly for debugging
        console.log(`Battle status changed to: ${newBattleData.status}`);
        
        // If status changed to cards_revealed, make sure we have the card details
        if (newBattleData.status === 'cards_revealed') {
          console.log('Status changed to cards_revealed, ensuring we have card details');
          
          // Fetch the latest selection data to ensure we have the most up-to-date information
          const { data: latestSelection } = await supabase
            .from('battle_selections')
            .select('*')
            .eq('battle_id', battleId)
            .single();
            
          if (latestSelection) {
            console.log('Fetched latest selection data:', latestSelection);
            setSelection(latestSelection);
            
            // Make sure we have the card details
            await fetchCardDetails(latestSelection);
          }
        }
      })
      .on('postgres_changes', { 
        event: '*', // Listen for INSERT and UPDATE
        schema: 'public',
        table: 'battle_selections',
        filter: `battle_id=eq.${battleId}`
      }, async (payload) => {
        console.log('Battle selections updated:', payload.new);
        
        // Get the updated selection data
        const data = payload.new as any;
        
        if (!data) return;
        
        console.log('Received battle selection data:', data);
        setSelection(data);
        
        // Check if both players have submitted their cards
        const bothSubmitted = data.player1_card_id && data.player2_card_id;
        
        // Update player's selection status
        if (user) {
          const isChallenger = user.id === battle?.challenger_id;
          const hasSelected = isChallenger ? !!data.player1_card_id : !!data.player2_card_id;
          const opponentSelected = isChallenger ? !!data.player2_card_id : !!data.player1_card_id;
          
          console.log(`Player selection status: ${hasSelected ? 'selected' : 'not selected'}`);
          console.log(`Opponent selection status: ${opponentSelected ? 'selected' : 'not selected'}`);
          
          setPlayerHasSelectedCard(hasSelected);
          setOpponentHasSelectedCard(opponentSelected);
          
          // Update timestamp when opponent selects
          if (opponentSelected) {
            setLastUpdateTime(new Date().toLocaleTimeString());
          }
        }
        
        // Fetch card details immediately
        fetchCardDetails(data);
        
        // If both players have submitted cards, refresh battle instance to get updated status
        if (bothSubmitted) {
          console.log('Both players have submitted cards, refreshing battle status...');
          
          // Also refresh battle instance to make sure we have the latest status
          const { data: refreshedBattle } = await supabase
            .from('battle_instances')
            .select('*')
            .eq('id', battleId)
            .single();
            
          if (refreshedBattle) {
            console.log(`Refreshed battle status: ${refreshedBattle.status}`);
            // Force UI update by setting battle state directly
            setBattle(refreshedBattle);
          }
        }
        
        // We already called fetchCardDetails earlier, no need to duplicate
      })
      .subscribe(async (status) => {
        console.log(`Subscribed to battle selections channel: ${status}`);
      });

    return () => {
      console.log('Unsubscribing from battle channel');
      supabase.removeChannel(battleChannel);
    };
  }, [battleId, user, supabase, battle?.challenger_id, fetchCardDetails, fetchBattleData]);
  
  // We no longer need to trigger battle resolution from the client side
  // The Postgres database trigger automatically calls the resolve-battle Edge Function
  // when battle status changes to 'cards_revealed'
  useEffect(() => {
    // Add more detailed logging of battle status changes
    console.log(`Battle status changed in component state: ${battle?.status}`);
    
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

  // Auto-resolve battle when both players have submitted cards
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
      
      // Only try to resolve if battle is still in cards_revealed state
      if (battle.status === 'cards_revealed') {
        console.log('✅ Both players have submitted cards and battle is cards_revealed, calling resolve-battle-v2...');
        
        try {
          const { data, error } = await supabase.functions.invoke('resolve-battle-v2', {
            body: { battle_id: battle.id }
          });
          
          if (error) {
            console.error('Error calling resolve-battle-v2:', error);
            // Fallback to original function if v2 fails
            try {
              const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('resolve-battle', {
                body: { battle_id: battle.id }
              });
              
              if (fallbackError) {
                console.error('Both resolve functions failed:', fallbackError);
              } else {
                console.log('Battle resolved successfully with fallback:', fallbackData);
              }
            } catch (fallbackErr) {
              console.error('Fallback function also failed:', fallbackErr);
            }
          } else {
            console.log('Battle resolved successfully with v2:', data);
          }
        } catch (err) {
          console.error('Error invoking resolve-battle-v2 function:', err);
          // Log the specific error for debugging
          if (err instanceof Error) {
            console.error('Error details:', err.message);
          }
        }
      } else {
        console.log(`Battle status is ${battle.status}, not cards_revealed`);
      }
    };
    
    // Check immediately without delay for faster response
    autoResolveBattle();
    
    // Also check after a delay to catch any race conditions
    const timeoutId = setTimeout(autoResolveBattle, 500);
    
    return () => clearTimeout(timeoutId);
  }, [battle, selection, supabase]);

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
      if (bothPlayersSubmitted) {
        return (
          <div className="text-center p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin" />
            <h2 className="text-2xl font-bold mt-4">Both Players Ready!</h2>
            <p className="text-gray-400">Preparing to reveal cards...</p>
            <div className="mt-4 space-y-2">
              <p className="text-green-400">✓ You have selected your card</p>
              <p className="text-green-400">✓ Opponent has selected their card</p>
              <p className="text-yellow-400">Battle starting...</p>
            </div>
            
            {/* Manual trigger button for debugging */}
            <div className="mt-6">
              <button
                onClick={() => {
                  console.log('Manual battle resolution triggered');
                  if (battle.id) {
                    supabase.functions.invoke('resolve-battle-v2', {
                      body: { battle_id: battle.id }
                    })
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('Manual resolution error:', error);
                      } else {
                        console.log('Manual resolution success:', data);
                      }
                    });
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Manual Resolve (Debug)
              </button>
            </div>
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
      console.log('Rendering BattleGrid for cards_revealed state');
      return <BattleGrid 
        battle={battle} 
        player1Card={player1Card} 
        player2Card={player2Card} 
        onResolveBattle={() => { 
          // Explicitly call the resolve-battle-v2 function to ensure battle_cards are updated
          console.log('Explicitly calling resolve-battle-v2 to ensure battle_cards are updated');
          
          if (battle.id) {
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
      />;
    }
    
    // Phase 3: Battle In Progress
    if (battle.status === 'in_progress') {
      return <BattleGrid 
        battle={battle} 
        player1Card={player1Card} 
        player2Card={player2Card} 
        onResolveBattle={() => {
          if (battle.id) {
            console.log('Explicitly calling resolve-battle-v2 for in_progress state');
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
              {/* Player 1 Card */}
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Challenger's Card</h3>
                {player1Card ? (
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-400">{player1Card.name}</h4>
                    <p className="text-sm text-gray-400">{player1Card.type}</p>
                    <p className="text-sm text-gray-400">{player1Card.rarity}</p>
                    <div className="mt-2 text-sm">
                      <div>STR: {player1Card.attributes?.str || 0}</div>
                      <div>DEX: {player1Card.attributes?.dex || 0}</div>
                      <div>INT: {player1Card.attributes?.int || 0}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-400">Card data unavailable</p>
                  </div>
                )}
              </div>
              
              {/* Player 2 Card */}
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Opponent's Card</h3>
                {player2Card ? (
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-400">{player2Card.name}</h4>
                    <p className="text-sm text-gray-400">{player2Card.type}</p>
                    <p className="text-sm text-gray-400">{player2Card.rarity}</p>
                    <div className="mt-2 text-sm">
                      <div>STR: {player2Card.attributes?.str || 0}</div>
                      <div>DEX: {player2Card.attributes?.dex || 0}</div>
                      <div>INT: {player2Card.attributes?.int || 0}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-400">Card data unavailable</p>
                  </div>
                )}
              </div>
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
          {battle?.status === 'cards_revealed' && (
            <button
              onClick={triggerAutoResolve}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Force Resolve
            </button>
          )}
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
  );
}
