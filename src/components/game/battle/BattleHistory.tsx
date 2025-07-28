'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';

type BattleHistoryItem = {
  id: string;
  created_at: string;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  status: string;
  explanation: string | null;
  player1: {
    username: string;
    avatar_url: string | null;
  };
  player2: {
    username: string;
    avatar_url: string | null;
  };
};

interface BattleHistoryProps {
  onSelectBattle?: (battleId: string) => void;
  limit?: number;
  className?: string;
}

export const BattleHistory = ({ 
  onSelectBattle, 
  limit = 5,
  className = ''
}: BattleHistoryProps) => {
  const supabase = createClientComponentClient();
  const { user } = useUser();
  const router = useRouter();
  const [battles, setBattles] = useState<BattleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBattleHistory = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch battles where the current user was either player1 or player2
        const { data, error } = await supabase
          .from('battle_lobbies')
          .select(`
            *,
            player1:player1_id(username, avatar_url),
            player2:player2_id(username, avatar_url)
          `)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        
        setBattles(data || []);
      } catch (error) {
        console.error('Error fetching battle history:', error);
        toast.error('Failed to load battle history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBattleHistory();
  }, [user, supabase, limit]);

  const getBattleResult = (battle: BattleHistoryItem) => {
    if (!battle.winner_id) return 'Draw';
    return battle.winner_id === user?.id ? 'Victory' : 'Defeat';
  };

  const getBattleResultClass = (battle: BattleHistoryItem) => {
    if (!battle.winner_id) return 'text-yellow-400';
    return battle.winner_id === user?.id ? 'text-green-400' : 'text-red-400';
  };

  const getOpponentName = (battle: BattleHistoryItem) => {
    return battle.player1_id === user?.id 
      ? battle.player2.username 
      : battle.player1.username;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-lg mb-4">You haven't completed any battles yet.</p>
        <Button onClick={() => router.push('/battle')} className="bg-blue-600 hover:bg-blue-700">
          Find a Battle
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-2xl font-bold mb-4">Recent Battles</h2>
      
      {battles.map((battle) => (
        <div 
          key={battle.id} 
          className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition cursor-pointer"
          onClick={() => onSelectBattle ? onSelectBattle(battle.id) : router.push(`/battle/${battle.id}`)}
        >
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-400">
                {new Date(battle.created_at).toLocaleDateString()}
              </span>
              <p className="font-medium">
                vs {getOpponentName(battle)}
              </p>
            </div>
            <div className={`font-bold ${getBattleResultClass(battle)}`}>
              {getBattleResult(battle)}
            </div>
          </div>
          {battle.explanation && (
            <p className="text-sm text-gray-300 mt-2 line-clamp-1">
              {battle.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default BattleHistory;
