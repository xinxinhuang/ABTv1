'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AcceptChallengeModal from './AcceptChallengeModal';

export default function ChallengeList() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [userProfiles, setUserProfiles] = useState<Record<string, { email: string }>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Step 1: Fetch challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('battle_instances')
        .select('*')
        .eq('status', 'pending')
        .not('player1_id', 'eq', user.id);

      if (challengesError) {
        toast({ title: 'Error fetching challenges', description: challengesError.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (challengesData && challengesData.length > 0) {
        // Step 2: Use a different approach to get challenger emails
        // Store challenger info in a temporary object
        const tempProfiles: Record<string, { email: string }> = {};
        
        // For each challenge, fetch the user profile directly
        for (const challenge of challengesData) {
          try {
            // Get user by ID using the auth API (this doesn't trigger CORS preflight)
            const { data: userData } = await supabase
              .from('profiles')
              .select('id, display_name')
              .eq('id', challenge.player1_id)
              .single();
              
            if (userData) {
              tempProfiles[challenge.player1_id] = { email: userData.display_name || 'Anonymous' };
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        }
        
        setUserProfiles(tempProfiles);
      }

      setChallenges(challengesData || []);
      setIsLoading(false);
    };

    fetchChallenges();
  }, [toast]);

  const handleAcceptChallenge = (challenge: any) => {
    setSelectedChallenge(challenge);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (challenges.length === 0) {
    return <p>No open challenges at the moment. Why not create one?</p>;
  }

  return (
    <>
      <div className="space-y-4">
      {challenges.map((challenge) => (
        <div key={challenge.id} className="p-4 border rounded-lg flex justify-between items-center">
          <div>
                                    <p className="font-semibold">Challenger: {userProfiles[challenge.player1_id]?.email || 'Loading...'}</p>
            <p className="text-sm text-gray-500">Status: {challenge.status}</p>
          </div>
          <Button onClick={() => handleAcceptChallenge(challenge)}>
            Accept Challenge
          </Button>
        </div>
      ))}
          </div>
      {selectedChallenge && (
        <AcceptChallengeModal
          challenge={selectedChallenge}
          isOpen={!!selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          onChallengeAccepted={() => {
            setSelectedChallenge(null);
            // Optionally, refresh the list of challenges here
          }}
        />
      )}
    </>
  );
}
