'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { useEffect, useState, useCallback } from 'react';

import { ActiveTimer, Card } from '@/types/game';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { PackOpener } from '@/components/game/PackOpener';
import { StartTimerForm } from '@/components/game/StartTimerForm';

export default function TimersPage() {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [openingPack, setOpeningPack] = useState<{
    timerId: string;
    packType: 'humanoid' | 'weapon';
  } | null>(null);

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Fetch active timers for this user
      const { data } = await supabase
        .from('active_timers')
        .select('*')
        .eq('player_id', user.id)
        .eq('status', 'active');
        
      if (data) {
        setTimers(data);
      }
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();
    
    // Set up real-time subscription for timer updates
    const channel = supabase
      .channel('active_timers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_timers',
        filter: userId ? `player_id=eq.${userId}` : undefined
      }, (payload) => {
        // Refresh timers when changes occur
        fetchUser();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, fetchUser]);

  const handleTimerComplete = async (timerId: string) => {
    // Update the timer status when completed
    await supabase
      .from('active_timers')
      .update({ status: 'completed' })
      .eq('id', timerId);
  };

  const handleOpenPack = (timerId: string, packType: 'humanoid' | 'weapon') => {
    setOpeningPack({ timerId, packType });
  };

  const handlePackComplete = (cards: Card[]) => {
    setOpeningPack(null);
    toast.success(`Received ${cards.length} new card${cards.length > 1 ? 's' : ''}!`);
    // Refresh timers after pack is opened
    if (userId) {
      fetchUser();
    }
  };

  const handlePackCancel = () => {
    setOpeningPack(null);
  };

  const handleTimerStart = () => {
    // Refresh timers when a new timer is started
    fetchUser();
  };

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Timers</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <StartTimerForm onTimerStart={handleTimerStart} />
          <ActiveTimersDisplay 
            timers={timers} 
            onTimerComplete={handleTimerComplete}
            onOpenPack={handleOpenPack}
          />
        </div>
      </div>
      
      {/* Pack Opener Modal */}
      {openingPack && (
        <PackOpener
          timerId={openingPack.timerId}
          packType={openingPack.packType}
          onComplete={handlePackComplete}
          onCancel={handlePackCancel}
        />
      )}
    </div>
  );
}
