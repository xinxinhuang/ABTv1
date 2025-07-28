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
        description: 'Entering battle arena. Waiting for opponent...',
      });

      // Redirect challenger to battle arena immediately
      if (data.lobbyId) {
        console.log(`🚀 Redirecting challenger to battle: ${data.lobbyId}`);
        
        // Update challenger's online status to 'in_battle'
        try {
          const { error: statusError } = await supabase
            .from('online_players')
            .update({ status: 'in_battle' })
            .eq('id', user.id);
          if (statusError) {
            console.warn('Failed to update challenger status to in_battle:', statusError);
          }
        } catch (err) {
          console.warn('Error updating challenger status:', err);
        }
        
        router.push(`/game/arena/battle-v2/${data.lobbyId}`);
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
