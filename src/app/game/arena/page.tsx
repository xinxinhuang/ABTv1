'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/types/game';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { CardSelection } from '@/components/game/battle/CardSelection';
import { BattleArena } from '@/components/game/battle/BattleArena';
import { BattleResults } from '@/components/game/battle/BattleResults';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Swords, Users, Trophy, Shield } from 'lucide-react';

export default function ArenaPage() {
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [player1Selection, setPlayer1Selection] = useState<Card | null>(null);
  const [player2Selection, setPlayer2Selection] = useState<Card | null>(null);
  const [battleStarted, setBattleStarted] = useState(false);
  const [battleResult, setBattleResult] = useState<{
    winner: 'player1' | 'player2' | 'draw' | null;
    message: string;
  } | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchPlayerCards = async () => {
      setIsLoading(true);
      
      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to access the arena');
        redirect('/login');
        return;
      }
      
      setUser(session.user);
      
      // Fetch humanoid cards only
      const { data, error } = await supabase
        .from('player_cards')
        .select('*')
        .eq('player_id', session.user.id)
        .eq('card_type', 'humanoid')
        .order('obtained_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching cards:', error);
        toast.error('Failed to load your cards');
        setIsLoading(false);
        return;
      }
      
      setPlayerCards(data || []);
      setIsLoading(false);
    };
    
    fetchPlayerCards();
  }, []);
  
  const handlePlayer1Select = (card: Card) => {
    setPlayer1Selection(card);
  };
  
  const handlePlayer2Select = (card: Card) => {
    setPlayer2Selection(card);
  };
  
  const startBattle = () => {
    if (!player1Selection || !player2Selection) {
      toast.error('Both players must select a card');
      return;
    }
    
    setBattleStarted(true);
    
    // Battle logic is in the BattleArena component
  };
  
  const resetBattle = () => {
    setBattleStarted(false);
    setBattleResult(null);
    setPlayer1Selection(null);
    setPlayer2Selection(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Battle Arena</h1>
        <HamburgerMenu />
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">Loading your cards...</div>
      ) : (
        <>
          {battleStarted ? (
            <>
              <BattleArena 
                player1Card={player1Selection} 
                player2Card={player2Selection}
                onBattleComplete={setBattleResult}
              />
              
              {battleResult && (
                <BattleResults 
                  result={battleResult} 
                  player1Card={player1Selection}
                  player2Card={player2Selection}
                  onPlayAgain={resetBattle}
                />
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Link href="/game/arena/lobby" className="block">
                  <CardUI className="h-full hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" /> Online Battle
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-400 mb-4">Challenge other players to battle with your cards. Winners take losers' cards!</p>
                      <div className="flex items-center gap-2 text-sm text-purple-400">
                        <Swords className="h-4 w-4" /> 
                        <span>Battle online players</span>
                      </div>
                    </CardContent>
                  </CardUI>
                </Link>
                
                <CardUI className="h-full hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" /> Practice Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 mb-4">Practice battles with your own cards. No cards are at stake in this mode.</p>
                    <Button 
                      onClick={() => {
                        // Show the local battle UI
                        document.getElementById('practice-mode')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full"
                    >
                      Start Practice
                    </Button>
                  </CardContent>
                </CardUI>
              </div>
              
              <div id="practice-mode" className="pt-4">
                <h2 className="text-2xl font-bold mb-6">Practice Mode</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CardUI>
                    <CardHeader>
                      <CardTitle>Player 1</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardSelection 
                        cards={playerCards} 
                        onSelectCard={handlePlayer1Select} 
                        selectedCard={player1Selection}
                      />
                    </CardContent>
                  </CardUI>
                  
                  <CardUI>
                    <CardHeader>
                      <CardTitle>Player 2</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardSelection 
                        cards={playerCards} 
                        onSelectCard={handlePlayer2Select} 
                        selectedCard={player2Selection}
                      />
                    </CardContent>
                  </CardUI>
                  
                  <div className="md:col-span-2 flex justify-center mt-6">
                    <Button 
                      onClick={startBattle}
                      disabled={!player1Selection || !player2Selection}
                      size="lg"
                    >
                      Start Practice Battle
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
