/**
 * useCountdownTimer Hook
 * Reusable countdown timer for battle phases
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { UseCountdownTimerReturn } from './types';

/**
 * Custom hook for countdown timer functionality
 */
export function useCountdownTimer(
  onComplete?: () => void,
  onTick?: (seconds: number) => void
): UseCountdownTimerReturn {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  /**
   * Start the countdown timer
   */
  const start = useCallback((initialSeconds: number) => {
    if (initialSeconds <= 0) {
      setIsComplete(true);
      return;
    }

    setSeconds(initialSeconds);
    setIsActive(true);
    setIsComplete(false);
    
    console.log(`Starting countdown timer: ${initialSeconds} seconds`);
  }, []);

  /**
   * Stop the countdown timer
   */
  const stop = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log('Countdown timer stopped');
  }, []);

  /**
   * Reset the countdown timer
   */
  const reset = useCallback(() => {
    stop();
    setSeconds(0);
    setIsComplete(false);
    console.log('Countdown timer reset');
  }, [stop]);

  /**
   * Pause the countdown timer
   */
  const pause = useCallback(() => {
    setIsActive(false);
    console.log('Countdown timer paused');
  }, []);

  /**
   * Resume the countdown timer
   */
  const resume = useCallback(() => {
    if (seconds > 0 && !isComplete) {
      setIsActive(true);
      console.log('Countdown timer resumed');
    }
  }, [seconds, isComplete]);

  // Handle the countdown logic
  useEffect(() => {
    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          const newSeconds = prevSeconds - 1;
          
          // Call onTick callback
          if (onTickRef.current) {
            onTickRef.current(newSeconds);
          }
          
          // Check if countdown is complete
          if (newSeconds <= 0) {
            setIsActive(false);
            setIsComplete(true);
            
            // Call onComplete callback
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
            
            console.log('Countdown timer completed');
            return 0;
          }
          
          return newSeconds;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, seconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    seconds,
    isActive,
    isComplete,
    start,
    stop,
    reset,
    pause,
    resume
  };
}

/**
 * Hook variant with automatic start
 */
export function useAutoCountdownTimer(
  initialSeconds: number,
  onComplete?: () => void,
  onTick?: (seconds: number) => void
): UseCountdownTimerReturn {
  const timer = useCountdownTimer(onComplete, onTick);

  useEffect(() => {
    if (initialSeconds > 0) {
      timer.start(initialSeconds);
    }
  }, [initialSeconds, timer]);

  return timer;
}

/**
 * Hook variant with formatted time display
 */
export function useFormattedCountdownTimer(
  onComplete?: () => void,
  onTick?: (seconds: number) => void
) {
  const timer = useCountdownTimer(onComplete, onTick);

  const formatTime = useCallback((totalSeconds: number): string => {
    if (totalSeconds <= 0) return '0:00';
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...timer,
    formattedTime: formatTime(timer.seconds),
    formatTime
  };
}

/**
 * Hook variant with warning thresholds
 */
export function useCountdownTimerWithWarnings(
  warningThresholds: number[] = [30, 10, 5],
  onComplete?: () => void,
  onWarning?: (seconds: number) => void
): UseCountdownTimerReturn {
  const [warningsTriggered, setWarningsTriggered] = useState<Set<number>>(new Set());
  
  const handleTick = useCallback((seconds: number) => {
    // Check for warning thresholds
    warningThresholds.forEach(threshold => {
      if (seconds === threshold && !warningsTriggered.has(threshold)) {
        setWarningsTriggered(prev => new Set(prev).add(threshold));
        if (onWarning) {
          onWarning(seconds);
        }
        console.log(`Countdown warning: ${seconds} seconds remaining`);
      }
    });
  }, [warningThresholds, warningsTriggered, onWarning]);

  const timer = useCountdownTimer(onComplete, handleTick);

  // Reset warnings when timer starts
  const startWithWarnings = useCallback((initialSeconds: number) => {
    setWarningsTriggered(new Set());
    timer.start(initialSeconds);
  }, [timer]);

  return {
    ...timer,
    start: startWithWarnings
  };
}