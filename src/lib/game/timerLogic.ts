/**
 * Calculates the number of hours that have passed since the timer started.
 */
export function calculateRemainingSeconds(startTime: string, targetDelayHours: number): number {
  const now = new Date().getTime();
  const start = new Date(startTime).getTime();
  const endTime = start + targetDelayHours * 60 * 60 * 1000;
  const remainingMilliseconds = endTime - now;
  return Math.max(0, Math.floor(remainingMilliseconds / 1000));
}

/**
 * Checks if a timer has completed.
 */
export function isTimerReady(remainingSeconds: number): boolean {
  return remainingSeconds <= 0;
}

/**
 * Formats the remaining time into a HH:MM:SS string.
 */
export function formatTimeRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return '00:00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
