'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { ChallengeButton } from './ChallengeButton';
import { RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface OnlinePlayer {
  id: string;
  username: string;
}

export function OnlinePlayersList() {
  const supabase = createClient();
  const { user } = useUser();
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const handleManualRefresh = useCallback(() => {
    // For presence system, we can trigger a manual sync
    if (isConnected) {
      setLastRefresh(new Date().toLocaleTimeString());
      // The presence system will automatically sync
    }
  }, [isConnected]);

  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    
    const setupPresence = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's profile data for presence
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Could not load your profile.');
          setLoading(false);
          return;
        }

        // Set up Supabase Realtime presence channel
        channel = supabase.channel('online-players-lobby', {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            console.log('Presence sync event');
            const presenceState = channel.presenceState();
            const players = Object.keys(presenceState)
              .map(presenceId => {
                const presence = presenceState[presenceId][0];
                return {
                  id: presenceId,
                  username: presence?.username || 'Unknown',
                };
              })
              .filter(p => p.id !== user.id);
            
            console.log('Online players from presence:', players);
            setOnlinePlayers(players);
            setLastRefresh(new Date().toLocaleTimeString());
            setLoading(false);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
            console.log('User joined:', key, newPresences);
            setLastRefresh(new Date().toLocaleTimeString());
            // The sync event will handle updating the list
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string, leftPresences: any[] }) => {
            console.log('User left:', key, leftPresences);
            setLastRefresh(new Date().toLocaleTimeString());
            // The sync event will handle updating the list
          })
          .subscribe(async (status: string) => {
            console.log('Presence subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              
              // Track this user's presence
              await channel.track({ 
                username: profileData.username || 'Anonymous',
                last_seen: new Date().toISOString(),
                status: 'online'
              });
              
              console.log('User presence tracked:', {
                username: profileData.username,
                user_id: user.id
              });
            } else if (status === 'CHANNEL_ERROR') {
              setError('Connection error. Please refresh the page.');
              setIsConnected(false);
              setLoading(false);
            }
          });

      } catch (err) {
        console.error('Error setting up presence:', err);
        setError('Failed to connect to lobby.');
        setLoading(false);
      }
    };

    setupPresence();

    // Cleanup function
    return () => {
      if (channel) {
        console.log('Unsubscribing from presence channel');
        channel.unsubscribe();
      }
    };
  }, [user, supabase]);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Online Players
          </h2>
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
          <Button 
            onClick={() => window.location.reload()}
            className="mt-2 w-full"
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Online Players
          </h2>
          <Button disabled variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </Button>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Connecting to lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Online Players ({onlinePlayers.length})
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              {lastRefresh}
            </span>
          )}
          <Button 
            onClick={handleManualRefresh}
            disabled={!isConnected}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {onlinePlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No other players are currently online.</p>
          <p className="text-sm mt-1">Invite a friend to play!</p>
          {!isConnected && (
            <p className="text-sm mt-2 text-red-500">
              Connection issues - try refreshing the page
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-700">
          {onlinePlayers.map((player) => (
            <li key={player.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-lg">{player.username}</span>
              </div>
              <ChallengeButton challengedPlayerId={player.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
