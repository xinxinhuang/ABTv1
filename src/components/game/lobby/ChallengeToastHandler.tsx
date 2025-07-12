'use client';

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '../../../hooks/useUser';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';

interface ChallengePayload {
  lobby_id: string;
  challenger_username: string;
}

export function ChallengeToastHandler() {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();

  const handleAccept = useCallback(async (lobbyId: string) => {
    const { error } = await supabase.functions.invoke('accept-challenge', {
      body: { lobby_id: lobbyId },
    });

    if (error) {
      toast({
        title: 'Error Accepting Challenge',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Challenge Accepted!',
        description: 'Entering the pre-battle room...',
      });
    }
  }, [supabase, toast]);

  const handleDecline = useCallback(async (lobbyId: string) => {
    await supabase.functions.invoke('decline-challenge', {
      body: { lobby_id: lobbyId },
    });
  }, [supabase]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`invites:${user.id}`);

    channel
      .on('broadcast', { event: 'challenge' }, ({ payload }: { payload: ChallengePayload }) => {
        console.log('Incoming challenge:', payload);
        const { lobby_id, challenger_username } = payload;

        toast({
          title: 'New Battle Challenge!',
          description: `${challenger_username} has challenged you to a battle.`,
          duration: 30000, // 30 seconds to respond
          action: (
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => handleAccept(lobby_id)}>Accept</Button>
              <Button size="sm" variant="outline" onClick={() => handleDecline(lobby_id)}>Decline</Button>
            </div>
          ),
        });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, supabase, toast, handleAccept, handleDecline]);

  return null; // This component does not render anything visible
}
