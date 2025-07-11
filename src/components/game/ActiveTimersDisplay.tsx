'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { intervalToDuration } from 'date-fns';
import { toast } from 'sonner';
import { TimerDebugPanel } from '@/components/debug/TimerDebugPanel';
import { supabase } from '@/lib/supabase/client';
import { PackOpener } from '@/components/game/PackOpener';
import { Card as GameCard } from '@/types/game';

interface ActiveTimer {
  id: string;
  player_id: string;
  pack_type: 'humanoid' | 'weapon';
  start_time: string;
  target_delay_hours: number;
  status: string;
}

interface ActiveTimersDisplayProps {
  timers: ActiveTimer[];
  onTimerComplete?: (timerId: string) => void;
  className?: string;
}

export function ActiveTimersDisplay({ timers: initialTimers, onTimerComplete, className = '' }: ActiveTimersDisplayProps) {
  const [timers, setTimers] = useState<ActiveTimer[]>(initialTimers);
  const [isLoading, _setIsLoading] = useState<{[key: string]: boolean}>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningPack, setIsOpeningPack] = useState(false);
  const [currentPackType, setCurrentPackType] = useState<'humanoid' | 'weapon'>('humanoid');
  const [currentTimerId, setCurrentTimerId] = useState('');
  
  // Update timers when props change
  useEffect(() => {
    setTimers(initialTimers);
  }, [initialTimers]);
  
  // Set up real-time subscription to active_timers table
  useEffect(() => {
    // Get the current user's session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Set up subscription for real-time updates
      const subscription = supabase
        .channel('active-timers-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'active_timers',
            filter: `player_id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('Received real-time update:', payload);
            // Refresh timers when changes are detected
            fetchTimers();
          }
        )
        .subscribe();
      
      // Clean up subscription when component unmounts
      return () => {
        subscription.unsubscribe();
      };
    };
    
    getSession();
  }, []);
  
  // Function to fetch timers from the database
  const fetchTimers = async () => {
    try {
      setIsRefreshing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to view timers');
        return;
      }
      
      const { data, error } = await supabase
        .from('active_timers')
        .select('*')
        .eq('player_id', session.user.id)
        .in('status', ['active', 'ready'])
        .order('start_time', { ascending: false });
      
      if (error) {
        console.error('Error fetching timers:', error);
        toast.error('Failed to refresh timers');
        return;
      }
      
      setTimers(data || []);
      
    } catch (error) {
      console.error('Error refreshing timers:', error);
      toast.error('Failed to refresh timers');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle refresh button click
  const handleRefresh = () => {
    fetchTimers();
  };
  
  // Function to calculate remaining seconds
  const calculateRemainingSeconds = (startTime: string, delayHours: number) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const delayMs = delayHours * 60 * 60 * 1000;
    const end = start + delayMs;
    return Math.max(0, (end - now) / 1000);
  };
  
  // Check if timer is ready
  const isTimerReady = (remainingSeconds: number) => {
    return remainingSeconds <= 0;
  };
  
  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Ready to open!';
    
    const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
    const parts: string[] = [];
    
    if (duration.hours && duration.hours > 0) {
      parts.push(`${duration.hours}h`);
    }
    if (duration.minutes && duration.minutes > 0) {
      parts.push(`${duration.minutes}m`);
    }
    if (duration.seconds && duration.seconds > 0) {
      parts.push(`${duration.seconds}s`);
    }
    
    return parts.join(' ');
  };

  // Update the UI every second to show accurate timer progress
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update timer calculations
      setTimers(current => [...current]);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleStartOpening = (timer: ActiveTimer) => {
    setCurrentTimerId(timer.id);
    setCurrentPackType(timer.pack_type as 'humanoid' | 'weapon');
    setIsOpeningPack(true);
  };
  
  const handlePackComplete = (cards: GameCard[]) => {
    console.log('Booster opened with cards:', cards);
    setIsOpeningPack(false);
    
    // Update timers list
    setTimers(prev => prev.filter(t => t.id !== currentTimerId));
    
    // Notify parent if needed
    if (onTimerComplete) {
      onTimerComplete(currentTimerId);
    }
  };
  
  const handlePackCancel = () => {
    setIsOpeningPack(false);
  };
  
  return (
    <div className="space-y-8">
      {isOpeningPack && (
        <PackOpener
          timerId={currentTimerId}
          packType={currentPackType}
          onComplete={handlePackComplete}
          onCancel={handlePackCancel}
        />
      )}
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Active Timers</CardTitle>
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing} 
            variant="outline" 
            size="sm"
            className="h-8 px-2 lg:px-3"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {timers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timers.map(timer => {
                const remainingSeconds = calculateRemainingSeconds(
                  timer.start_time,
                  timer.target_delay_hours
                );
                const ready = isTimerReady(remainingSeconds);
                const timeRemaining = formatTimeRemaining(remainingSeconds);

                return (
                  <div 
                    key={timer.id} 
                    className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg capitalize">
                        {timer.pack_type} Pack
                      </h3>
                    </div>
                    
                    {!ready && (
                      <div className="mb-4">
                        <div className="w-full">
                          <Progress 
                            value={Math.max(0, 100 - (remainingSeconds / (timer.target_delay_hours * 3600)) * 100)} 
                            className="h-2 bg-muted"
                            indicatorClassName="bg-blue-500"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          {timeRemaining}
                        </p>
                      </div>
                    )}
                    
                    <Button
                      className="w-full"
                      onClick={() => handleStartOpening(timer)}
                      disabled={!ready || isLoading[timer.id]}
                      variant={ready ? 'default' : 'outline'}
                    >
                      {isLoading[timer.id] ? 'Opening...' : ready ? 'Open Booster' : 'Not Ready'}
                    </Button>
                    
                    {/* Show timer ID for debugging */}
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Timer ID: {timer.id}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active timers.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start a new timer to open a pack.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Debug Panel for Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Timer Debug Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <TimerDebugPanel />
        </CardContent>
      </Card>
    </div>
  );
}
