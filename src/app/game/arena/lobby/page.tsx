'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { onlinePlayersService, OnlinePlayer } from '@/lib/services/onlinePlayersService';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ArenaLobbyPage() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string>('');
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [challengeState, setChallengeState] = useState<{
    challenging: string | null;
    pendingChallenges: string[];
  }>({
    challenging: null,
    pendingChallenges: [],
  });
  
  const router = useRouter();

  // Fetch current user and set up online status
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      // Get user profile to get username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
        
      if (profile?.username) {
        setUsername(profile.username);
        // Register as online
        await onlinePlayersService.registerOnline(session.user, profile.username);
      }
      
      setIsLoading(false);
    };
    
    fetchUser();
    
    // Clean up function to unregister when leaving the page
    return () => {
      if (user?.id) {
        onlinePlayersService.unregisterOnline(user.id);
      }
    };
  }, [router]);
  
  // Subscribe to online players
  useEffect(() => {
    const fetchInitialPlayers = async () => {
      const players = await onlinePlayersService.getOnlinePlayers();
      setOnlinePlayers(players);
    };
    
    fetchInitialPlayers();
    
    // Subscribe to changes
    const unsubscribe = onlinePlayersService.subscribeToOnlinePlayers((players) => {
      setOnlinePlayers(players);
    });
    
    return unsubscribe;
  }, []);
  
  // Subscribe to battle challenges and battle acceptances
  useEffect(() => {
    if (!user?.id) return;
    
    const channel = supabase.channel(`battle-challenges-${user.id}`)
      .on('broadcast', { event: 'challenge' }, (payload) => {
        if (payload.payload.targetId === user.id) {
          setChallengeState(prev => ({
            ...prev,
            pendingChallenges: [...prev.pendingChallenges, payload.payload.challengerId]
          }));
        }
      })
      .on('broadcast', { event: 'challenge-accepted' }, (payload) => {
        if (payload.payload.challengerId === user.id) {
          // The challenger is notified that their challenge was accepted
          console.log('Challenge accepted, navigating to battle', payload.payload.battleId);
          router.push(`/game/arena/battle/${payload.payload.battleId}`);
        }
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, router]);
  
  const sendChallenge = async (targetId: string) => {
    setChallengeState(prev => ({ ...prev, challenging: targetId }));
    
    // Send challenge via broadcast channel
    await supabase.channel(`battle-challenges-${targetId}`)
      .send({
        type: 'broadcast',
        event: 'challenge',
        payload: {
          challengerId: user.id,
          targetId,
          challengerName: username
        }
      });
      
    // In a real implementation, we would also store this in the database
  };
  
  const acceptChallenge = async (challengerId: string) => {
    // Create a new battle instance
    const { data: battle, error } = await supabase
      .from('battle_instances')
      .insert({
        player1_id: challengerId,
        player2_id: user.id,
        status: 'pending'
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating battle:', error);
      return;
    }
    
    // Update both players' status to in_battle
    await onlinePlayersService.updateStatus(user.id, 'in_battle');
    await onlinePlayersService.updateStatus(challengerId, 'in_battle');
    
    // Notify the challenger that their challenge was accepted
    await supabase.channel(`battle-challenges-${challengerId}`)
      .send({
        type: 'broadcast',
        event: 'challenge-accepted',
        payload: {
          challengerId: challengerId,
          accepterId: user.id,
          battleId: battle.id
        }
      });
    
    // Remove from pending challenges
    setChallengeState(prev => ({
      ...prev,
      pendingChallenges: prev.pendingChallenges.filter(id => id !== challengerId)
    }));
    
    // Navigate to battle page
    router.push(`/game/arena/battle/${battle.id}`);
  };
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading arena lobby...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Battle Arena Lobby</h1>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Status</h2>
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <p>Online as: {username}</p>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Online Players</h2>
        
        {onlinePlayers.length === 0 ? (
          <p className="text-gray-400">No other players online right now.</p>
        ) : (
          <ul className="space-y-4">
            {onlinePlayers
              .filter(player => player.id !== user?.id)
              .map(player => (
                <li key={player.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${
                      player.status === 'online' ? 'bg-green-500' : 
                      player.status === 'in_battle' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <span>{player.username}</span>
                    <span className="text-sm text-gray-400">
                      {player.status === 'online' ? 'Available' : 
                       player.status === 'in_battle' ? 'In Battle' : 'Away'}
                    </span>
                  </div>
                  
                  <div>
                    {player.status === 'online' && (
                      <Button 
                        onClick={() => sendChallenge(player.id)}
                        disabled={challengeState.challenging === player.id}
                      >
                        {challengeState.challenging === player.id ? 'Challenge Sent' : 'Challenge'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
      
      {challengeState.pendingChallenges.length > 0 && (
        <div className="mt-6 bg-purple-900 rounded-lg p-6 animate-pulse">
          <h2 className="text-xl font-semibold mb-4">Incoming Challenges</h2>
          <ul className="space-y-4">
            {challengeState.pendingChallenges.map(challengerId => {
              const challenger = onlinePlayers.find(p => p.id === challengerId);
              return (
                <li key={challengerId} className="flex items-center justify-between p-3 bg-purple-800 rounded-md">
                  <span>{challenger?.username || 'Unknown Player'} wants to battle!</span>
                  <div className="space-x-2">
                    <Button onClick={() => acceptChallenge(challengerId)}>
                      Accept
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setChallengeState(prev => ({
                          ...prev,
                          pendingChallenges: prev.pendingChallenges.filter(id => id !== challengerId)
                        }));
                      }}
                    >
                      Decline
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      <div className="mt-6">
        <Link href="/game/arena">
          <Button variant="outline">Back to Arena</Button>
        </Link>
      </div>
    </div>
  );
}
