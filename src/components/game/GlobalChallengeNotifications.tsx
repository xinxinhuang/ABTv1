'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/hooks/useUser';

interface ChallengePayload {
  lobby_id: string;
  challenger_username: string;
}

export function GlobalChallengeNotifications() {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const handleAccept = useCallback(async (battleId: string) => {
    console.log('🎯 [GLOBAL] Accepting challenge:', battleId);
    
    const { error } = await supabase.functions.invoke('accept-challenge', {
      body: { lobby_id: battleId },
    });

    if (error) {
      console.error('❌ [GLOBAL] Error accepting challenge:', error);
      toast({
        title: 'Error Accepting Challenge',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      console.log('✅ [GLOBAL] Challenge accepted successfully');
      toast({
        title: 'Challenge Accepted!',
        description: 'Entering battle arena...',
      });
      
      // Navigate to the battle page
      const battleUrl = `/game/arena/battle-v2/${battleId}`;
      console.log('🚀 [GLOBAL] Navigating to:', battleUrl);
      router.push(battleUrl);
    }
  }, [supabase, toast, router]);

  const handleDecline = useCallback(async (battleId: string) => {
    console.log('❌ [GLOBAL] Declining challenge:', battleId);
    
    const { error } = await supabase.functions.invoke('decline-challenge', {
      body: { lobby_id: battleId },
    });

    if (error) {
      console.error('❌ [GLOBAL] Error declining challenge:', error);
    } else {
      console.log('✅ [GLOBAL] Challenge declined successfully');
      toast({
        title: 'Challenge Declined',
        description: 'You declined the battle challenge.',
      });
    }
  }, [supabase, toast]);

  useEffect(() => {
    if (!user) {
      console.log('🔔 [GLOBAL] GlobalChallengeNotifications: No user, skipping subscription');
      return;
    }

    console.log(`🔔 [GLOBAL] GlobalChallengeNotifications: Setting up global subscription for user ${user.id}`);
    const channel = supabase.channel(`invites:${user.id}`);

    channel
      .on('broadcast', { event: 'challenge' }, ({ payload }: { payload: ChallengePayload }) => {
        console.log('🎯 [GLOBAL] Incoming challenge notification received:', payload);
        const { lobby_id, challenger_username } = payload;

        console.log('📨 [GLOBAL] Showing challenge toast for:', { lobby_id, challenger_username });
        
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
      .subscribe((status, error) => {
        console.log(`🔌 [GLOBAL] Challenge subscription status: ${status} for channel invites:${user.id}`);
        if (error) console.error('🔌 [GLOBAL] Subscription error:', error);
      });

    return () => {
      console.log(`🔌 [GLOBAL] Unsubscribing from challenge notifications for user ${user.id}`);
      channel.unsubscribe();
    };
  }, [user, supabase, toast, handleAccept, handleDecline, router]);

  return null; // This component renders nothing visible
} 