import { ipcMain } from 'electron';
import { rappiInventoryService, RappiInventoryConfig } from '../rappi/inventoryService';

/**
 * Set up IPC handlers for Rappi inventory integration
 */
export function setupRappiInventoryIPC(): void {
  // Generate inventory file
  ipcMain.handle('rappi-inventory:generate', async () => {
    console.log('[RAPPI INVENTORY IPC] Generating inventory file');
    try {
      const result = await rappiInventoryService.generateInventoryFile();
      return result;
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error generating inventory file:', error);
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
      return result;
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error getting inventory stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Update configuration
  ipcMain.handle('rappi-inventory:updateConfig', async (_, newConfig: Partial<RappiInventoryConfig>) => {
    console.log('[RAPPI INVENTORY IPC] Updating configuration:', newConfig);
    try {
      rappiInventoryService.updateConfig(newConfig);
      return {
        success: true,
        config: rappiInventoryService.getConfig()
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error updating configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Get current configuration
  ipcMain.handle('rappi-inventory:getConfig', async () => {
    console.log('[RAPPI INVENTORY IPC] Getting current configuration');
    try {
      return {
        success: true,
        config: rappiInventoryService.getConfig()
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY IPC] Error getting configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export default setupRappiInventoryIPC; 