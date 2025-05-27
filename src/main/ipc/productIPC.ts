import { ipcMain } from 'electron';
import { getProductsForMachine, getProductByCode, getAvailableSlotMapping, dispenseProductFromSlot } from '../database/operations/productOperations';

/**
 * Set up IPC handlers for product-related operations
 */
export function registerProductIPC(): void {
  // Handler for getting products for a specific machine
  ipcMain.handle('products:get-for-machine', async (_event, machineCode: string) => {
    try {
      console.log(`Getting products for machine code: ${machineCode}`);
      const products = await getProductsForMachine(machineCode);
      console.log(`Retrieved ${products.length} products for machine ${machineCode}`);
      return { success: true, products };
    } catch (error) {
      console.error('Error retrieving products:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error fetching products' 
      };
    }
  });

  // Handler for getting a single product by its code
  ipcMain.handle('products:get-by-code', async (_event, productCode: string) => {
    try {
      console.log(`Getting product with code: ${productCode}`);
      const product = await getProductByCode(productCode);
      if (product) {
        console.log(`Retrieved product ${productCode}`);
        return { success: true, product };
      } else {
        console.log(`No product found with code ${productCode}`);
        return { success: false, error: 'Product not found' };
      }
    } catch (error) {
      console.error('Error retrieving product:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error fetching product' 
      };
    }
  });

  // Handler for getting available slot mapping
  ipcMain.handle('get-slot-mapping', async (_, productId: string) => {
    try {
      const slotMapping = await getAvailableSlotMapping(productId);
      return { success: true, data: slotMapping };
    } catch (error) {
      console.error('Error getting slot mapping:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Handler for dispensing product and updating database
  ipcMain.handle('dispense-product-db', async (_, { productId, slotId, quantity }: { productId: string | number; slotId?: string; quantity?: number }) => {
    try {
      // Convert productId to string to ensure consistency
      const productIdStr = String(productId);
      
      console.log(`[IPC] Dispensing product - ID: ${productIdStr}, Slot: ${slotId || 'auto'}, Quantity: ${quantity || 1}`);
      
      // Make sure productId is a string but not undefined
      if (!productIdStr) {
        console.error('[IPC] Product ID is undefined or empty');
        return { 
          success: false, 
          message: 'Product ID is undefined or empty' 
        };
      }
      
      const result = await dispenseProductFromSlot(productIdStr, slotId, quantity);
      
      console.log(`[IPC] Dispense result:`, result);
      return result;
    } catch (error) {
      console.error('[IPC] Error dispensing product:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Log that handlers have been set up
  console.log('Product IPC handlers registered');
} 