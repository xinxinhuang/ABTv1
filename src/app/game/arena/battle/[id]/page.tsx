'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/types/game';
import { CardDisplay } from '@/components/game/CardDisplay';
import { CardSelection } from '@/components/game/battle/CardSelection';
import { BattleArena } from '@/components/game/battle/BattleArena';
import { BattleResults } from '@/components/game/battle/BattleResults';
import { Button } from '@/components/ui/Button';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { toast } from 'sonner';
import { onlinePlayersService } from '@/lib/services/onlinePlayersService';
import { Loader2, Shield, Swords } from 'lucide-react';

interface BattleInstance {
  id: string;
  player1_id: string;
  player2_id: string;
  status: 'pending' | 'selecting' | 'active' | 'completed';
  winner_id: string | null;
  created_at: string;
  completed_at: string | null;
  transfer_completed: boolean;
}

interface BattleCard {
  battle_id: string;
  player_id: string;
  card_id: string;
  is_staked: boolean;
  selected_at: string;
}

interface PlayerProfile {
  id: string;
  username: string;
  avatar_url?: string;
}

export default function BattlePage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [battle, setBattle] = useState<BattleInstance | null>(null);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [opponentCard, setOpponentCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCardSelectionPhase, setIsCardSelectionPhase] = useState(false);
  const [isBattlePhase, setIsBattlePhase] = useState(false);
  const [isStaking, setIsStaking] = useState(true);
  const [player1Profile, setPlayer1Profile] = useState<PlayerProfile | null>(null);
  const [player2Profile, setPlayer2Profile] = useState<PlayerProfile | null>(null);
  const [battleResult, setBattleResult] = useState<{
    winner: 'player1' | 'player2' | 'draw' | null;
    message: string;
  } | null>(null);
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  // Fetch battle data and user info
  useEffect(() => {
    const fetchBattleAndUser = async () => {
      setIsLoading(true);
      
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to access battles');
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      // Fetch battle instance
      const { data: battleData, error: battleError } = await supabase
        .from('battle_instances')
        .select('*')
        .eq('id', battleId)
        .single();
      
      if (battleError || !battleData) {
        toast.error('Battle not found');
        router.push('/game/arena');
        return;
      }
      
      setBattle(battleData);
      
      // Check if user is part of this battle
      if (battleData.player1_id !== session.user.id && battleData.player2_id !== session.user.id) {
        toast.error('You are not part of this battle');
        router.push('/game/arena');
        return;
      }
      
      // Fetch player profiles
      const { data: player1Data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', battleData.player1_id)
        .single();
        
      const { data: player2Data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', battleData.player2_id)
        .single();
        
      setPlayer1Profile(player1Data || { id: battleData.player1_id, username: 'Player 1' });
      setPlayer2Profile(player2Data || { id: battleData.player2_id, username: 'Player 2' });
      
      // Fetch player's cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('player_cards')
        .select('*')
        .eq('player_id', session.user.id)
        .eq('card_type', 'humanoid')
        .order('obtained_at', { ascending: false });
      
      if (cardsError) {
        console.error('Error fetching cards:', cardsError);
        toast.error('Failed to load your cards');
      } else {
        setPlayerCards(cardsData || []);
      }
      
      // Check if battle is in selection phase
      if (battleData.status === 'pending') {
        // Update battle status to selecting
        await supabase
          .from('battle_instances')
          .update({ status: 'selecting' })
          .eq('id', battleId);
          
        setIsCardSelectionPhase(true);
      } else if (battleData.status === 'selecting') {
        setIsCardSelectionPhase(true);
        
        // Check if player has already selected a card
        const { data: playerCardData } = await supabase
          .from('battle_cards')
          .select('*')
          .eq('battle_id', battleId)
          .eq('player_id', session.user.id)
          .single();
          
        if (playerCardData) {
          // Find the card in player's cards
          const card = cardsData?.find(c => c.id === playerCardData.card_id) || null;
          setSelectedCard(card);
          setIsStaking(playerCardData.is_staked);
        }
        
        // Check if opponent has selected a card
        const opponentId = session.user.id === battleData.player1_id 
          ? battleData.player2_id 
          : battleData.player1_id;
          
        const { data: opponentCardData } = await supabase
          .from('battle_cards')
          .select('*')
          .eq('battle_id', battleId)
          .eq('player_id', opponentId)
          .single();
          
        if (opponentCardData) {
          // We don't show the opponent's card yet, just that they've selected one
          setOpponentCard({ id: 'selected' } as any);
        }
      } else if (battleData.status === 'active') {
        setIsBattlePhase(true);
        
        // Fetch both player's cards
        const { data: battleCards } = await supabase
          .from('battle_cards')
          .select('*')
          .eq('battle_id', battleId);
          
        if (battleCards && battleCards.length === 2) {
          // Get player's card
          const playerCardData = battleCards.find(c => c.player_id === session.user.id);
          if (playerCardData) {
            const { data: playerCard } = await supabase
              .from('player_cards')
              .select('*')
              .eq('id', playerCardData.card_id)
              .single();
              
            setSelectedCard(playerCard || null);
            setIsStaking(playerCardData.is_staking);
          }
          
          // Get opponent's card
          const opponentId = session.user.id === battleData.player1_id 
            ? battleData.player2_id 
            : battleData.player1_id;
            
          const opponentCardData = battleCards.find(c => c.player_id === opponentId);
          if (opponentCardData) {
            const { data: opponentCard } = await supabase
              .from('player_cards')
              .select('*')
              .eq('id', opponentCardData.card_id)
              .single();
              
            setOpponentCard(opponentCard || null);
          }
        }
      } else if (battleData.status === 'completed') {
        // Show battle results
        setIsBattlePhase(true);
        
        // Fetch both player's cards
        const { data: battleCards } = await supabase
          .from('battle_cards')
          .select('*')
          .eq('battle_id', battleId);
          
        if (battleCards && battleCards.length === 2) {
          // Get player's card
          const playerCardData = battleCards.find(c => c.player_id === session.user.id);
          if (playerCardData) {
            const { data: playerCard } = await supabase
              .from('player_cards')
              .select('*')
              .eq('id', playerCardData.card_id)
              .single();
              
            setSelectedCard(playerCard || null);
            setIsStaking(playerCardData.is_staking);
          }
          
          // Get opponent's card
          const opponentId = session.user.id === battleData.player1_id 
            ? battleData.player2_id 
            : battleData.player1_id;
            
          const opponentCardData = battleCards.find(c => c.player_id === opponentId);
          if (opponentCardData) {
            const { data: opponentCard } = await supabase
              .from('player_cards')
              .select('*')
              .eq('id', opponentCardData.card_id)
              .single();
              
            setOpponentCard(opponentCard || null);
          }
        }
        
        // Set battle result
        const isPlayer1 = session.user.id === battleData.player1_id;
        const didWin = battleData.winner_id === session.user.id;
        const isDraw = battleData.winner_id === null;
        
        setBattleResult({
          winner: didWin ? (isPlayer1 ? 'player1' : 'player2') : 
                  isDraw ? 'draw' : 
                  (isPlayer1 ? 'player2' : 'player1'),
          message: didWin ? 'You won the battle!' : 
                   isDraw ? 'The battle ended in a draw.' : 
                   'You lost the battle.'
        });
      }
      
      setIsLoading(false);
    };
    
    fetchBattleAndUser();
  }, [battleId, router]);
  
  // Subscribe to battle updates
  useEffect(() => {
    if (!battleId) return;
    
    const channel = supabase.channel(`battle-${battleId}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'battle_instances', filter: `id=eq.${battleId}` }, 
          async (payload) => {
            // Update battle state
            const newBattle = payload.new as BattleInstance;
            setBattle(newBattle);
            
            // Handle state transitions
            if (newBattle.status === 'active' && !isBattlePhase) {
              setIsCardSelectionPhase(false);
              setIsBattlePhase(true);
              
              // Fetch opponent's card
              const opponentId = user.id === newBattle.player1_id 
                ? newBattle.player2_id 
                : newBattle.player1_id;
                
              const { data: opponentCardData } = await supabase
                .from('battle_cards')
                .select('*')
                .eq('battle_id', battleId)
                .eq('player_id', opponentId)
                .single();
                
              if (opponentCardData) {
                const { data: opponentCard } = await supabase
                  .from('player_cards')
                  .select('*')
                  .eq('id', opponentCardData.card_id)
                  .single();
                  
                setOpponentCard(opponentCard || null);
              }
            } else if (newBattle.status === 'completed' && newBattle.winner_id) {
              // Set battle result
              const isPlayer1 = user.id === newBattle.player1_id;
              const didWin = newBattle.winner_id === user.id;
              const isDraw = newBattle.winner_id === null;
              
              setBattleResult({
                winner: didWin ? (isPlayer1 ? 'player1' : 'player2') : 
                        isDraw ? 'draw' : 
                        (isPlayer1 ? 'player2' : 'player1'),
                message: didWin ? 'You won the battle!' : 
                         isDraw ? 'The battle ended in a draw.' : 
                         'You lost the battle.'
              });
            }
          }
      )
      .subscribe();
      
    // Also subscribe to battle_cards changes
    const cardsChannel = supabase.channel(`battle-cards-${battleId}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'battle_cards', filter: `battle_id=eq.${battleId}` }, 
          async (payload) => {
            if (!battle) return;
            
            // If opponent selected a card
            const opponentId = user?.id === battle.player1_id 
              ? battle.player2_id 
              : battle.player1_id;
              
            if (payload.new.player_id === opponentId) {
              // In selection phase, just show that opponent has selected
              if (battle.status === 'selecting') {
                setOpponentCard({ id: 'selected' } as any);
              }
              
              // Check if both players have selected cards
              const { count } = await supabase
                .from('battle_cards')
                .select('*', { count: 'exact', head: true })
                .eq('battle_id', battleId);
                
              console.log('Card count check:', { count, battleStatus: battle.status });
                
              if (count === 2 && battle.status === 'selecting') {
                console.log('Starting battle - both cards selected');
                // Both players have selected cards, start the battle
                const { error } = await supabase
                  .from('battle_instances')
                  .update({ status: 'active' })
                  .eq('id', battleId);
                  
                if (error) {
                  console.error('Error updating battle status:', error);
                } else {
                  console.log('Battle status updated to active');
                }
              }
            }
          }
      )
      .subscribe();
      
    return () => {
      channel.unsubscribe();
      cardsChannel.unsubscribe();
    };
  }, [battleId, battle, user, isBattlePhase]);
  
  // Handle card selection
  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
  };
  
  // Submit card selection
  const handleSubmitCard = async () => {
    if (!selectedCard || !battle || !user) return;
    
    setIsSubmittingCard(true);
    
    try {
      // First check if this player already submitted a card for this battle
      const { data: existingCard } = await supabase
        .from('battle_cards')
        .select('*')
        .eq('battle_id', battleId)
        .eq('player_id', user.id)
        .maybeSingle();
      
      let error;
      
      if (existingCard) {
        // Update existing card selection
        const { error: updateError } = await supabase
          .from('battle_cards')
          .update({
            card_id: selectedCard.id,
            is_staked: isStaking
          })
          .eq('battle_id', battleId)
          .eq('player_id', user.id);
          
        error = updateError;
      } else {
        // Insert new card selection
        const { error: insertError } = await supabase
          .from('battle_cards')
          .insert({
            battle_id: battleId,
            player_id: user.id,
            card_id: selectedCard.id,
            is_staked: isStaking
          });
          
        error = insertError;
      }
        
      if (error) {
        console.error('Error submitting card:', error);
        toast.error(`Failed to submit your card: ${error.message}`);
        setIsSubmittingCard(false);
        return;
      }
      
      toast.success('Card selection submitted!');
      
      // Check if opponent has already selected
      const { count } = await supabase
        .from('battle_cards')
        .select('*', { count: 'exact', head: true })
        .eq('battle_id', battleId);
        
      if (count === 2 && battle.status === 'selecting') {
        // Both players have selected, start the battle
        await supabase
          .from('battle_instances')
          .update({ status: 'active' })
          .eq('id', battleId);
      }
    } catch (err) {
      console.error('Error in card submission:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmittingCard(false);
    }
  };
  
  // Handle battle completion
  const handleBattleComplete = async (result: {
    winner: 'player1' | 'player2' | 'draw' | null;
    message: string;
  }) => {
    if (!battle || !user) return;
    
    setBattleResult(result);
    
    // Determine winner ID
    let winnerId: string | null = null;
    if (result.winner === 'player1') {
      winnerId = battle.player1_id;
    } else if (result.winner === 'player2') {
      winnerId = battle.player2_id;
    }
    
    // Update battle status
    await supabase
      .from('battle_instances')
      .update({ 
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString()
      })
      .eq('id', battleId);
      
    // If there's a winner and cards are staked, transfer the card
    if (winnerId && isStaking) {
      const loserId = winnerId === battle.player1_id ? battle.player2_id : battle.player1_id;
      const loserCardData = await supabase
        .from('battle_cards')
        .select('*')
        .eq('battle_id', battleId)
        .eq('player_id', loserId)
        .single();
        
      if (loserCardData?.data && loserCardData.data.is_staked) {
        // Call the atomic transfer function
        const { error } = await supabase.rpc('transfer_card_atomic', {
          battle_id: battleId,
          winner_id: winnerId,
          loser_id: loserId,
          card_id: loserCardData.data.card_id
        });
        
        if (error) {
          console.error('Error transferring card:', error);
          toast.error('Failed to transfer card ownership');
        } else {
          toast.success(winnerId === user.id ? 
            'You won the battle and claimed your opponent\'s card!' : 
            'You lost the battle and your opponent claimed your card.');
        }
      }
    }
    
    // Update player status back to online
    await onlinePlayersService.updateStatus(user.id, 'online');
  };
  
  // Return to lobby
  const handleReturnToLobby = () => {
    router.push('/game/arena/lobby');
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-4">Loading battle...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Battle Arena</h1>
        <Button variant="outline" onClick={handleReturnToLobby}>
          Return to Lobby
        </Button>
      </div>
      
      {/* Battle Header */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              {player1Profile?.avatar_url ? (
                <img 
                  src={player1Profile.avatar_url} 
                  alt={player1Profile.username} 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span>{player1Profile?.username.charAt(0)}</span>
              )}
            </div>
            <span className="font-medium">{player1Profile?.username}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-medium px-3 py-1 rounded bg-purple-900">
              {battle?.status === 'pending' && 'Waiting'}
              {battle?.status === 'selecting' && 'Card Selection'}
              {battle?.status === 'active' && 'Battle in Progress'}
              {battle?.status === 'completed' && 'Battle Complete'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="font-medium">{player2Profile?.username}</span>
            <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
              {player2Profile?.avatar_url ? (
                <img 
                  src={player2Profile.avatar_url} 
                  alt={player2Profile.username} 
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <span>{player2Profile?.username.charAt(0)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Selection Phase */}
      {isCardSelectionPhase && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardUI>
            <CardHeader>
              <CardTitle>Your Card Selection</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCard ? (
                <div className="flex flex-col items-center">
                  <CardDisplay card={selectedCard} isRevealed={true} className="w-48 mx-auto" />
                  <div className="mt-4 flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <input 
                        type="checkbox" 
                        id="stake-card" 
                        checked={isStaking}
                        onChange={() => setIsStaking(!isStaking)}
                        disabled={!!opponentCard}
                      />
                      <label htmlFor="stake-card" className={isStaking ? "text-red-400" : "text-green-400"}>
                        {isStaking ? "Card at stake (can be lost)" : "Practice mode (no card at stake)"}
                      </label>
                    </div>
                    
                    {!opponentCard && (
                      <Button 
                        onClick={() => setSelectedCard(null)}
                        variant="outline"
                      >
                        Change Selection
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <CardSelection 
                  cards={playerCards} 
                  onSelectCard={handleSelectCard} 
                  selectedCard={null}
                />
              )}
              
              {selectedCard && !opponentCard && (
                <div className="mt-6">
                  <Button 
                    onClick={handleSubmitCard}
                    disabled={isSubmittingCard}
                    className="w-full"
                  >
                    {isSubmittingCard ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Confirm Selection'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </CardUI>
          
          <CardUI>
            <CardHeader>
              <CardTitle>Opponent's Card</CardTitle>
            </CardHeader>
            <CardContent>
              {opponentCard ? (
                <div className="flex flex-col items-center">
                  {opponentCard.id === 'selected' ? (
                    <div className="w-48 h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                      <p className="text-center text-gray-400">Card selected</p>
                      <p className="text-center text-gray-400">Waiting for battle to begin...</p>
                    </div>
                  ) : (
                    <CardDisplay card={opponentCard} isRevealed={true} className="w-48 mx-auto" />
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-center text-gray-400">Waiting for opponent to select a card...</p>
                </div>
              )}
            </CardContent>
          </CardUI>
        </div>
      )}
      
      {/* Battle Phase */}
      {isBattlePhase && selectedCard && opponentCard && opponentCard.id !== 'selected' && (
        <>
          <BattleArena 
            player1Card={selectedCard} 
            player2Card={opponentCard}
            onBattleComplete={handleBattleComplete}
          />
          
          {battleResult && (
            <BattleResults 
              result={battleResult} 
              player1Card={selectedCard}
              player2Card={opponentCard}
              onPlayAgain={handleReturnToLobby}
            />
          )}
        </>
      )}
    </div>
  );
}
