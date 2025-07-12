'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/use-toast';

interface ChallengeButtonProps {
  challengedPlayerId: string;
}

export function ChallengeButton({ challengedPlayerId }: ChallengeButtonProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleChallenge = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to challenge a player.');

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('User is not authenticated.');
      }

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Edge Function returned a non-2xx status code: ${response.status}`);
      }

      const data = await response.json();

      toast({
        title: 'Challenge Sent!',
        description: 'Your challenge has been sent. Waiting for a response.',
      });
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
    <Button onClick={handleChallenge} disabled={isLoading}>
      {isLoading ? 'Challenging...' : 'Challenge'}
    </Button>
  );
}
