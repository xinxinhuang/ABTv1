import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../useCountdown';

// Mock timers
jest.useFakeTimers();

describe('useCountdown', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCountdown());
    
    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('should start countdown with initial seconds', () => {
    const { result } = renderHook(() => useCountdown());
    
    act(() => {
      result.current.start(5);
    });

    expect(result.current.seconds).toBe(5);
    expect(result.current.isActive).toBe(true);
  });

  it('should countdown properly', () => {
    const { result } = renderHook(() => useCountdown());
    
    act(() => {
      result.current.start(3);
    });

    expect(result.current.seconds).toBe(3);

    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(2);

    // Advance timer by another second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(1);
  });

  it('should complete countdown and call onComplete callback', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useCountdown());
    
    act(() => {
      result.current.start(2, onComplete);
    });

    // Advance timer to completion
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('should stop countdown', () => {
    const { result } = renderHook(() => useCountdown());
    
    act(() => {
      result.current.start(5);
    });

    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isActive).toBe(false);
    
    // Timer should not advance after stopping
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(5); // Should remain at last value
  });

  it('should reset countdown', () => {
    const { result } = renderHook(() => useCountdown());
    
    act(() => {
      result.current.start(5);
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.seconds).toBe(3);

    act(() => {
      result.current.reset();
    });

    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('should handle multiple start calls by clearing previous timer', () => {
    const onComplete1 = jest.fn();
    const onComplete2 = jest.fn();
    const { result } = renderHook(() => useCountdown());
    
    act(() => {
      result.current.start(5, onComplete1);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.seconds).toBe(4);

    // Start new countdown - should clear previous
    act(() => {
      result.current.start(3, onComplete2);
    });

    expect(result.current.seconds).toBe(3);

    // Complete the second countdown
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onComplete1).not.toHaveBeenCalled();
    expect(onComplete2).toHaveBeenCalledTimes(1);
  });
});