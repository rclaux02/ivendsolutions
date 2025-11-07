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

  const handleActivity = useCallback((event?: Event) => {
    // Log activity for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[InactivityTimer] Activity detected: ${event?.type || 'unknown'}`);
    }
    
    // Reset the timer on any activity
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
      'touchend',
      'touchmove',
      'keydown',
      'scroll',
      'click',
      'pointerdown',
      'pointermove',
      'pointerup',
    ];
    
    // Additional touch-specific events for better coverage
    const touchEvents = ['gesturestart', 'gesturechange', 'gestureend'];

    // Add event listeners with better touch support
    activityEvents.forEach(event => {
      // Use passive: true for better performance on touch devices
      const options = event.startsWith('touch') ? { passive: true, capture: true } : { passive: true };
      window.addEventListener(event, handleActivity, options);
      // Also add to document for better touch coverage
      document.addEventListener(event, handleActivity, options);
    });
    
    // Add touch-specific events
    touchEvents.forEach(event => {
      window.addEventListener(event as keyof WindowEventMap, handleActivity, { capture: true });
      document.addEventListener(event as keyof DocumentEventMap, handleActivity, { capture: true });
    });

    // Initial timer start
    resetTimer();
    
    // Add specific pointer event listener for better touch support
    const handlePointerActivity = (event: Event) => {
      const pointerEvent = event as PointerEvent;
      // Only handle touch/pen events, ignore mouse events
      if (pointerEvent.pointerType === 'touch' || pointerEvent.pointerType === 'pen') {
        handleActivity(event);
      }
    };
    
    document.addEventListener('pointerdown', handlePointerActivity, { capture: true });
    document.addEventListener('pointermove', handlePointerActivity, { capture: true });
    document.addEventListener('pointerup', handlePointerActivity, { capture: true });

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach(event => {
        const options = event.startsWith('touch') ? { passive: true, capture: true } : { passive: true };
        window.removeEventListener(event, handleActivity, options);
        document.removeEventListener(event, handleActivity, options);
      });
      
      // Remove touch-specific events
      touchEvents.forEach(event => {
        window.removeEventListener(event as keyof WindowEventMap, handleActivity, { capture: true });
        document.removeEventListener(event as keyof DocumentEventMap, handleActivity, { capture: true });
      });
      
      // Clean up pointer event listeners
      document.removeEventListener('pointerdown', handlePointerActivity, { capture: true });
      document.removeEventListener('pointermove', handlePointerActivity, { capture: true });
      document.removeEventListener('pointerup', handlePointerActivity, { capture: true });
    };
  }, [handleActivity, resetTimer, active]); // Rerun effect if activity handler or active status changes
}; 