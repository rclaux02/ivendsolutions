import React, { useState, useRef, useEffect } from 'react';
import { useProductsContext } from '../hooks/useProductsContext';

interface SplashScreenContent {
  type: 'image' | 'video';
  src: string;
  name: string;
  order: number;
}

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { refetchProducts } = useProductsContext();
  const [splashScreens, setSplashScreens] = useState<SplashScreenContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSplash, setCurrentSplash] = useState<SplashScreenContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load splash screens from database
  useEffect(() => {
    const loadSplashScreens = async () => {
      try {
        setIsLoading(true);
        console.log('[SplashScreen] Loading splash screens...');
        
        // Intentar cargar desde la base de datos primero
        try {
          const machineCode = localStorage.getItem('FS_COD_MAQ') || '001';
          const splashScreens = await window.electron.ipcRenderer.invoke('splash:getActive', machineCode, '001', '001');
          console.log('[SplashScreen] Database splash screens:', splashScreens);
          
          if (splashScreens && splashScreens.length > 0) {
            console.log('[SplashScreen] Using database splash screens');
            setSplashScreens(splashScreens);
            setCurrentSplash(splashScreens[0]);
          } else {
            // Fallback to splash screens test
            const defaultScreens: SplashScreenContent[] = [
              {
                type: 'image' as const,
                src: './assets/images/splash/splashScreen_1.png',
                name: 'Default Splash 1',
                order: 1
              },
              {
                type: 'image' as const,
                src: './assets/images/splash/splashScreen_2.png',
                name: 'Default Splash 2',
                order: 2
              },
              {
                type: 'image' as const,
                src: './assets/images/splash/splashScreen_3.png',
                name: 'Default Splash 3',
                order: 3
              }
            ];
            
            console.log('[SplashScreen] Using static splash screens as fallback');
            setSplashScreens(defaultScreens);
            setCurrentSplash(defaultScreens[0]);
          }
        } catch (error) {
          console.error('[SplashScreen] Error loading database splash screens:', error);
          
          // Fallback a splash screens estáticos en caso de error
          const defaultScreens: SplashScreenContent[] = [
            {
              type: 'image' as const,
              src: './assets/images/splash/splashScreen_1.png',
              name: 'Default Splash 1',
              order: 1
            },
            {
              type: 'image' as const,
              src: './assets/images/splash/splashScreen_2.png',
              name: 'Default Splash 2',
              order: 2
            },
            {
              type: 'image' as const,
              src: './assets/images/splash/splashScreen_3.png',
              name: 'Default Splash 3',
              order: 3
            }
          ];
          
          console.log('[SplashScreen] Using static splash screens due to error');
          setSplashScreens(defaultScreens);
          setCurrentSplash(defaultScreens[0]);
        }
        
      } catch (error) {
        console.error('[SplashScreen] Error loading splash screens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSplashScreens();
    refetchProducts();
  }, [refetchProducts]);

  // Handle splash screen sequence
  useEffect(() => {
    if (!currentSplash || splashScreens.length === 0) return;

    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (currentSplash.type === 'image') {
      // For images, show for 8 seconds then advance
      timerRef.current = setTimeout(() => {
        advanceToNextItem();
      }, 8000);
    } else if (currentSplash.type === 'video') {
      // For videos, play for their full duration then advance
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.currentTime = 0;
        // Only loop if there is only one splash screen
        if (splashScreens.length === 1) {
          videoElement.loop = true;
          videoElement.onended = null; // No advance for single video
        } else {
          videoElement.loop = false;
          videoElement.onended = () => {
            advanceToNextItem();
          };
        }
        videoElement.play().catch(error => {
          console.error('Error playing video:', error);
          timerRef.current = setTimeout(() => {
            advanceToNextItem();
          }, 8000);
        });
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [currentSplash, splashScreens.length]);

  const advanceToNextItem = () => {
    if (splashScreens.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % splashScreens.length;
    setCurrentIndex(nextIndex);
    setCurrentSplash(splashScreens[nextIndex]);
  };

  const handleUserInteraction = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (videoRef.current) {
      videoRef.current.onended = null;
      videoRef.current.pause();
    }
    
    onComplete();
  };

  if (isLoading) {
    console.log('[SplashScreen] Loading state - showing loading screen');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  if (!currentSplash) {
    console.log('[SplashScreen] No current splash - showing no splash screen message');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-white text-2xl">No hay splash screens disponibles</div>
      </div>
    );
  }

  console.log('[SplashScreen] Rendering splash screen:', currentSplash);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer splash-screen-container"
      onClick={handleUserInteraction}
      onTouchStart={handleUserInteraction}
    >
      {currentSplash.type === 'image' ? (
        <img 
          src={currentSplash.src} 
          alt={currentSplash.name} 
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
      
      <div className="absolute bottom-10 left-0 right-0 text-center">
        <p className="text-black text-2xl font-bold drop-shadow-lg animate-pulse bg-white/50 rounded-md px-4 py-2 inline-block">
          Toca la pantalla para continuar
        </p>
      </div>
    </div>
  );
};

export default SplashScreen; 
