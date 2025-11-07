import { ipcMain } from 'electron';
import { rappiInventoryService } from '../rappi/inventoryService';

/**
 * Set up IPC handlers for Rappi inventory integration
 */
export function setupRappiInventoryIPC(): void {
  // Generate inventory report
  ipcMain.handle('rappi-inventory:generate', async () => {
    console.log('[RAPPI INVENTORY IPC] Generating inventory report');
    try {
      const result = await rappiInventoryService.generateInventoryReport();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error generating inventory report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get inventory statistics
  ipcMain.handle('rappi-inventory:getStats', async () => {
    console.log('[RAPPI INVENTORY IPC] Getting inventory statistics');
    try {
      const result = await rappiInventoryService.getInventoryStats();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error getting inventory stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get current configuration (simplified)
  ipcMain.handle('rappi-inventory:getConfig', async () => {
    console.log('[RAPPI INVENTORY IPC] Getting current configuration');
    try {
      return {
        success: true,
        config: {
          storeId: '59434',
          machineCode: 'MACHINE-1',
          outputDirectory: './test-rappi-inventory',
          saleType: 'retail',
          defaultImageUrl: 'https://example.com/default-image.jpg'
        }
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error getting configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Update configuration (simplified)
  ipcMain.handle('rappi-inventory:updateConfig', async (_, newConfig: any) => {
    console.log('[RAPPI INVENTORY IPC] Updating configuration:', newConfig);
    try {
      // For now, just return success without actually updating
      return {
        success: true,
        config: {
          storeId: '59434',
          machineCode: 'MACHINE-1',
          outputDirectory: './test-rappi-inventory',
          saleType: 'retail',
          defaultImageUrl: 'https://example.com/default-image.jpg',
          ...newConfig
        }
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error updating configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export default setupRappiInventoryIPC; 