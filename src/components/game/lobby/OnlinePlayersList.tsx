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
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchOnlinePlayers = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      
      // Get all profiles except the current user
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .neq('id', user.id)
        .order('username');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setError('Could not load players.');
        return;
      }

      // For now, show all registered players as "online"
      // In a real implementation, you might want to track actual online status
      const players = profiles.map(profile => ({
        id: profile.id,
        username: profile.username || 'Anonymous'
      }));

      setOnlinePlayers(players);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching online players:', err);
      setError('Failed to load players.');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  const handleManualRefresh = useCallback(() => {
    setLoading(true);
    fetchOnlinePlayers();
  }, [fetchOnlinePlayers]);

  useEffect(() => {
    fetchOnlinePlayers();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchOnlinePlayers, 30000);
    
    return () => clearInterval(interval);
  }, [fetchOnlinePlayers]);

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
          <p>No other players found.</p>
          <p className="text-sm mt-1">Invite a friend to join the game!</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-700">
          {onlinePlayers.map((player) => (
            <li key={player.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
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
