'use client';

import { useState, useEffect, useCallback } from 'react';
import { PackOpener } from '@/components/game/PackOpener';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { Card } from '@/types/game';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/slider';
import TimeFeedbackSlider from '@/components/game/TimeFeedbackSlider';

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
  const [cardColors, setCardColors] = useState<{[key: string]: string}>({ 
    'humanoid': '#cd7f32',
    'weapon': '#cd7f32' 
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

  // Create stable callbacks for each pack type
  const handleHumanoidColorChange = useCallback((colors: { bg: string; dark: string; light: string; track: string }) => {
    setCardColors(prev => ({
      ...prev,
      humanoid: colors.bg
    }));
  }, []);

  const handleWeaponColorChange = useCallback((colors: { bg: string; dark: string; light: string; track: string }) => {
    setCardColors(prev => ({
      ...prev,
      weapon: colors.bg
    }));
  }, []);

  return (
    <div className="content-height">
      <div className="container mx-auto px-4 py-8">
        <div className="h-16"></div>
      
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
                    className="border rounded-lg p-6 shadow-sm hover:shadow transition-all duration-300"
                    style={{ backgroundColor: cardColors[pack.type] }}
                  >
                    <h2 className="text-xl font-bold mb-2 text-gray-700">{pack.name}</h2>
                    <p className="text-gray-600 mb-4">{pack.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Time to open:</span>
                      </div>
                      <div className="mb-2">
                        <TimeFeedbackSlider 
                          value={timerDurations[pack.type]}
                          onValueChange={(value) => {
                            setTimerDurations(prev => ({
                              ...prev,
                              [pack.type]: value
                            }));
                          }}
                          onColorChange={pack.type === 'humanoid' ? handleHumanoidColorChange : handleWeaponColorChange}
                          packType={pack.type}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-gray-600">
                        Unlimited packs available
                      </p>
                      <Button 
                        onClick={() => handleStartTimer(pack)} 
                        disabled={isLoading[pack.type]}
                        className="ml-auto bg-gray-700/80 hover:bg-gray-700 text-white border-gray-700/50"
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
    </div>
  );
}
