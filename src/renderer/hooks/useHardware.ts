import { useEffect, useState, useCallback } from 'react';

export enum HardwareChannel {
  INITIALIZE = 'hardware:initialize',
  STATUS = 'hardware:status',
  DISPENSE_PRODUCT = 'hardware:dispense-product',
  VERIFY_AGE = 'hardware:verify-age',
  ERROR = 'hardware:error',
  PRODUCT_DISPENSED = 'hardware:product-dispensed',
  ARDUINO_STATUS_UPDATE = 'hardware:arduino-status-update',
  SENSOR_STATUS = 'hardware:sensor-status',
  TEMPERATURE_UPDATE = 'temperature:update', // 🌡️ AGREGAR CANAL DE TEMPERATURA
  IZIPAY_LOGIN = 'izipay:login',
  IZIPAY_TRANSACTION = 'izipay:process-transaction',
  IZIPAY_TEST_PORT = 'izipay:test-port',
  IZIPAY_LIST_PORTS = 'izipay:list-ports',
  IZIPAY_TEST_API = 'izipay:test-api'
}

export interface HardwareStatus {
  arduino?: {
    connected: boolean;
    portPath?: string;
    attemptedPorts?: string[];
    temperature?: number;
    humidity?: number;
    slots?: Record<string, string>;
  };
  izipay?: {
    connected: boolean;
    portPath?: string;
  };
}

export interface DispenseResult {
  success: boolean;
  message?: string;
  sensorActivated?: boolean;
}

export interface AgeVerificationResult {
  success: boolean;
  age?: number;
  message?: string;
}

export interface SensorStatusResult {
  success: boolean;
  message?: string;
  timestamp: number;
}

export interface IzipayTransaction {
  ecr_aplicacion: string;
  ecr_transaccion: string;
  ecr_amount: string;
  ecr_currency_code: string
}

// Get IPC renderer via the Electron bridge
const getIpcRenderer = () => {
  try {
    console.log('=== Starting getIpcRenderer ===');
    
    // Check if window.electron exists (using contextIsolation)
    if (!window.electron) {
      console.error('Electron bridge not found. Make sure preload script is correctly configured.');
      return null;
    }
    
    // Get the ipcRenderer from window.electron bridge
    const ipcRenderer = window.electron.ipcRenderer;
    
    if (!ipcRenderer) {
      console.error('IPC renderer not found in electron bridge');
      return null;
    }

    console.log('Successfully accessed IPC renderer via Electron bridge');
    console.log('=== End getIpcRenderer ===');
    return ipcRenderer;
  } catch (e) {
    console.error('Error accessing electron bridge:', e);
    console.error('Error stack:', e instanceof Error ? e.stack : 'No stack trace');
    return null;
  }
};

