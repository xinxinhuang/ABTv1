'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { BattleGrid } from '@/components/game/battle/BattleGrid';
import { CardSelectionGrid } from '@/components/game/battle/CardSelectionGrid';
import { GameLog } from '@/components/game/battle/GameLog';
import { BattleInstance, BattleSelection } from '@/types/battle';

export default function BattlePage() {
  const { battleId } = useParams();
  const { user } = useUser();
  const supabase = createClient();
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [selection, setSelection] = useState<any>(null);
  const [player1Card, setPlayer1Card] = useState<any>(null);
  const [player2Card, setPlayer2Card] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const hasPlayerSelected = useMemo(() => {
    if (!user || !selection) return false;
    const isChallenger = user.id === battle?.challenger_id;
    return isChallenger ? !!selection.player1_card_id : !!selection.player2_card_id;
  }, [selection, user, battle]);

  const handleSelectionConfirmed = () => {
    // Update UI immediately to reflect card selection
    if (user && battle) {
      const isChallenger = user.id === battle.challenger_id;
      const updatedSelection = selection ? {...selection} : {
        battle_id: battleId as string,
        created_at: new Date().toISOString(),
      };
      
      if (isChallenger) {
        updatedSelection.player1_id = user.id;
        updatedSelection.player1_card_id = 'placeholder';
        updatedSelection.player1_submitted_at = new Date().toISOString();
      } else {
        updatedSelection.player2_id = user.id;
        updatedSelection.player2_card_id = 'placeholder';
        updatedSelection.player2_submitted_at = new Date().toISOString();
      }
      
      setSelection(updatedSelection);
    }
  };

  useEffect(() => {
    if (!battleId || !user) return;

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
        event: '*', 
        schema: 'public', 
        table: 'battle_instances', 
        filter: `id=eq.${battleId}` 
      }, (payload) => setBattle(payload.new as BattleInstance))
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'battle_selections', 
        filter: `battle_id=eq.${battleId}` 
      }, async () => {
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
        
        setSelection(data);
        
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
  }, [battleId, user, supabase]);
  
  // Auto-trigger battle resolution after a short delay when cards are revealed
  useEffect(() => {
    // Only trigger battle resolution if both cards are loaded and battle status is cards_revealed
    if (battle?.status === 'cards_revealed' && player1Card && player2Card && battle.id) {
      const timer = setTimeout(() => {
        console.log('Auto-triggering battle resolution...');
        // Call the resolve-battle Edge Function
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resolve-battle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            battle_id: battle.id
          })
        })
        .then(res => res.json())
        .then(data => console.log('Battle resolved:', data))
        .catch(err => console.error('Error resolving battle:', err));
      }, 3000); // 3 second delay to let players see the cards
      
      return () => clearTimeout(timer);
    }
  }, [battle?.status]);

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
      if (!hasPlayerSelected) {
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
          if (battle.id) {
            // Manual trigger for battle resolution
            fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resolve-battle`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                battle_id: battle.id
              })
            })
            .then(res => res.json())
            .then(data => console.log('Battle resolved:', data))
            .catch(err => console.error('Error resolving battle:', err));
          }
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
            // Call the resolve-battle Edge Function
            fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resolve-battle`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                battle_id: battle.id
              })
            })
            .then(res => res.json())
            .then(data => console.log('Battle resolved:', data))
            .catch(err => console.error('Error resolving battle:', err));
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
