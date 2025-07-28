'use client';

import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

import { CardSelector, BattleCard } from './CardSelector';

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
  const [selectedCard, setSelectedCard] = useState<BattleCard | null>(null);
  const [playerCards, setPlayerCards] = useState<BattleCard[]>([]);
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
            .select('*, cards(*)')
            .eq('player_id', user.id);

          if (error) {
            toast({ title: 'Error fetching cards', description: error.message, variant: 'destructive' });
          } else {
            const formattedCards: BattleCard[] = (data || []).map((pc: any) => ({
              id: pc.id, // This is player_card_id
              name: pc.cards.name,
              imageUrl: pc.cards.image_url,
              rarity: pc.cards.rarity,
              type: pc.cards.type,
              attributes: pc.cards.attributes,
            }));
            setPlayerCards(formattedCards);
          }
        }
        setIsLoading(false);
      };
      fetchPlayerCards();
    }
  }, [isOpen, toast]);

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
        toast({ 
          title: 'Challenge Accepted!', 
          description: 'The battle is underway. Check the results soon.',
          duration: 3000 // Auto-dismiss after 3 seconds
        });
        
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
            <CardSelector 
              cards={playerCards}
              onCardSelect={(card: BattleCard) => setSelectedCard(card)}
              selectedCard={selectedCard}
              isSubmitting={isSubmitting}
              onConfirmSelection={async () => { /* No-op for this modal */ }}
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
