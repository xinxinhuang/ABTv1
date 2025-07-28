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
        console.log('🎯 [GLOBAL] Current user ID:', user.id);
        console.log('🎯 [GLOBAL] Toast function available:', typeof toast);
        
        const { lobby_id, challenger_username } = payload;

        console.log('📨 [GLOBAL] Showing challenge toast for:', { lobby_id, challenger_username });
        
        try {
          // Show a simple notification first to test
          const challengeToast = toast({
            title: `🎯 Challenge from ${challenger_username}!`,
            description: `Click to accept the battle challenge. Battle ID: ${lobby_id}`,
            duration: 30000, // 30 seconds to respond
          });
          
          console.log('✅ [GLOBAL] Challenge toast created:', challengeToast);

          // Also show buttons in a separate toast
          const actionToast = toast({
            title: 'Battle Actions',
            description: 'Choose your response:',
            duration: 30000,
            action: (
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => {
                  console.log('🎯 [GLOBAL] Accept button clicked for:', lobby_id);
                  handleAccept(lobby_id);
                }}>
                  ✅ Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  console.log('🎯 [GLOBAL] Decline button clicked for:', lobby_id);
                  handleDecline(lobby_id);
                }}>
                  ❌ Decline
                </Button>
              </div>
            ),
          });
          
          console.log('✅ [GLOBAL] Action toast created:', actionToast);
        } catch (error) {
          console.error('❌ [GLOBAL] Error creating toast:', error);
        }
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