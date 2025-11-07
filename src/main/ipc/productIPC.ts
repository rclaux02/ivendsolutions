import { ipcMain } from 'electron';
import { getProductsForMachine, getProductByCode, getAllAvailableSlotMappings, dispenseProductFromSlot, getTotalProductInventory } from '../database/operations/productOperations';

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

  // Handler for getting available slot mappings
  ipcMain.handle('get-slot-mapping', async (_, { productId, machineCode }: { productId: string; machineCode?: string }) => {
    try {
      const currentMachineCode = machineCode || '001';
      const slotMappings = await getAllAvailableSlotMappings(productId, currentMachineCode);
      return { success: true, data: slotMappings };
    } catch (error) {
      console.error('Error getting slot mappings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Handler for getting total product inventory across all slots
  ipcMain.handle('get-total-product-inventory', async (_, { productId, machineCode }: { productId: string; machineCode?: string }) => {
    try {
      const currentMachineCode = machineCode || '001';
      console.log(`[IPC] Getting total inventory for product ${productId} in machine ${currentMachineCode}`);
      
      const totalInventory = await getTotalProductInventory(productId, currentMachineCode);
      
      console.log(`[IPC] Total inventory for product ${productId}: ${totalInventory}`);
      return { success: true, totalInventory };
    } catch (error) {
      console.error('[IPC] Error getting total product inventory:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Handler for dispensing product and updating database
  ipcMain.handle('dispense-product-db', async (_, { productId, slotId, quantity, machineCode }: { productId: string | number; slotId?: string; quantity?: number; machineCode?: string }) => {
    try {
      // Convert productId to string to ensure consistency
      const productIdStr = String(productId);
      
      // Get machine code from parameter or use default
      const currentMachineCode = machineCode || '001';
      
      console.log(`[IPC] Dispensing product - ID: ${productIdStr}, Slot: ${slotId || 'auto'}, Quantity: ${quantity || 1}, Machine: ${currentMachineCode}`);
      
      // Make sure productId is a string but not undefined
      if (!productIdStr) {
        console.error('[IPC] Product ID is undefined or empty');
        return { 
          success: false, 
          message: 'Product ID is undefined or empty' 
        };
      }
      
      const result = await dispenseProductFromSlot(productIdStr, slotId, quantity, currentMachineCode);
      
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



  // Handler for getting filter categories by machine
  ipcMain.handle('filters:get-categories-by-machine', async (_, { machineCode }: { machineCode: string }) => {
    try {
      console.log('🔄 [IPC] Getting filter categories for machine:', machineCode);
      
      // Importar withConnection dinámicamente para evitar problemas de import
      const { withConnection } = require('../database/dbConnection');
      
      const query = `
        SELECT DISTINCT p.FS_DES_PROD_CONT 
        FROM TA_PRODUCTO p
        INNER JOIN TA_PRODUCT_SLOT_MAPPING sm ON p.FS_ID = sm.PRODUCT_ID
        WHERE sm.MACHINE_CODE = ? 
          AND p.FS_EMP = 'Vendimedia'
          AND p.FS_DES_PROD_CONT IS NOT NULL 
          AND p.FS_DES_PROD_CONT != ""
        ORDER BY p.FS_DES_PROD_CONT
      `;
      
      const rows = await withConnection(async (connection: any) => {
        const [result] = await connection.execute(query, [machineCode]);
        return result;
      });
      
      const categories = rows.map((row: any) => row.FS_DES_PROD_CONT);
      console.log(`✅ [IPC] Found ${categories.length} categories for machine ${machineCode} with FS_EMP = 'Vendimedia':`, categories);
      
      return { success: true, categories };
    } catch (error) {
      console.error('❌ [IPC] Error getting filter categories by machine:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error getting categories' 
      };
    }
  });

  // Handler for direct database queries
  ipcMain.handle('database:query', async (_, { sql }: { sql: string }) => {
    try {
      console.log('🔄 [IPC] Executing direct database query:', sql);
      
      // Importar withConnection dinámicamente para evitar problemas de import
      const { withConnection } = require('../database/dbConnection');
      
      const rows = await withConnection(async (connection: any) => {
        const [result] = await connection.execute(sql);
        return result;
      });
      
      console.log(`✅ [IPC] Query executed successfully, returned ${Array.isArray(rows) ? rows.length : 0} rows`);
      return { success: true, rows };
    } catch (error) {
      console.error('❌ [IPC] Error executing database query:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error executing query' 
      };
    }
  });

  // Log that handlers have been set up
  console.log('Product IPC handlers registered');
} 