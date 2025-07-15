'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';

import { CardSelector, BattleCard } from '@/components/game/battle/CardSelector';
import { PlayerStatus } from '@/components/game/battle/PlayerStatus';

export default function PreBattleRoomPage() {
  const supabase = createClient();
  const { user } = useUser();
  const { lobbyId } = useParams();
  const [lobbyState, setLobbyState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [playerCards, setPlayerCards] = useState<BattleCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<BattleCard | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch player's cards
  useEffect(() => {
    if (!user) return;

    const fetchCards = async () => {
      const { data, error } = await supabase
        .from('player_cards')
        .select('*, cards(*)')
        .eq('player_id', user.id);

      if (error) {
        console.error('Error fetching player cards:', error);
        setError('Could not load your cards.');
        return;
      }

      const formattedCards: BattleCard[] = data.map((pc: any) => ({
        id: pc.id, // This is player_card_id
        name: pc.cards.name,
        imageUrl: pc.cards.image_url,
        rarity: pc.cards.rarity,
        type: pc.cards.type,
        attributes: pc.cards.attributes,
      }));
      setPlayerCards(formattedCards);
    };

    fetchCards();
  }, [user, supabase]);

  // Fetch lobby and subscribe to updates
  useEffect(() => {
    if (!lobbyId) return;

    const fetchLobby = async () => {
      const { data, error } = await supabase
        .from('battle_lobbies')
        .select('*, player1:player1_id(username), player2:player2_id(username)')
        .eq('id', lobbyId)
        .single();

      if (error) {
        setError('Lobby not found or an error occurred.');
        return;
      }
      setLobbyState(data);
    };

    fetchLobby();

    const channel = supabase.channel(`battle:${lobbyId}`);
    channel
      .on('broadcast', { event: 'state_change' }, ({ payload }) => {
        setLobbyState(payload.newState);
      })
      .on('broadcast', { event: 'battle_start' }, () => {
        console.log('Battle is starting!');
        // Potentially navigate to the battle page
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [lobbyId, supabase]);

  const handleCardSelect = (card: BattleCard) => {
    setSelectedCard(card);
  };

  const handleConfirmSelection = async (card: BattleCard) => {
    if (!user || !lobbyId) return;
    setIsSubmitting(true);

    const { error } = await supabase.functions.invoke('select-card-v2', {
      body: {
        battle_id: lobbyId,
        player_id: user.id,
        card_id: card.id,
      },
    });

    if (error) {
      setError('Failed to confirm selection. Please try again.');
      console.error(error);
    }
    // The submission status will be updated via broadcast
    // so we don't set isSubmitting to false here immediately
  };

  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!lobbyState) return <div>Loading Pre-Battle Room...</div>;

  const player1 = lobbyState.player1;
  const player2 = lobbyState.player2;

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Pre-Battle Room</h1>
        <div className="grid grid-cols-2 gap-8 items-center mb-8">
          <div className="text-center">
            <PlayerStatus name={player1.username} isReady={lobbyState.battle_state?.player1_ready || false} />
          </div>
          <div className="text-center">
            <PlayerStatus name={player2.username} isReady={lobbyState.battle_state?.player2_ready || false} />
          </div>
        </div>
        
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Select Your Champion</h2>
          <CardSelector 
            cards={playerCards}
            onCardSelect={handleCardSelect}
            onConfirmSelection={handleConfirmSelection}
            selectedCard={selectedCard}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
