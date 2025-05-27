// We'll use the window.electron interface that's exposed through preload
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => () => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

interface SlotMapping {
    slot_id: string;
    quantity: number;
  }
  
  export function useProductOperations() {
    const getSlotMapping = async (productId: string): Promise<SlotMapping | null> => {
      try {
        const result = await window.electron.ipcRenderer.invoke('get-slot-mapping', productId);
        if (result.success) {
          return result.data;
        }
        console.error('Error getting slot mapping:', result.error);
        return null;
      } catch (error) {
        console.error('Error invoking get-slot-mapping:', error);
        return null;
      }
    };
  
    const dispenseProductDb = async (productId: string, slotId?: string, quantity: number = 1) => {
      try {
        return await window.electron.ipcRenderer.invoke('dispense-product-db', { 
          productId, 
          slotId,
          quantity
        });
      } catch (error) {
        console.error('Error invoking dispense-product-db:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    };
  
    return {
      getSlotMapping,
      dispenseProductDb
    };
  } 