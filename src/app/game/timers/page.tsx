"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ActiveTimersDisplay } from "@/components/game/ActiveTimersDisplay";
import { PackOpener } from "@/components/game/PackOpener";
import { Card } from "@/types/game";
import { toast } from "sonner";

interface ActiveTimer {
  id: string;
  player_id: string;
  pack_type: 'humanoid' | 'weapon';
  start_time: string;
  target_delay_hours: number;
  status: string;
}

export default function TimersPage() {
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [openingPack, setOpeningPack] = useState<{
    timerId: string;
    packType: 'humanoid' | 'weapon';
  } | null>(null);

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
  }, [supabase, userId]);

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

  const fetchUser = async () => {
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
  };

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Active Timers</h1>
        {userId ? (
          <ActiveTimersDisplay 
            timers={timers} 
            onTimerComplete={handleTimerComplete}
            onOpenPack={handleOpenPack}
          />
        ) : (
          <p>Please log in to view your active timers.</p>
        )}
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
