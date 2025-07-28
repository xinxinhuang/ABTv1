'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function BattleHistoryPage() {
  const { toast } = useToast();
  const [battles, setBattles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBattleHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('battle_instances')
        .select('*, winner:winner_id(display_name), loser:loser_id(display_name)')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'Completed')
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error fetching battle history', description: error.message, variant: 'destructive' });
      } else {
        setBattles(data);
      }
      setIsLoading(false);
    };

    fetchBattleHistory();
  }, [toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Battle History</h1>
      <Link href="/game/arena/lobby" className="text-blue-500 hover:underline mb-4 block">
        &larr; Back to Arena Lobby
      </Link>
      {battles.length === 0 ? (
        <p>You have no completed battles.</p>
      ) : (
        <div className="space-y-4">
          {battles.map((battle) => (
            <div key={battle.id} className="p-4 border rounded-lg">
              <p><strong>Winner:</strong> {battle.winner?.display_name || 'N/A'}</p>
              <p><strong>Loser:</strong> {battle.loser?.display_name || 'N/A'}</p>
              <p className="text-sm text-gray-500">Fought on: {new Date(battle.created_at).toLocaleString()}</p>
              {/* TODO: Add a link or modal to show more details, like cards involved */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
