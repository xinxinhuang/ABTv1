'use client';

import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { supabase } from '@/lib/supabase/client';

interface ActiveTimer {
  id: string;
  player_id: string;
  pack_type: string;
  start_time: string;
  target_delay_hours: number;
  status: 'active' | 'ready' | 'completed';
  created_at: string;
}

interface TimerDiagnostics {
  timer?: {
    id: string;
    pack_type: string;
    status: string;
    start_time: string;
    target_delay_hours: number;
  };
  diagnostics?: {
    currentUserId: string;
    belongsToUser: boolean;
    hasPermission: boolean;
    shouldBeReady: boolean;
    timePassed: number;
    targetDelayHours: number;
  };
}

interface TimerDebugPanelProps {
  className?: string;
}

export function TimerDebugPanel({ className }: TimerDebugPanelProps) {
  const [timerId, setTimerId] = useState('');
  const [_hoursToSubtract, _setHoursToSubtract] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [isLoadingTimers, setIsLoadingTimers] = useState(false);
  const [isCheckingTimer, setIsCheckingTimer] = useState(false);
  const [timerDiagnostics, setTimerDiagnostics] = useState<TimerDiagnostics | null>(null);
  
  // Fetch active timers when component mounts
  useEffect(() => {
    fetchActiveTimers();
  }, []);
  
  // Function to fetch active timers
  const fetchActiveTimers = async () => {
    try {
      setIsLoadingTimers(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to view timers');
        return;
      }
      
      // Log to debug
      console.log('Fetching timers for user:', session.user.id);
      
      // First, check if the specific timer exists
      const specificTimer = '0ea8cb8e-f810-4386-b153-86939e7ed111';
      const { data: specificData } = await supabase
        .from('active_timers')
        .select('*')
        .eq('id', specificTimer);
      
      console.log('Specific timer check:', specificData);
      
      // Get all active and ready timers
      const { data, error } = await supabase
        .from('active_timers')
        .select('*')
        .eq('player_id', session.user.id)
        .in('status', ['active', 'ready'])
        .order('start_time', { ascending: false });
        
      console.log('All timers result:', data);
      
      if (error) {
        console.error('Error fetching timers:', error);
        toast.error('Failed to fetch active timers');
        return;
      }
      
      setActiveTimers(data || []);
      
      // If timers were found, select the first one by default
      if (data && data.length > 0) {
        setTimerId(data[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while fetching timers');
    } finally {
      setIsLoadingTimers(false);
    }
  };

  const handleOpenNow = async () => {
    if (!timerId) {
      toast.error('Please select or enter a timer ID');
      return;
    }

    try {
      setIsLoading(true);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to modify timers');
        setIsLoading(false);
        return;
      }

      // Call the API endpoint to make the timer ready immediately
      const response = await fetch('/api/debug/fast-forward-timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          timerId,
          // Set hours to a large number to ensure it's ready immediately
          hoursToSubtract: 999
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to make timer ready');
        return;
      }

      // Process response but we don't need to use the data directly
      await response.json();
      toast.success('Timer is now ready to open!');
      
      // Refresh timers list
      await fetchActiveTimers();
      
    } catch (error) {
      console.error('Error making timer ready:', error);
      toast.error('An error occurred while making the timer ready');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearAllTimers = async () => {
    try {
      setIsClearing(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to clear timers');
        setIsClearing(false);
        return;
      }
      
      // Call the API endpoint to clear all active timers
      const response = await fetch('/api/debug/clear-old-timers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to clear timers');
        return;
      }
      
      toast.success('All active timers have been cleared');
      
      // Refresh timers list instead of reloading the page
      setActiveTimers([]);
      setTimerId('');
      await fetchActiveTimers();
      
    } catch (error) {
      console.error('Error clearing timers:', error);
      toast.error('An error occurred while clearing timers');
    } finally {
      setIsClearing(false);
    }
  };
  
  const handleCheckTimer = async () => {
    if (!timerId) {
      toast.error('Please enter a timer ID to check');
      return;
    }
    
    try {
      setIsCheckingTimer(true);
      setTimerDiagnostics(null);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to check timers');
        return;
      }
      
      // Call the API endpoint to check the timer
      const response = await fetch('/api/debug/check-timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ timerId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || 'Failed to check timer');
        return;
      }
      
      // Set the diagnostics data
      setTimerDiagnostics(data);
      toast.success('Timer checked successfully');
      
    } catch (error) {
      console.error('Error checking timer:', error);
      toast.error('An error occurred while checking the timer');
    } finally {
      setIsCheckingTimer(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Timer Debug Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="timerId">Select Active Timer</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchActiveTimers}
                disabled={isLoadingTimers}
              >
                {isLoadingTimers ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            
            {isLoadingTimers ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <p className="text-sm text-muted-foreground">Loading timers...</p>
              </div>
            ) : activeTimers.length > 0 ? (
              <div className="border rounded-md divide-y">
                {activeTimers.map((timer) => {
                  const startTime = new Date(timer.start_time);
                  const targetTime = new Date(startTime.getTime() + (timer.target_delay_hours * 60 * 60 * 1000));
                  const timeLeft = targetTime.getTime() - Date.now();
                  const isReady = timeLeft <= 0;
                  
                  return (
                    <div 
                      key={timer.id} 
                      className={`p-2 cursor-pointer ${timerId === timer.id ? 'bg-muted' : ''}`}
                      onClick={() => setTimerId(timer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{timer.pack_type.charAt(0).toUpperCase() + timer.pack_type.slice(1)} Pack</div>
                          <div className="text-xs text-muted-foreground">
                            {isReady ? (
                              <span className="text-green-600 font-semibold">READY TO OPEN</span>
                            ) : (
                              <span>Ready {formatDistanceToNow(targetTime)}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <input 
                            type="radio" 
                            name="timerId" 
                            checked={timerId === timer.id}
                            onChange={() => setTimerId(timer.id)}
                          />
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        ID: {timer.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <p className="text-sm text-muted-foreground">No active timers found</p>
              </div>
            )}
            
            {/* Allow manual entry if needed */}
            <div className="mt-2">
              <Label htmlFor="manualTimerId" className="text-xs">Or enter timer ID manually:</Label>
              <Input
                id="manualTimerId"
                value={timerId}
                onChange={(e) => setTimerId(e.target.value)}
                placeholder="Enter timer ID"
                className="text-xs mt-1 h-8"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleOpenNow} 
            disabled={isLoading || !timerId}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Open Pack Now'}
          </Button>
          
          <p className="text-xs text-muted-foreground mt-2">
            Note: This is for development/testing only. It will make the timer ready to open immediately.
          </p>
          
          <div className="border-t border-gray-200 my-4" />
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Timer Diagnostics</h3>
            <Button 
              onClick={handleCheckTimer} 
              disabled={isCheckingTimer || !timerId}
              className="w-full"
              variant="outline"
            >
              {isCheckingTimer ? 'Checking...' : 'Check Timer Details'}
            </Button>
            
            {timerDiagnostics && (
              <div className="mt-4 p-3 border rounded-md bg-muted/30 text-xs space-y-2 overflow-auto max-h-60">
                <h4 className="font-semibold">Timer Diagnostics:</h4>
                <div>
                  <span className="font-medium">Timer ID:</span> {timerDiagnostics.timer?.id}
                </div>
                <div>
                  <span className="font-medium">Pack Type:</span> {timerDiagnostics.timer?.pack_type}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {timerDiagnostics.timer?.status}
                </div>
                <div>
                  <span className="font-medium">Start Time:</span> {timerDiagnostics.timer?.start_time}
                </div>
                <div>
                  <span className="font-medium">Target Hours:</span> {timerDiagnostics.timer?.target_delay_hours}
                </div>
                <div>
                  <span className="font-medium">Current User ID:</span> {timerDiagnostics.diagnostics?.currentUserId}
                </div>
                <div>
                  <span className="font-medium">Belongs to User:</span> {timerDiagnostics.diagnostics?.belongsToUser ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Has Permission:</span> {timerDiagnostics.diagnostics?.hasPermission ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Should Be Ready:</span> {timerDiagnostics.diagnostics?.shouldBeReady ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Time Passed:</span> {Math.floor((timerDiagnostics.diagnostics?.timePassed ?? 0) / (1000 * 60 * 60))} hours, {Math.floor(((timerDiagnostics.diagnostics?.timePassed ?? 0) % (1000 * 60 * 60)) / (1000 * 60))} minutes
                </div>
                <div>
                  <span className="font-medium">Time Required:</span> {timerDiagnostics.diagnostics?.targetDelayHours} hours
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-200 my-4" />
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Bulk Actions</h3>
            <Button 
              onClick={handleClearAllTimers} 
              disabled={isClearing || isLoading}
              className="w-full"
              variant="destructive"
            >
              {isClearing ? 'Clearing...' : 'Clear All Active Timers'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will mark all your active timers as completed, removing them from display.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
