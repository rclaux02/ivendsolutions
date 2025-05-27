import React, { useState, useEffect, useRef } from 'react';
import { useProductsContext } from '../hooks/useProductsContext';

// Import assets directly
// import dummySplashVideo_1 from '../assets/images/splash/dummySplashVideo_1.mp4';
// import dummySplashVideo_2 from '../assets/images/splash/dummySplashVideo_2.mp4';
import splashScreen_1 from '../assets/images/splash/splashScreen_1.png';
import splashScreen_2 from '../assets/images/splash/splashScreen_2.png';
import splashScreen_3 from '../assets/images/splash/splashScreen_3.png';

// Define types for splash screen content
type SplashScreenType = 'image' | 'video';

interface SplashScreenContent {
  type: SplashScreenType;
  src: string;
}

interface SplashScreenProps {
  onComplete: () => void;
}

// Define splash screen content in the specific sequence order
const splashScreenSequence: SplashScreenContent[] = [
  // { type: 'video', src: dummySplashVideo_1 },
  // { type: 'video', src: dummySplashVideo_2 },
  { type: 'image', src: splashScreen_1 },
  { type: 'image', src: splashScreen_2 },
  { type: 'image', src: splashScreen_3 },
];

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  // Get the context with refetch function
  const { refetchProducts } = useProductsContext();
  
  // State to track the current item in the sequence
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSplash, setCurrentSplash] = useState<SplashScreenContent>(splashScreenSequence[0]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Trigger refetch when splash screen is shown
  useEffect(() => {
    console.log('[SplashScreen] Mounted, starting product fetch');
    refetchProducts();
    
    // Add a global capture event listener
    const captureEvents = (e: Event) => {
      // This will catch events at the document level during capture phase
      if (e.target && (e.target as HTMLElement).closest('.splash-screen-container')) {
        e.stopPropagation();
      }
    };
    
    document.addEventListener('mousedown', captureEvents, true);
    document.addEventListener('touchstart', captureEvents, true);
    
    return () => {
      document.removeEventListener('mousedown', captureEvents, true);
      document.removeEventListener('touchstart', captureEvents, true);
    };
  }, [refetchProducts]);
  
  // Function to advance to the next item in the sequence
  const advanceToNextItem = () => {
    const nextIndex = (currentIndex + 1) % splashScreenSequence.length;
    setCurrentIndex(nextIndex);
    setCurrentSplash(splashScreenSequence[nextIndex]);
  };
  
  // Effect to handle the current splash screen item
  useEffect(() => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    const currentItem = splashScreenSequence[currentIndex];
    
    if (currentItem.type === 'image') {
      // For images, show for 8 seconds then advance
      timerRef.current = setTimeout(() => {
        advanceToNextItem();
      }, 8000);
    } else if (currentItem.type === 'video') {
      // For videos, play for their full duration then advance
      const videoElement = videoRef.current;
      if (videoElement) {
        // Reset video to beginning
        videoElement.currentTime = 0;
        
        // Set up event to advance when video ends
        videoElement.onended = () => {
          advanceToNextItem();
        };
        
        // Make sure video starts playing
        videoElement.play().catch(error => {
          console.error('Error playing video:', error);
          // Fallback to timeout if video fails to play
          timerRef.current = setTimeout(() => {
            advanceToNextItem();
          }, 8000);
        });
      }
    }
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.onended = null;
        videoRef.current.pause();
      }
    };
  }, [currentIndex]);
  
  // Handle user touch/click to exit splash screen
  const handleUserInteraction = (event: React.MouseEvent | React.TouchEvent) => {
    // Aggressively prevent event propagation
    event.preventDefault();
    event.stopPropagation();
    
    // Also use the native DOM method which is stronger
    event.nativeEvent.stopImmediatePropagation();
    
    // Clear any timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Stop video if playing
    if (videoRef.current) {
      videoRef.current.onended = null;
      videoRef.current.pause();
    }
    
    // Call the transition function
    onComplete();
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer splash-screen-container"
      onClick={handleUserInteraction}
      onTouchStart={handleUserInteraction}
    >
      {currentSplash.type === 'image' ? (
        <img 
          src={currentSplash.src} 
          alt="Welcome to Vape Vending" 
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <video 
          ref={videoRef}
          src={currentSplash.src}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
      )}
      
      {/* Optional: Add a hint for users to touch the screen */}
      <div className="absolute bottom-10 left-0 right-0 text-center">
        <p className="text-white text-2xl font-bold drop-shadow-lg animate-pulse">
          Toca la pantalla para continuar
        </p>
      </div>
    </div>
  );
};

export default SplashScreen; 