export const useHardware = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<HardwareStatus | undefined>(undefined);
  const [isVerifyingAge, setIsVerifyingAge] = useState(false);
  const [ageVerificationResult, setAgeVerificationResult] = useState<AgeVerificationResult | null>(null);
  const [ipc, setIpc] = useState<any>(null);
  const [bridgeAvailable, setBridgeAvailable] = useState<boolean>(false);
  const [productDispensed, setProductDispensed] = useState<boolean>(false);
  const [sensorActivated, setSensorActivated] = useState<boolean | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null); // 🌡️ NUEVO ESTADO

  // Initialize IPC on mount
  useEffect(() => {
    console.log('=== Starting useHardware useEffect ===');
    console.log('Document readyState:', document.readyState);
    console.log('Current window:', window);

    let cleanupIPC: (() => void) | undefined;

    const handleDOMContentLoaded = () => {
      console.log('DOMContentLoaded event fired');
      cleanupIPC = initializeBridge(); // Store the cleanup function
    };

    // Wait for DOM content to be loaded
    if (document.readyState === 'loading') {
      console.log('Document still loading, adding DOMContentLoaded listener');
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    } else {
      console.log('Document already loaded, initializing bridge immediately');
      cleanupIPC = initializeBridge(); // Store the cleanup function
    }

    return () => {
      console.log('Cleaning up useHardware useEffect');
      // Remove the DOM listener if it was added
      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      // Call the IPC cleanup function if it exists
      if (cleanupIPC) {
        console.log('Executing IPC cleanup');
        cleanupIPC();
      }
    };
  }, []); // Keep empty dependency array

  const initializeBridge = (): (() => void) | undefined => { // Ensure return type
    console.log('=== Starting initializeBridge ===');
    const ipcRenderer = getIpcRenderer();
    
    if (ipcRenderer) {
      console.log('IPC bridge successfully initialized');
      setIpc(ipcRenderer);
      setBridgeAvailable(true);
      
      // Set up listeners
      const statusListener = (status: HardwareStatus) => {
        console.log('Status update received:', status);
        setStatus(status);
      };

      const errorListener = (error: string) => {
        console.log('Error received:', error);
        setError(error);
      };

      const productDispensedListener = (result: DispenseResult) => {
        console.log('Product dispensed event received:', result);
        setProductDispensed(true);
        setSensorActivated(result.sensorActivated || false);
      };

      const sensorStatusListener = (result: SensorStatusResult) => {
        console.log('Sensor status event received:', result);
        setSensorActivated(result.success);
      };

      const arduinoStatusListener = (status: 'idle' | 'motor-on' | 'sensor-on' | 'dispensed') => {
        console.log('Arduino status update received:', status);
        // Emitir evento personalizado para que ProductSelection pueda escucharlo
        window.dispatchEvent(new CustomEvent('arduino-status-update', { detail: status }));
      };

      // 🌡️ TEMPERATURE LISTENER
      const temperatureListener = (temperature: number) => {
        console.log(`[HARDWARE HOOK] 🌡️ Temperature update received: ${temperature}°C`);
        setTemperature(temperature);
      };

      console.log('Setting up IPC listeners');
      const unsubscribeStatus = ipcRenderer.on(HardwareChannel.STATUS, statusListener);
      const unsubscribeError = ipcRenderer.on(HardwareChannel.ERROR, errorListener);
      const unsubscribeProductDispensed = ipcRenderer.on(HardwareChannel.PRODUCT_DISPENSED, productDispensedListener);
      const unsubscribeSensorStatus = ipcRenderer.on(HardwareChannel.SENSOR_STATUS, sensorStatusListener);
      const unsubscribeArduinoStatus = ipcRenderer.on(HardwareChannel.ARDUINO_STATUS_UPDATE, arduinoStatusListener);
      const unsubscribeTemperature = ipcRenderer.on(HardwareChannel.TEMPERATURE_UPDATE, temperatureListener);

      return () => {
        console.log('Cleaning up IPC listeners');
        if (ipcRenderer) {
          if (unsubscribeStatus) unsubscribeStatus();
          if (unsubscribeError) unsubscribeError();
          if (unsubscribeProductDispensed) unsubscribeProductDispensed();
          if (unsubscribeSensorStatus) unsubscribeSensorStatus();
          if (unsubscribeArduinoStatus) unsubscribeArduinoStatus();
          if (unsubscribeTemperature) unsubscribeTemperature(); // ️ NUEVA LIMPIEZA
        }
      };
    } else {
      console.error('Failed to initialize IPC bridge');
      setError('Failed to initialize IPC bridge. Hardware features will not work.');
      setBridgeAvailable(false);
      return undefined; // Return undefined if bridge setup failed
    }
    console.log('=== End initializeBridge ===');
  };

  const initialize = async () => {
    if (!ipc) {
      setError('IPC not available');
      return false;
    }

    try {
      setIsInitializing(true);
      setError(null);
      const result = await ipc.invoke(HardwareChannel.INITIALIZE);
      setIsInitialized(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize hardware';
      setError(errorMessage);
      return false;
    } finally {
      setIsInitializing(false);
    }
  };

  const dispenseProduct = async (slotId: string): Promise<DispenseResult> => {
    if (!ipc) {
      console.error('IPC not available for product dispensing');
      return { success: false, message: 'IPC not available' };
    }

    try {
      setError(null);
      return await ipc.invoke(HardwareChannel.DISPENSE_PRODUCT, slotId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to dispense product';
      setError(errorMessage);
      console.error('Error dispensing product:', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const verifyAge = async (documentData: any): Promise<AgeVerificationResult> => {
    if (!ipc) {
      return { success: false, message: 'IPC not available' };
    }

    try {
      setIsVerifyingAge(true);
      setError(null);
      const result = await ipc.invoke(HardwareChannel.VERIFY_AGE, documentData);
      setAgeVerificationResult(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify age';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsVerifyingAge(false);
    }
  };

  const izipayService = {
    login: async (username: string, password: string): Promise<boolean> => {
      if (!ipc) {
        console.error('IPC bridge not available for IziPay login');
        setError('IPC bridge not available');
        return false;
      }
      //me quede en que me bota ok el login con el resultado 00 y mensaje OK. ahora tengo que agarrar ese token en el res del login request y usarlo para las trasnacciones.
      try {
        setError(null);
        console.log('IPC object:', ipc);
        console.log('Attempting IziPay login with channel:', HardwareChannel.IZIPAY_LOGIN);
        console.log('Credentials:', { username, password });
        
        // Use invoke method directly from the ipc object
        const result = await ipc.invoke(HardwareChannel.IZIPAY_LOGIN, { username, password });
        console.log('IziPay login result:', result);
        
        if (!result) {
          setError('IziPay login failed');
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('IziPay login error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to login to IziPay';
        setError(errorMessage);
        return false;
      }
    },

    processTransaction: async (transaction: IzipayTransaction): Promise<any> => {
      if (!ipc) {
        console.error('IPC bridge not available for IziPay transaction');
        setError('IPC bridge not available');
        throw new Error('IPC bridge not available');
      }

      try {
        console.log('=== TRANSACTION FLOW [3] ===');
        console.log('Processing transaction in useHardware');
        console.log('Transaction data:', transaction);
        
        setError(null);
        
        // Use invoke method directly from the ipc object
        console.log('=== TRANSACTION FLOW [4] ===');
        const result = await ipc.invoke(HardwareChannel.IZIPAY_TRANSACTION, transaction);
        
        console.log('=== TRANSACTION FLOW [6] ===');
        console.log('IPC transaction result received:', result);
        return result;
      } catch (error) {
        console.error('IziPay transaction error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process transaction';
        setError(errorMessage);
        throw error;
      }
    },

    // New method to list all available COM ports
    listPorts: async (): Promise<string[]> => {
      if (!ipc) {
        console.error('IPC bridge not available for listing COM ports');
        setError('IPC bridge not available');
        return [];
      }

      try {
        // Minimal logging here to prevent console spam
        const result = await ipc.invoke(HardwareChannel.IZIPAY_LIST_PORTS);
        
        if (result.success) {
          return result.ports;
        }
        
        setError(result.error || 'Failed to list COM ports');
        return [];
      } catch (error) {
        console.error('Error listing COM ports:', error);
        setError(error instanceof Error ? error.message : 'Failed to list COM ports');
        return [];
      }
    },

    // New method to test a specific COM port
    testPort: async (portPath: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      if (!ipc) {
        console.error('IPC bridge not available for testing COM port');
        setError('IPC bridge not available');
        return { success: false, error: 'IPC bridge not available' };
      }

      try {
        console.log(`Testing COM port: ${portPath}`);
        const result = await ipc.invoke(HardwareChannel.IZIPAY_TEST_PORT, portPath);
        console.log('Port test result:', result);
        return result;
      } catch (error) {
        console.error(`Error testing COM port ${portPath}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to test COM port';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },

    // New method to test the API directly with the exact params that work in Postman
    testApiDirectly: async (postmanData: any): Promise<any> => {
      if (!ipc) {
        console.error('IPC bridge not available for API testing');
        setError('IPC bridge not available');
        throw new Error('IPC bridge not available');
      }

      try {
        console.log('=== DIRECT API TEST FLOW ===');
        console.log('Testing API directly with Postman-verified parameters');
        console.log('Test data:', postmanData);
        
        setError(null);
        
        // Use invoke method directly with the data that works in Postman
        const result = await ipc.invoke(HardwareChannel.IZIPAY_TEST_API, postmanData);
        
        console.log('=== DIRECT API TEST RESULT ===');
        console.log('API test result received:', result);
        return result;
      } catch (error) {
        console.error('API direct test error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to test API directly';
        setError(errorMessage);
        throw error;
      }
    }
  };

  const resetProductDispensed = useCallback(() => {
    setProductDispensed(false);
  }, []);

  const resetSensorActivated = useCallback(() => {
    setSensorActivated(null);
  }, []);

  const resetError = () => setError(null);

  return {
    isInitialized,
    isInitializing,
    error,
    status,
    isVerifyingAge,
    ageVerificationResult,
    productDispensed,
    sensorActivated,
    temperature, // 🌡️ NUEVA PROPIEDAD
    initialize,
    dispenseProduct,
    verifyAge,
    izipayService,
    resetError,
    resetProductDispensed,
    resetSensorActivated,
    bridgeAvailable
  };
}; 