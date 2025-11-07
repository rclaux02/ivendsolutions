import React, { useState, createContext, useEffect, useCallback, useContext } from 'react';
import ProductSelection from './screens/ProductSelection';
import './styles/global.css';
import { CartProvider, useCart } from './hooks/useCart';
import SplashScreen from './components/SplashScreen';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import ViewportScaler from './components/ViewportScaler';
import { ProductsProvider } from './hooks/useProductsContext';
import LicenseModal from './components/LicenseModal';

// Define the shape of the context
interface AppNavigationContextType {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
  resetToSplashScreen: () => void;
  isTimerPaused: boolean;
  setIsTimerPaused: (paused: boolean) => void;
}

// Create the context
export const AppNavigationContext = React.createContext<AppNavigationContextType>(
  {
    currentScreen: 'splash',
    navigateTo: () => {},
    resetToSplashScreen: () => {},
    isTimerPaused: false,
    setIsTimerPaused: () => {},
  }
);

// Define the possible screens
type Screen = 'splash' | 'product-selection';

// New Inner Component
const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { clearCart } = useCart();
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  const navigateTo = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  // Handler to reset to splash screen - now calls clearCart
  const resetToSplashScreen = useCallback(() => {
    console.log('Resetting to splash screen');
    window.sessionStorage.clear();
    clearCart();
    console.log('[App] Cleared entire sessionStorage and cart state');
    setCurrentScreen('splash');
  }, [clearCart]);

  // Clear session storage on initial load too
  useEffect(() => {
    if (currentScreen === 'splash') {
      console.log('[App] Ensured sessionStorage cleared on splash screen load');
    }
  }, [currentScreen]);

  useEffect(() => {
    const code = localStorage.getItem('FS_COD_MAQ');
    if (!code) setShowLicenseModal(true);
  }, []);

  const handleLicenseSuccess = (code: string) => {
    localStorage.setItem('FS_COD_MAQ', code);
    setShowLicenseModal(false);
  };

  // --- Inactivity Timer --- 
  const INACTIVITY_TIMEOUT_MS = 30 * 1000; // 30 seconds

  // State to control if timer should be paused (e.g., during payment)
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  useInactivityTimer(
    INACTIVITY_TIMEOUT_MS,
    resetToSplashScreen,
    currentScreen !== 'splash' && !isTimerPaused
  );
  // --- End Inactivity Timer ---

  // Reset transitioning state after screen change
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isTransitioning]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onComplete={() => navigateTo('product-selection')} />;
      case 'product-selection':
        return (
          <div className="h-full w-full">
            {isTransitioning && (
              <div className="fixed inset-0 z-50 bg-transparent" />
            )}
            <ProductSelection />
          </div>
        );
      default:
        return <SplashScreen onComplete={() => navigateTo('product-selection')} />;
    }
  };

  // Provide the navigation context value
  const navigationContextValue = {
    currentScreen,
    navigateTo,
    resetToSplashScreen,
    isTimerPaused,
    setIsTimerPaused,
  };

  return (
    <AppNavigationContext.Provider value={navigationContextValue}>
      {/* <ViewportScaler> */}
        <div className="app-container h-screen w-screen">
          {renderScreen()}
          <LicenseModal isOpen={showLicenseModal} onSuccess={handleLicenseSuccess} />
          {process.env.NODE_ENV === 'development' && (
            <button
              style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 3000,
                background: '#FF4747',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '0.75rem 1.5rem',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                opacity: 0.85
              }}
              onClick={() => {
                localStorage.removeItem('FS_COD_MAQ');
                window.location.reload();
              }}
              title="Borrar licencia (solo desarrollo)"
            >
              Borrar Licencia
            </button>
          )}
        </div>
      {/* </ViewportScaler> */}
    </AppNavigationContext.Provider>
  );
};

// Main App Component just sets up providers
const App: React.FC = () => {
  return (
    <ProductsProvider>
      <CartProvider>
        <AppContent /> 
      </CartProvider>
    </ProductsProvider>
  );
};

export default App;