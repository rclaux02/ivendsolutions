import { useState, useCallback } from 'react';
// Remove direct require of electron - this is causing the error
// const { ipcRenderer } = require('electron');

// Use a helper function to get IPC renderer safely through the preload bridge
const getIpcRenderer = () => {
  try {
    if (window && (window as any).electron && (window as any).electron.ipcRenderer) {
      return (window as any).electron.ipcRenderer;
    }
    console.error('Electron IPC bridge not found in useRappi');
    return null;
  } catch (e) {
    console.error('Error accessing electron in useRappi:', e);
    return null;
  }
};

/**
 * Interface for Rappi handshake response
 */
interface RappiHandshakeResponse {
  codes: string[];
  expires_at: string;
}

/**
 * Interface for Rappi handshake verification request
 */
interface RappiHandshakeVerificationRequest {
  order_id: string;
  handshake_code: string;
}

/**
 * Interface for Rappi handshake verification response
 */
interface RappiHandshakeVerificationResponse {
  success: boolean;
  order_id: string;
  product_id?: string;
  slot_id?: string;
  message?: string;
  details?: {
    codes?: string[];
    expires_at?: string;
    retries_left?: number;
  };
}

/**
 * Hook for interacting with the Rappi API
 */
export const useRappi = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [handshakeData, setHandshakeData] = useState<RappiHandshakeResponse | null>(null);


  /**
   * Authenticate with Rappi API
   */
  const authenticate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) {
        throw new Error('IPC renderer not available');
      }
      
      const { success } = await ipcRenderer.invoke('rappi:authenticate');
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Código inválido, por favor intente nuevamente');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate a handshake for a Rappi order
   * @param orderId The Rappi order ID
   */
  const initiateHandshake = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    setHandshakeData(null);
    
    try {
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) {
        throw new Error('IPC renderer not available');
      }
      
      console.log(`Initiating Rappi handshake for order: ${orderId}`);
      const response = await ipcRenderer.invoke('rappi:initiateHandshake', orderId);
      console.log('Rappi handshake response:', response);
      
      if (response.success && response.data) {
        console.log('Received codes from Rappi:', response.data.codes);
        console.log('Codes expire at:', response.data.expires_at);
        setHandshakeData(response.data);
        return response.data as RappiHandshakeResponse;
      } else {
        const errorMessage = response.error || 'Failed to initiate handshake';
        console.error('Handshake initiation failed:', errorMessage);
        setError('Código inválido, por favor intente nuevamente');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Handshake initiation error: ${errorMessage}`);
      setError('Código inválido, por favor intente nuevamente');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify a handshake code for a Rappi order
   * @param request The handshake verification request
   */
  const verifyHandshake = useCallback(async (request: RappiHandshakeVerificationRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) {
        throw new Error('IPC renderer not available');
      }
      
      const response = await ipcRenderer.invoke('rappi:verifyHandshake', request);
      console.log('Rappi handshake verification response:', response);
      
      if (response.success) {
        console.log('Handshake verification successful, slot ID:', response.slot_id);
        return response as RappiHandshakeVerificationResponse;
      } else {
        console.error('Handshake verification failed:', response.message);
        if (response.details && response.details.codes) {
          console.log('New codes provided:', response.details.codes);
          console.log('Retries left:', response.details.retries_left);
        }
        setError('Código inválido, por favor intente nuevamente');
        return response as RappiHandshakeVerificationResponse;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Handshake verification error: ${errorMessage}`);
      setError('Código inválido, por favor intente nuevamente');
      
      return {
        success: false,
        order_id: request.order_id,
        message: errorMessage
      } as RappiHandshakeVerificationResponse;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Verify and dispense product for a Rappi order
   * This is a convenience method that combines verification and dispensing
   * @param orderId The Rappi order ID
   * @param handshakeCode The handshake code
   */
  const verifyAndDispense = useCallback(async (orderId: string, handshakeCode: string) => {
    console.log(`[useRappi] verifyAndDispense called for order ${orderId}`);
    setIsLoading(true);
    setError(null);
    
    try {
      // First verify the handshake
      const verificationResult = await verifyHandshake({ order_id: orderId, handshake_code: handshakeCode });
      
      if (!verificationResult.success) {
        setError('Código inválido, por favor intente nuevamente');
        return {
          success: false,
          message: 'Código inválido, por favor intente nuevamente'
        };
      }
      
      // If we have a slot_id, we can dispense the product
      if (verificationResult.slot_id) {
        try {
          // Get the ipcRenderer using our helper function
          const ipcRenderer = getIpcRenderer();
          if (!ipcRenderer) {
            console.error('Electron IPC bridge not found');
            
            return {
              success: false,
              message: 'Código inválido, por favor intente nuevamente',
              slotId: verificationResult.slot_id,
              orderId
            };
          }
          
          console.log(`[useRappi] Rappi verification steps complete (if any). Proceeding to hardware dispense.`);

          // Dispense the product using the hardware service
          const dispensingResult = await ipcRenderer.invoke('hardware:dispense-product', verificationResult.slot_id);
          
          console.log(`[useRappi] hardwareService.dispenseProduct completed. Result:`, dispensingResult);

          // Generate Rappi inventory file after successful dispensing
          if (dispensingResult.success) {
            try {
              console.log('[RAPPI INVENTORY] Generating inventory file after successful Rappi dispensing...');
              const inventoryResult = await ipcRenderer.invoke('rappi-inventory:generate');
              
              if (inventoryResult.success) {
                console.log('[RAPPI INVENTORY] Inventory file generated successfully:', inventoryResult.filePath);
              } else {
                console.error('[RAPPI INVENTORY] Failed to generate inventory file:', inventoryResult.error);
                // Don't affect the dispensing result - inventory generation failure is not critical
              }
            } catch (inventoryError) {
              console.error('[RAPPI INVENTORY] Error generating inventory file:', inventoryError);
              // Don't affect the dispensing result - inventory generation failure is not critical
            }
          }

          return {
            success: dispensingResult.success,
            message: dispensingResult.message || (dispensingResult.success ? 'Dispensed successfully' : 'Failed to dispense'),
            slotId: verificationResult.slot_id,
            orderId
          };
        } catch (dispensingError) {
          const errorMessage = dispensingError instanceof Error ? dispensingError.message : 'Unknown error';
          setError('Código inválido, por favor intente nuevamente');
          
          return {
            success: false,
            message: 'Código inválido, por favor intente nuevamente',
            slotId: verificationResult.slot_id,
            orderId
          };
        }
      } else {
        setError('Código inválido, por favor intente nuevamente');
        
        return {
          success: false,
          message: 'Código inválido, por favor intente nuevamente',
          orderId
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Código inválido, por favor intente nuevamente');
      
      return {
        success: false,
        message: 'Código inválido, por favor intente nuevamente',
        orderId
      };
    } finally {
      console.log('[useRappi] verifyAndDispense finally block reached.');
      setIsLoading(false);
    }
  }, [verifyHandshake]);

  /**
   * Mark an order as delivered in Rappi
   * @param orderId The Rappi order ID
   */
  const markOrderDelivered = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const ipcRenderer = getIpcRenderer();
      if (!ipcRenderer) {
        throw new Error('IPC renderer not available');
      }
      
      console.log(`Marking Rappi order as delivered: ${orderId}`);
      const response = await ipcRenderer.invoke('rappi:markOrderDelivered', orderId);
      
      if (response.success) {
        console.log('Order successfully marked as delivered');
        return true;
      } else {
        console.error('Failed to mark order as delivered:', response.message);
        setError('Código inválido, por favor intente nuevamente');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error marking order as delivered: ${errorMessage}`);
      setError('Código inválido, por favor intente nuevamente');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset error
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Reset handshake data
  const resetHandshakeData = useCallback(() => {
    setHandshakeData(null);
  }, []);

  return {
    isLoading,
    error,
    status,
    handshakeData,
    authenticate,
    initiateHandshake,
    verifyHandshake,
    verifyAndDispense,
    markOrderDelivered,
    resetError,
    resetHandshakeData
  };
}; 