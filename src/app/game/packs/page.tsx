'use client';

import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';

import TimeFeedbackSlider from '@/components/game/TimeFeedbackSlider';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { Button } from '@/components/ui/Button';
import { Card as CardUI, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Card } from '@/types/game';
import { PackOpener } from '@/components/game/PackOpener';
import { supabase } from '@/lib/supabase/client';

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
  queue_position: number;
  is_active: boolean;
  is_completed: boolean;
  is_saved: boolean;
}

interface PackStatus {
  activeCount: number;
  queueCount: number;
  savedCount: number;
}

export default function PacksPage() {
  const [isOpeningPack, setIsOpeningPack] = useState(false);
  const [packType, setPackType] = useState<'humanoid' | 'weapon'>('humanoid');
  const [_timerId, _setTimerId] = useState('');
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [packStatus, setPackStatus] = useState<{[key: string]: PackStatus}>({});
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
      
      // Fetch active timers and queue status
      const { data: timersData } = await supabase
        .from('active_timers')
        .select('*')
        .eq('player_id', user.id)
        .eq('is_completed', false)
        .order('queue_position', { ascending: true });
        
      if (timersData) {
        setActiveTimers(timersData as ActiveTimer[]);
        
        // Calculate pack status per category
        const status = {
          humanoid: { activeCount: 0, queueCount: 0, savedCount: 0 },
          weapon: { activeCount: 0, queueCount: 0, savedCount: 0 }
        };
        
        timersData.forEach(timer => {
          const packType = timer.pack_type as 'humanoid' | 'weapon';
          if (timer.is_active) {
            status[packType].activeCount++;
          } else {
            status[packType].queueCount++;
          }
        });
        
        setPackStatus(status);
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
            .eq('is_completed', false)
            .order('queue_position', { ascending: true });
            
          if (timersData) {
            setActiveTimers(timersData as ActiveTimer[]);
            
            // Recalculate pack status
            const status = {
              humanoid: { activeCount: 0, queueCount: 0, savedCount: 0 },
              weapon: { activeCount: 0, queueCount: 0, savedCount: 0 }
            };
            
            timersData.forEach(timer => {
              const packType = timer.pack_type as 'humanoid' | 'weapon';
              if (timer.is_active) {
                status[packType].activeCount++;
              } else {
                status[packType].queueCount++;
              }
            });
            
            setPackStatus(status);
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
        
        // Enhanced error messages for better UX
        if (error.error?.includes('active timer already exists')) {
          const status = packStatus[pack.type] || { activeCount: 0, queueCount: 0 };
          const nextPosition = status.queueCount + 1;
          toast.error(`Active timer running - ${pack.name} will queue at position ${nextPosition}/5`);
          return;
        } else if (error.error?.includes('Maximum queue limit')) {
          const status = packStatus[pack.type] || { activeCount: 0, queueCount: 0 };
          toast.error(`Queue full! You have ${status.queueCount}/5 ${pack.type} boosters queued`);
          return;
        } else {
          throw new Error(error.error || 'Failed to start timer');
        }
      }
      
      // Get the timer ID from the response
      const result = await response.json();
      if (!result.timerId) {
        throw new Error('No timer ID returned from server');
      }
      
      // No need to update inventory - unlimited packs
      
      const message = result.queuePosition === 0 
        ? `${pack.name} timer started! Ready in ${timerDurations[pack.type]} hours.`
        : `${pack.name} queued at position ${result.queuePosition}/5`;
      toast.success(message);
      
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
  
  // Handle timer completion with open/save options
  const handleTimerComplete = async (timerId: string, action: 'open' | 'save') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const response = await fetch('/api/timers/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ timerId, action })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete timer');
      }

      toast.success(action === 'open' ? 'Pack opened!' : 'Pack saved for later');
      
      // Refresh the timers list
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: timersData } = await supabase
          .from('active_timers')
          .select('*')
          .eq('player_id', user.id)
          .eq('is_completed', false)
          .order('queue_position', { ascending: true });
          
        if (timersData) {
          setActiveTimers(timersData as ActiveTimer[]);
          
          // Recalculate pack status
          const status = {
            humanoid: { activeCount: 0, queueCount: 0, savedCount: 0 },
            weapon: { activeCount: 0, queueCount: 0, savedCount: 0 }
          };
          
          timersData.forEach(timer => {
            const packType = timer.pack_type as 'humanoid' | 'weapon';
            if (timer.is_active) {
              status[packType].activeCount++;
            } else {
              status[packType].queueCount++;
            }
          });
          
          setPackStatus(status);
        }
      }
      
      if (action === 'open') {
        setIsOpeningPack(true);
        _setTimerId(timerId);
      }
    } catch (error) {
      console.error('Error completing timer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete timer');
    }
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
                const status = packStatus[pack.type] || { activeCount: 0, queueCount: 0, savedCount: 0 };
                const isActive = status.activeCount > 0;
                const isQueueFull = status.activeCount + status.queueCount >= 5;
                const canStart = !isActive && !isQueueFull;
                
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
                    
                    <div className="text-center mb-4">
                      <div className="text-sm text-gray-600">
                        {isActive ? (
                          <span className="text-yellow-600 font-semibold">⏳ Active timer running</span>
                        ) : status.queueCount > 0 ? (
                          <span className="text-blue-600 font-semibold">📋 {status.queueCount}/5 in queue</span>
                        ) : (
                          <span className="text-green-600 font-semibold">✅ Ready to start</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        {status.activeCount > 0 && (
                          <span className="block">Active: 1/1</span>
                        )}
                        {status.queueCount > 0 && (
                          <span className="block">Queued: {status.queueCount}/5</span>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleStartTimer(pack)} 
                        disabled={!canStart || isLoading[pack.type]}
                        className={`ml-auto ${
                          canStart 
                            ? 'bg-gray-700/80 hover:bg-gray-700 text-white border-gray-700/50' 
                            : isActive 
                            ? 'bg-yellow-600 text-white cursor-not-allowed'
                            : 'bg-gray-400 cursor-not-allowed text-gray-600'
                        }`}
                      >
                        {isLoading[pack.type] ? 'Starting...' : 
                         isActive ? `Active (${status.queueCount}/5)` : 
                         isQueueFull ? 'Queue Full' : `Start Timer ${status.queueCount > 0 ? `(${status.queueCount}/5)` : ''}`}
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
