'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ChallengeButtonProps {
  challengedPlayerId: string;
  disabled?: boolean;
}

export function ChallengeButton({ challengedPlayerId, disabled = false }: ChallengeButtonProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleChallenge = async () => {
    console.log(`⚔️ Sending challenge from user to player: ${challengedPlayerId}`);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to challenge a player.');

      console.log(`📤 Challenge details: challenger=${user.id}, challenged=${challengedPlayerId}`);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('User is not authenticated.');
      }

      console.log('🔑 Session valid, calling challenge-player edge function...');
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/challenge-player`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ 
            player1_id: user.id,
            challenged_player_id: challengedPlayerId 
          }),
        }
      );

      console.log(`📡 Edge function response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Edge function error:', errorData);
        throw new Error(errorData.error || `Edge Function returned a non-2xx status code: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Challenge sent successfully:', data);

      toast({
        title: 'Challenge Sent!',
        description: 'Waiting for opponent to accept the challenge...',
        duration: 5000, // Auto-dismiss after 5 seconds
      });

      // Don't redirect immediately - wait for challenge to be accepted
      // The challenger will be redirected when they receive a notification that the challenge was accepted
      if (data.lobbyId) {
        console.log(`✅ Challenge created with lobby ID: ${data.lobbyId}`);
        console.log(`⏳ Waiting for opponent to accept challenge...`);
        
        // Set up a subscription to listen for when the challenge is accepted
        const battleChannel = supabase.channel(`battle:${data.lobbyId}`);
        
        const handleChallengeAccepted = (newStatus: string) => {
          if (newStatus === 'active') {
            console.log('🚀 Challenge accepted! Redirecting to battle...');
            
            // Update challenger's online status to 'in_battle'
            supabase
              .from('online_players')
              .update({ status: 'in_battle' })
              .eq('id', user.id)
              .then(({ error }) => {
                if (error) console.warn('Failed to update challenger status:', error);
              });
            
            // Show success toast
            toast({
              title: 'Challenge Accepted!',
              description: 'Entering battle arena...',
              duration: 3000,
            });
            
            // Redirect to battle
            router.push(`/game/arena/battle-v2/${data.lobbyId}`);
            
            // Clean up subscription
            battleChannel.unsubscribe();
          }
        };
        
        battleChannel
          // Listen for postgres changes (database updates)
          .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'battle_instances', filter: `id=eq.${data.lobbyId}` },
            (payload) => {
              console.log('🔄 Battle status updated via postgres:', payload);
              handleChallengeAccepted(payload.new.status);
            }
          )
          // Listen for broadcast events (from accept-challenge function)
          .on('broadcast', { event: 'challenge_accepted' }, ({ payload }) => {
            console.log('🔄 Challenge accepted via broadcast:', payload);
            handleChallengeAccepted(payload.newState?.status);
          })
          .subscribe();
          
        // Clean up subscription after 60 seconds (challenge timeout)
        setTimeout(() => {
          battleChannel.unsubscribe();
          console.log('🕐 Challenge subscription timed out');
        }, 60000);
      }
    } catch (error: any) {
      console.error('Error sending challenge:', error);
      const isDuplicateChallenge = error.message?.includes('duplicate key value violates unique constraint');
      
      toast({
        title: isDuplicateChallenge ? 'Challenge Already Sent' : 'Error',
        description: isDuplicateChallenge 
          ? 'You have a pending challenge with this player.' 
          : `Failed to send challenge: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleChallenge} disabled={isLoading || disabled}>
      {isLoading ? 'Challenging...' : 'Challenge'}
    </Button>
  );
}
