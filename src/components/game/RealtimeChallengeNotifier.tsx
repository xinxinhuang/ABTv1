'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

export default function RealtimeChallengeNotifier() {
  const { user } = useUser();
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleResponse = async (lobbyId: string, response: 'accepted' | 'declined') => {
    if (!user) {
      toast.error('You must be logged in to respond to a challenge.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to respond to a challenge.');
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/respond-to-challenge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            lobby_id: lobbyId,
            response: response,
            user_id: user.id, // Pass the user's ID
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to respond to challenge.');
      }

      if (response === 'accepted') {
        toast.success('Challenge accepted! Redirecting to battle...');
        router.push(`/battle/${lobbyId}`);
      } else {
        toast.info('Challenge declined.');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`users:${user.id}`);

    channel
      .on('broadcast', { event: 'new_challenge' }, ({ payload }) => {
        console.log('New challenge received:', payload);
        toast.info(`You have been challenged by ${payload.challengerName}!`, {
          description: 'Do you accept this challenge?',
          duration: 60000, // 1 minute
          action: {
            label: 'Accept',
            onClick: () => handleResponse(payload.lobbyId, 'accepted'),
          },
          cancel: {
            label: 'Decline',
            onClick: () => handleResponse(payload.lobbyId, 'declined'),
          },
        });
      })
      .on('broadcast', { event: 'challenge_accepted' }, ({ payload }) => {
        console.log('Challenge accepted:', payload);
        toast.success('Your challenge was accepted! Redirecting to battle...');
        router.push(`/battle/${payload.lobbyId}`);
      })
      .on('broadcast', { event: 'challenge_declined' }, ({ payload }) => {
        console.log('Challenge declined:', payload);
        toast.error('Your challenge was declined.');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to channel: users:${user.id}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, router]);

  return null;
}
