'use client';

import { intervalToDuration } from 'date-fns';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

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
  onOpenPack?: (timerId: string, packType: 'humanoid' | 'weapon') => void;
  className?: string;
}

export function ActiveTimersDisplay({ timers: initialTimers, onTimerComplete, onOpenPack, className = '' }: ActiveTimersDisplayProps) {
  const [timers, setTimers] = useState<ActiveTimer[]>(initialTimers);
  
  // Update timers when props change
  useEffect(() => {
    setTimers(initialTimers);
  }, [initialTimers]);
  
  // Function to calculate remaining seconds
  const calculateRemainingSeconds = (startTime: string, delayHours: number) => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const delayMs = delayHours * 60 * 60 * 1000;
    const end = start + delayMs;
    return Math.max(0, (end - now) / 1000);
  };
  
  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Ready!';
    
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
  
  if (timers.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">⏱️</div>
        <div className="text-gray-400">No active timers</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {timers.map((timer, index) => {
        const remainingSeconds = calculateRemainingSeconds(
          timer.start_time,
          timer.target_delay_hours
        );
        const ready = remainingSeconds <= 0;
        const timeRemaining = formatTimeRemaining(remainingSeconds);
        const progress = Math.max(0, Math.min(100, 100 - (remainingSeconds / (timer.target_delay_hours * 3600)) * 100));

        const packTypeColor = timer.pack_type === 'humanoid' ? 'blue' : 'purple';
        const statusColor = ready ? 'green' : 'gray';

        return (
          <motion.div
            key={timer.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-${statusColor}-500/10 border border-${statusColor}-500/30 rounded-xl p-4 ${ready ? 'animate-pulse' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${ready ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                <div>
                  <div className={`font-semibold text-${packTypeColor}-300 capitalize`}>
                    {timer.pack_type} Pack
                  </div>
                  <div className={`text-sm ${ready ? 'text-green-300' : 'text-gray-400'}`}>
                    {timeRemaining}
                  </div>
                </div>
              </div>
              
              {!ready && (
                <div className="flex-1 mx-4 max-w-32">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div 
                      className={`bg-${packTypeColor}-500 h-2 rounded-full transition-all duration-1000`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-center mt-1">
                    {Math.round(progress)}%
                  </div>
                </div>
              )}
              
              {ready && (
                <div className="flex items-center gap-2">
                  <div className="text-green-300 font-semibold">
                    Ready to open!
                  </div>
                  {onOpenPack && (
                    <button
                      onClick={() => onOpenPack(timer.id, timer.pack_type)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm font-medium"
                    >
                      Open
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
