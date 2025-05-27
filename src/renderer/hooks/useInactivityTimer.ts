import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to detect user inactivity and trigger a callback.
 *
 * @param timeout Duration in milliseconds after which the user is considered inactive.
 * @param onTimeout Callback function to execute when the timeout occurs.
 * @param active Boolean indicating whether the timer should be running.
 */
export const useInactivityTimer = (timeout: number, onTimeout: () => void, active: boolean = true) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (active) {
      timeoutRef.current = setTimeout(onTimeout, timeout);
    }
  }, [timeout, onTimeout, active]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!active) {
      // Clear existing timer if deactivated
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // List of events that indicate user activity
    const activityEvents: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'touchstart',
      'keydown',
      'scroll',
      'click',
    ];

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initial timer start
    resetTimer();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [handleActivity, resetTimer, active]); // Rerun effect if activity handler or active status changes
}; 