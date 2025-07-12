'use client';

import { useState, useEffect } from 'react';
import { CardSelection } from './CardSelection';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/types/game';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/Dialog';

interface AcceptChallengeModalProps {
  challenge: any;
  isOpen: boolean;
  onClose: () => void;
  onChallengeAccepted: () => void;
}

export default function AcceptChallengeModal({ 
  challenge,
  isOpen,
  onClose,
  onChallengeAccepted
}: AcceptChallengeModalProps) {
  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchPlayerCards = async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('player_cards')
            .select('*')
            .eq('player_id', user.id);

          if (error) {
            toast({ title: 'Error fetching cards', description: error.message, variant: 'destructive' });
          } else {
            // No need to format the cards, as player_cards already contains all the card information
            setPlayerCards(data || []);
          }
        }
        setIsLoading(false);
      };
      fetchPlayerCards();
    }
  }, [isOpen, supabase, toast]);

  const handleAcceptChallenge = async () => {
    if (!selectedCard) {
      toast({ title: 'No card selected', description: 'Please select a card to battle.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    
    // TODO: Move this to a Supabase Edge Function for security
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.functions.invoke('battle_resolver', {
        body: {
          _challenge_id: challenge.id,
          _player2_id: user.id,
          _player2_card_id: selectedCard.id,
        },
      });

      if (error) {
        toast({ title: 'Error accepting challenge', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Challenge Accepted!', description: 'The battle is underway. Check the results soon.' });
        onChallengeAccepted();
        onClose();
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Challenge</DialogTitle>
          <DialogDescription>
            Select a card from your collection to battle against {challenge.challenger?.display_name}.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div>
            <CardSelection 
              cards={playerCards} 
              onCardSelect={(card) => setSelectedCard(card)} 
              selectedCard={selectedCard} 
              isSubmitting={isSubmitting}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleAcceptChallenge} disabled={!selectedCard || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Accept & Battle
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
