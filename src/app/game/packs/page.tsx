'use client';

import { useState, useEffect } from 'react';
import { PackOpener } from '@/components/game/PackOpener';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { Card } from '@/types/game';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { Slider } from '@/components/ui/slider';

interface PackInfo {
  type: 'humanoid' | 'weapon';
  name: string;
  description: string;
  delayHours: number;
}

interface ActiveTimer {
  id: string;
  player_id: string;
  pack_type: 'humanoid' | 'weapon';
  start_time: string;
  target_delay_hours: number;
  status: string;
}

export default function PacksPage() {
  const [isOpeningPack, setIsOpeningPack] = useState(false);
  const [packType, setPackType] = useState<'humanoid' | 'weapon'>('humanoid');
  const [_timerId, _setTimerId] = useState('');
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [timerDurations, setTimerDurations] = useState<{[key: string]: number}>({ 
    'humanoid': 4,
    'weapon': 4 
  });
  
  // Fetch active timers on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch active timers
      const { data: timersData } = await supabase
        .from('active_timers')
        .select('*')
        .eq('player_id', user.id)
        .eq('status', 'active');
        
      if (timersData) {
        setActiveTimers(timersData as ActiveTimer[]);
      }
    };
    
    fetchUserData();
    
    // Set up real-time subscription for timer changes
    const timerSubscription = supabase
      .channel('active_timers_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'active_timers' }, 
        async () => {
          // Refresh timers when changes occur
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          
          const { data: timersData } = await supabase
            .from('active_timers')
            .select('*')
            .eq('player_id', user.id)
            .eq('status', 'active');
            
          if (timersData) {
            setActiveTimers(timersData as ActiveTimer[]);
          }
        }
      )
      .subscribe();
      
    return () => {
      timerSubscription.unsubscribe();
    };
  }, []); // No dependencies needed
  
  const packs: PackInfo[] = [
    {
      type: 'humanoid',
      name: 'Humanoid Booster',
      description: 'Contains a random humanoid card',
      delayHours: 4
    },
    {
      type: 'weapon',
      name: 'Weapon Booster',
      description: 'Contains a random weapon card',
      delayHours: 4
    }
  ];
  
  const handleStartTimer = async (pack: PackInfo) => {
    try {
      setIsLoading(prev => ({ ...prev, [pack.type]: true }));
      setPackType(pack.type);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('You must be logged in to open packs');
      }
      
      // No need to check inventory - unlimited packs
      
      // Create a timer for the pack
      const response = await fetch('/api/timers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          packType: pack.type,
          delayHours: timerDurations[pack.type]
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to start timer');
      }
      
      // Get the timer ID from the response
      const result = await response.json();
      if (!result.timerId) {
        throw new Error('No timer ID returned from server');
      }
      
      // No need to update inventory - unlimited packs
      
      toast.success(`${pack.name} timer started! It will be ready in ${timerDurations[pack.type]} hours.`);
      
      // Refresh the timers list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: timersData } = await supabase
          .from('active_timers')
          .select('*')
          .eq('player_id', user.id)
          .eq('status', 'active');
          
        if (timersData) {
          setActiveTimers(timersData as ActiveTimer[]);
        }
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start timer');
    } finally {
      setIsLoading(prev => ({ ...prev, [pack.type]: false }));
    }
  };
  
  // Handle timer completion (when a pack is opened)
  const handleTimerComplete = (_timerId: string) => {
    // No need to refresh inventory - unlimited packs
  };
  
  const handlePackComplete = (cards: Card[]) => {
    console.log('Pack opened with cards:', cards);
    setIsOpeningPack(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Booster Packs</h1>
        <HamburgerMenu />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Booster Packs Section */}
        <CardUI>
          <CardHeader>
            <CardTitle>Available Boosters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packs.map(pack => {
                // No need for pack counts with unlimited packs
                
                return (
                  <div 
                    key={`${pack.type}`}
                    className="border rounded-lg p-6 bg-muted/20 shadow-sm hover:shadow transition-shadow"
                  >
                    <h2 className="text-xl font-bold mb-2">{pack.name}</h2>
                    <p className="text-muted-foreground mb-4">{pack.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Time to open:</span>
                        <span className="ml-2">{timerDurations[pack.type]} hours</span>
                      </div>
                      <div className="mb-2">
                        <Slider 
                          value={[timerDurations[pack.type]]}
                          min={4}
                          max={24}
                          step={1}
                          onValueChange={(value) => {
                            setTimerDurations(prev => ({
                              ...prev,
                              [pack.type]: value[0]
                            }));
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>4h (1% gold chance)</span>
                        <span>24h (20% gold chance)</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm opacity-70">
                        Unlimited packs available
                      </p>
                      <Button 
                        onClick={() => handleStartTimer(pack)} 
                        disabled={isLoading[pack.type]}
                        className="ml-auto"
                      >
                        {isLoading[pack.type] ? 'Starting...' : 'Start Timer'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CardUI>
        
        {/* Active Timers Display */}
        <div>
          <ActiveTimersDisplay 
            timers={activeTimers} 
            onTimerComplete={handleTimerComplete} 
            className="h-full"
          />
        </div>
      </div>
      
      {/* Show pack opener when a pack is being opened */}
      {isOpeningPack && (
        <div className="mb-8">
          <PackOpener 
            timerId={_timerId} 
            packType={packType} 
            onComplete={handlePackComplete} 
            onCancel={() => setIsOpeningPack(false)} 
          />
        </div>
      )}
    </div>
  );
}
