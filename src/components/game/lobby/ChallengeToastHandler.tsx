'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

import { useUser } from '@/hooks/useUser';

interface ChallengePayload {
  lobby_id: string; // Maintained for backward compatibility
  challenger_username: string;
}

export function ChallengeToastHandler() {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleAccept = useCallback(async (battleId: string) => {
    const { error } = await supabase.functions.invoke('accept-challenge', {
      body: { lobby_id: battleId }, // Keep lobby_id for backend compatibility
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
        description: 'Entering battle arena...',
      });
      
      // Navigate to the battle page using the new route
      router.push(`/game/arena/battle-v2/${battleId}`);
    }
  }, [supabase, toast, router]);

  const handleDecline = useCallback(async (battleId: string) => {
    await supabase.functions.invoke('decline-challenge', {
      body: { lobby_id: battleId }, // Keep lobby_id for backend compatibility
    });
  }, [supabase]);

  useEffect(() => {
    if (!user) return;

    console.log(`🔔 ChallengeToastHandler: Setting up subscription for user ${user.id}`);
    const channel = supabase.channel(`invites:${user.id}`);

    channel
      .on('broadcast', { event: 'challenge' }, ({ payload }: { payload: ChallengePayload }) => {
        console.log('🎯 Incoming challenge notification received:', payload);
        const { lobby_id, challenger_username } = payload;

        console.log('📨 Showing challenge toast for:', { lobby_id, challenger_username });
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
      .subscribe((status) => {
        console.log(`🔌 ChallengeToastHandler subscription status: ${status} for channel invites:${user.id}`);
      });

    return () => {
      console.log(`🔌 ChallengeToastHandler: Unsubscribing from channel invites:${user.id}`);
      channel.unsubscribe();
    };
  }, [user, supabase, toast, handleAccept, handleDecline, router]);

  return null; // This component does not render anything visible
}
