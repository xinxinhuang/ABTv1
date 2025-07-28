'use client';

import { RefreshCw, Users } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { onlinePlayersService, OnlinePlayer } from '@/lib/services/onlinePlayersService';
import { useUser } from '@/hooks/useUser';

import { ChallengeButton } from './ChallengeButton';

export function OnlinePlayersList() {
  const supabase = createClient();
  const { user } = useUser();
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchOnlinePlayers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const players = await onlinePlayersService.getOnlinePlayers();
      
      // Filter out current user
      const otherPlayers = players.filter(player => player.id !== user.id);
      
      setOnlinePlayers(otherPlayers);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching online players:', err);
      setError('Failed to load online players. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleManualRefresh = useCallback(() => {
    setLoading(true);
    fetchOnlinePlayers();
  }, [fetchOnlinePlayers]);

  // Register current user as online and set up subscriptions
  useEffect(() => {
    if (!user) return;

    // Register current user as online
    const registerUser = async () => {
      try {
        // Get username from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        const username = profile?.username || 'Anonymous';
        await onlinePlayersService.registerOnline(user, username);
      } catch (err) {
        console.error('Failed to register online status:', err);
      }
    };

    registerUser();

    // Set up real-time subscription for online players
    const unsubscribe = onlinePlayersService.subscribeToOnlinePlayers((players) => {
      const otherPlayers = players.filter(player => player.id !== user.id);
      setOnlinePlayers(otherPlayers);
      setLastRefresh(new Date().toLocaleTimeString());
    });

    // Clean up when component unmounts or user changes
    return () => {
      unsubscribe();
      onlinePlayersService.unregisterOnline(user.id);
    };
  }, [user, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchOnlinePlayers();
  }, [fetchOnlinePlayers]);

  // Handle page visibility to manage online status
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onlinePlayersService.updateStatus(user.id, 'away');
      } else {
        onlinePlayersService.updateStatus(user.id, 'online');
      }
    };

    const handleBeforeUnload = () => {
      onlinePlayersService.unregisterOnline(user.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

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
            Available Players
          </h2>
          <Button disabled variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </Button>
        </div>
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Available Players ({onlinePlayers.length})
        </h2>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Updated: {lastRefresh}
            </span>
          )}
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {onlinePlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No other players online.</p>
          <p className="text-sm mt-1">Invite a friend to join the game!</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-700">
          {onlinePlayers.map((player) => (
            <li key={player.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  player.status === 'online' ? 'bg-green-500' :
                  player.status === 'in_battle' ? 'bg-orange-500' :
                  'bg-gray-500'
                }`} />
                <span className="text-lg">{player.username}</span>
                <span className="text-xs text-gray-500 capitalize">({player.status})</span>
              </div>
              <ChallengeButton 
                challengedPlayerId={player.id} 
                disabled={player.status === 'in_battle'}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
