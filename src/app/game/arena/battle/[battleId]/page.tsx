'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
  const [checkingSelection, setCheckingSelection] = useState(true);
  const [playerHasSelectedCard, setPlayerHasSelectedCard] = useState(false);

  // Determine if the current player has already submitted a card
  const hasPlayerSelected = useMemo(() => {
    if (!user || !selection) return false;
    const isChallenger = user.id === battle?.challenger_id;
    return isChallenger ? !!selection.player1_card_id : !!selection.player2_card_id;
  }, [selection, user, battle]);

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
          console.log(`Player selection status: ${hasSelected ? 'already selected' : 'not selected yet'} (${isChallenger ? 'Challenger' : 'Opponent'})`);
          setPlayerHasSelectedCard(hasSelected);
        } else {
          // No selection record exists yet
          console.log('No selection record found for this battle');
          setPlayerHasSelectedCard(false);
        }
      } catch (err) {
        console.error('Error checking player selection:', err);
      } finally {
        setCheckingSelection(false);
      }
    };
    
    checkPlayerSelection();
  }, [battle?.id, user, battle?.challenger_id, supabase]);

  useEffect(() => {
    if (!battleId || !user) return;

    const fetchBattleData = async () => {
      setLoading(true);
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

        // Fetch battle selection without nested queries
        // Use raw REST API call to avoid 406 errors
        const battleSelectionsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/battle_selections?battle_id=eq.${battleId}&limit=1`;
        const response = await fetch(battleSelectionsUrl, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        let selectionData = null;
        let selectionError = null;
        
        if (response.ok) {
          const data = await response.json();
          selectionData = data[0] || null; // Get first result or null
        } else {
          selectionError = { 
            message: `Error fetching battle selection: ${response.status} ${response.statusText}`,
            code: response.status.toString()
          };
        }

        if (selectionError) {
          if (selectionError.code !== 'PGRST116') { // Not found is expected if no selections yet
            console.error('Error fetching battle selection:', selectionError);
          }
        } else if (selectionData) {
          setSelection(selectionData);
          
          // Fetch card details separately if cards are selected
          if (selectionData.player1_card_id) {
            // First get the player_card details
            const { data: player1CardData, error: player1CardError } = await supabase
              .from('player_cards')
              .select('*')
              .eq('id', selectionData.player1_card_id)
              .single();
              
            if (player1CardData && !player1CardError) {
              // Then get the card details
              const { data: cardData, error: cardError } = await supabase
                .from('cards')
                .select('*')
                .eq('id', player1CardData.card_id)
                .single();
                
              if (cardData && !cardError) {
                setPlayer1Card(cardData);
              }
            }
          }
          
          if (selectionData.player2_card_id) {
            // First get the player_card details
            const { data: player2CardData, error: player2CardError } = await supabase
              .from('player_cards')
              .select('*')
              .eq('id', selectionData.player2_card_id)
              .single();
              
            if (player2CardData && !player2CardError) {
              // Then get the card details
              const { data: cardData, error: cardError } = await supabase
                .from('cards')
                .select('*')
                .eq('id', player2CardData.card_id)
                .single();
                
              if (cardData && !cardError) {
                setPlayer2Card(cardData);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching battle data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBattleData();

    const battleChannel = supabase
      .channel(`battle-page:${battleId}`)
      .on('postgres_changes', {
        event: 'UPDATE', // Only listen for update events, not inserts or deletes
        schema: 'public',
        table: 'battle_instances',
        filter: `id=eq.${battleId}`,
      }, (payload) => {
        console.log('Battle instance updated:', payload.new);
        setBattle(payload.new as BattleInstance);
      })
      .on('postgres_changes', { 
        event: '*', // Listen for INSERT and UPDATE
        schema: 'public',
        table: 'battle_selections',
        filter: `battle_id=eq.${battleId}`
      }, async (payload) => {
        console.log('Battle selections updated, fetching latest data');
        // Use direct fetch to avoid 406 errors
        const battleSelectionsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/battle_selections?battle_id=eq.${battleId}&limit=1`;
        const response = await fetch(battleSelectionsUrl, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error(`Error fetching battle selection: ${response.status} ${response.statusText}`);
          return;
        }
        
        const jsonData = await response.json();
        const data = jsonData[0] || null; // Get first result or null
        
        if (!data) return;
        
        console.log('Received battle selection data:', data);
        setSelection(data);
        
        // Update player's selection status
        if (user) {
          const isChallenger = user.id === battle?.challenger_id;
          const hasSelected = isChallenger ? !!data.player1_card_id : !!data.player2_card_id;
          setPlayerHasSelectedCard(hasSelected);
        }
        
        // Also refresh battle instance to make sure we have the latest status
        const { data: refreshedBattle } = await supabase
          .from('battle_instances')
          .select('*')
          .eq('id', battleId)
          .single();
          
        if (refreshedBattle) {
          console.log(`Refreshed battle status: ${refreshedBattle.status}`);
          setBattle(refreshedBattle);
        }
        
        // Fetch card details separately if cards are selected
        if (data.player1_card_id) {
          // First get the player_card details
          const { data: player1CardData, error: player1CardError } = await supabase
            .from('player_cards')
            .select('*')
            .eq('id', data.player1_card_id)
            .single();
            
          if (player1CardData && !player1CardError) {
            // Then get the card details
            const { data: cardData, error: cardError } = await supabase
              .from('cards')
              .select('*')
              .eq('id', player1CardData.card_id)
              .single();
              
            if (cardData && !cardError) {
              setPlayer1Card(cardData);
            }
          }
        }
        
        if (data.player2_card_id) {
          // First get the player_card details
          const { data: player2CardData, error: player2CardError } = await supabase
            .from('player_cards')
            .select('*')
            .eq('id', data.player2_card_id)
            .single();
            
          if (player2CardData && !player2CardError) {
            // Then get the card details
            const { data: cardData, error: cardError } = await supabase
              .from('cards')
              .select('*')
              .eq('id', player2CardData.card_id)
              .single();
              
            if (cardData && !cardError) {
              setPlayer2Card(cardData);
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(battleChannel);
    };
  }, [battleId, user, supabase, battle?.challenger_id]);
  
  // We no longer need to trigger battle resolution from the client side
  // The Postgres database trigger automatically calls the resolve-battle Edge Function
  // when battle status changes to 'cards_revealed'
  useEffect(() => {
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
        return <CardSelectionGrid battleId={battle.id} onSelectionConfirmed={handleSelectionConfirmed} />;
      }
      
      return (
        <div className="text-center p-8">
          <Loader2 className="mx-auto h-12 w-12 animate-spin" />
          <h2 className="text-2xl font-bold mt-4">Cards Submitted!</h2>
          <p className="text-gray-400">Waiting for opponent to select their cards...</p>
        </div>
      );
    }

    // Phase 2: Cards Revealed - Show the reveal animation
    if (battle.status === 'cards_revealed') {
      return <BattleGrid 
        battle={battle} 
        player1Card={player1Card} 
        player2Card={player2Card} 
        onResolveBattle={() => { 
          // This is now handled by the database trigger, so this can be a no-op or for logging.
          console.log('Battle resolution is handled by the server-side trigger.');
        }} 
      />;
    }
    
    // Phase 3: Battle In Progress and Completion
    if (battle.status === 'in_progress' || battle.status === 'completed') {
      return <BattleGrid 
        battle={battle} 
        player1Card={player1Card} 
        player2Card={player2Card} 
        onResolveBattle={() => {
          if (battle.id) {
            // This is now handled by the database trigger, so this can be a no-op or for logging.
            console.log('Battle resolution is handled by the server-side trigger.');
            supabase.functions.invoke('resolve-battle', {
              body: { battle_id: battle.id }
            })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error resolving battle:', error);
                return;
              }
              console.log('Battle resolved:', data);
            });
          }
        }} 
      />;
    }

    return <div className="p-4 text-xl font-bold">Unhandled battle status: {battle.status}</div>;
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Battle Arena - {battle?.id}</h1>
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
