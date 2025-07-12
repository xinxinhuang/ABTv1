'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { ChallengeButton } from './ChallengeButton';

interface OnlinePlayer {
  id: string;
  username: string;
}

export function OnlinePlayersList() {
  const supabase = createClient();
  const { user } = useUser();
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchOnlinePlayers = async () => {
      // 1. Get the list of online user IDs
      const { data: onlineUsers, error: onlineError } = await supabase
        .from('online_players')
        .select('id')
        .neq('id', user.id);

      if (onlineError) {
        console.error('Error fetching online players:', onlineError);
        setError('Could not fetch online players.');
        return;
      }

      const onlinePlayerIds = onlineUsers.map(u => u.id);

      if (onlinePlayerIds.length === 0) {
        setOnlinePlayers([]);
        return;
      }

      // 2. Get the profiles for those user IDs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', onlinePlayerIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setError('Could not fetch profiles.');
        return;
      }

      setOnlinePlayers(profiles as OnlinePlayer[]);
    };

    fetchOnlinePlayers();

    // Set up Supabase Realtime subscription
    const channel = supabase.channel('lobby', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

          channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState<any>();
          const players = Object.keys(presenceState)
            .map(presenceId => ({
              id: presenceId,
              username: presenceState[presenceId][0]?.username || 'Unknown',
            }))
            .filter(p => p.id !== user.id);
          setOnlinePlayers(players);
        })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: profileData } = await supabase.from('profiles').select('username').eq('id', user.id).single();
          await channel.track({ username: profileData?.username || 'Anonymous' });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user, supabase]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (onlinePlayers.length === 0) {
    return <p>No other players are currently online. Invite a friend!</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Online Players</h2>
      <ul className="divide-y divide-gray-700">
        {onlinePlayers.map((player) => (
          <li key={player.id} className="flex items-center justify-between py-3">
            <span className="text-lg">{player.username}</span>
            <ChallengeButton challengedPlayerId={player.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
