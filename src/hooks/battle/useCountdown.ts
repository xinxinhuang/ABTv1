'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseCountdownReturn {
  seconds: number;
  isActive: boolean;
  start: (initialSeconds: number, onComplete?: () => void) => void;
  stop: () => void;
  reset: () => void;
}

export const useCountdown = (): UseCountdownReturn => {
  const [seconds, setSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);

  const stop = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setSeconds(0);
    onCompleteRef.current = undefined;
  }, [stop]);

  const start = useCallback((initialSeconds: number, onComplete?: () => void) => {
    // Clear any existing interval
    stop();
    
    setSeconds(initialSeconds);
    setIsActive(true);
    onCompleteRef.current = onComplete;

    intervalRef.current = setInterval(() => {
      setSeconds(prevSeconds => {
        if (prevSeconds <= 1) {
          // Countdown complete
          setIsActive(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // Call completion callback if provided
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
          
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);
  }, [stop]);

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
    start,
    stop,
    reset,
  };
};