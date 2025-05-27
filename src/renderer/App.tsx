import React, { useState, createContext, useEffect, useCallback, useContext } from 'react';
import ProductSelection from './screens/ProductSelection';
import './styles/global.css';
import { CartProvider, useCart } from './hooks/useCart';
import SplashScreen from './components/SplashScreen';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import ViewportScaler from './components/ViewportScaler';
import { ProductsProvider } from './hooks/useProductsContext';

// Define the shape of the context
interface AppNavigationContextType {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
  resetToSplashScreen: () => void;
}

// Create the context
export const AppNavigationContext = React.createContext<AppNavigationContextType>(
  {
    currentScreen: 'splash',
    navigateTo: () => {},
    resetToSplashScreen: () => {},
  }
);

// Define the possible screens
type Screen = 'splash' | 'product-selection';

// New Inner Component
const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { clearCart } = useCart();

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

  // --- Inactivity Timer --- 
  const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

  useInactivityTimer(
    INACTIVITY_TIMEOUT_MS,
    resetToSplashScreen,
    currentScreen !== 'splash'
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
  };

  return (
    <AppNavigationContext.Provider value={navigationContextValue}>
      {/* <ViewportScaler> */}
        <div className="app-container h-screen w-screen">
          {renderScreen()}
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