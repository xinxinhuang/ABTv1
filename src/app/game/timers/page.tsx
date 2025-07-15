"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ActiveTimersDisplay } from "@/components/game/ActiveTimersDisplay";

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

  useEffect(() => {
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

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Active Timers</h1>
        {userId ? (
          <ActiveTimersDisplay 
            timers={timers} 
            onTimerComplete={handleTimerComplete} 
          />
        ) : (
          <p>Please log in to view your active timers.</p>
        )}
      </div>
    </div>
  );
}
