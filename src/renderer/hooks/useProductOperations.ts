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
    // Get machine code from localStorage
    const getMachineCode = () => {
      return localStorage.getItem('FS_COD_MAQ') || '001';
    };

    const getSlotMapping = async (productId: string): Promise<SlotMapping | null> => {
      try {
        const machineCode = getMachineCode();
        const result = await window.electron.ipcRenderer.invoke('get-slot-mapping', { productId, machineCode });
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
        const machineCode = getMachineCode();
        return await window.electron.ipcRenderer.invoke('dispense-product-db', { 
          productId, 
          slotId,
          quantity,
          machineCode
        });
      } catch (error) {
        console.error('Error invoking dispense-product-db:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    };

    const getTotalProductInventory = async (productId: string): Promise<number> => {
      try {
        const machineCode = getMachineCode();
        const result = await window.electron.ipcRenderer.invoke('get-total-product-inventory', { productId, machineCode });
        if (result.success) {
          return result.totalInventory;
        }
        console.error('Error getting total product inventory:', result.error);
        return 0;
      } catch (error) {
        console.error('Error invoking get-total-product-inventory:', error);
        return 0;
      }
    };
  
    return {
      getSlotMapping,
      dispenseProductDb,
      getTotalProductInventory
    };
  } 