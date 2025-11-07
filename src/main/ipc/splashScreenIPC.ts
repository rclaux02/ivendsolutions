import { ipcMain } from 'electron';
import { splashScreenService } from '../services/SplashScreenService';
import { 
  createSplashScreen, 
  updateSplashScreenStatus, 
  getAllSplashScreens 
} from '../database/operations/splashScreenOperations';

export function registerSplashScreenIPC(): void {
  console.log('[SplashScreenIPC] Registering splash screen IPC handlers');
  
  // Get active splash screens with incremental sync
  ipcMain.handle('splash:getActive', async (_, machineCode: string, sede: string, local: string) => {
    console.log('[SplashScreenIPC] Handler called with machineCode:', machineCode, 'sede:', sede, 'local:', local);
    try {
      console.log('[SplashScreenIPC] Getting splash screens with incremental sync');
      const splashScreens = await splashScreenService.getActiveSplashScreensIncremental(machineCode, sede, local);
      console.log('[SplashScreenIPC] Service returned:', splashScreens.length, 'splash screens');
      console.log('[SplashScreenIPC] Splash screens data:', splashScreens);
      return splashScreens;
    } catch (error) {
      console.error('[SplashScreenIPC] Error getting active splash screens:', error);
      // Fallback to legacy method if incremental fails
      try {
        console.log('[SplashScreenIPC] Falling back to legacy method');
        return await splashScreenService.getActiveSplashScreens(sede, local);
      } catch (fallbackError) {
        console.error('[SplashScreenIPC] Fallback method also failed:', fallbackError);
        return [];
      }
    }
  });
  
  console.log('[SplashScreenIPC] Handler splash:getActive registered successfully');

  // Refresh splash screens
  ipcMain.handle('splash:refresh', async (_, sede: string, local: string) => {
    try {
      const splashScreens = await splashScreenService.refreshSplashScreens(sede, local);
      return splashScreens;
    } catch (error) {
      console.error('[SplashScreenIPC] Error refreshing splash screens:', error);
      return [];
    }
  });

  // Create new splash screen
  ipcMain.handle('splash:create', async (_, data: any) => {
    try {
      const id = await createSplashScreen(data);
      return { success: true, id };
    } catch (error) {
      console.error('[SplashScreenIPC] Error creating splash screen:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Update splash screen status
  ipcMain.handle('splash:updateStatus', async (_, id: number, status: string) => {
    try {
      const success = await updateSplashScreenStatus(id, status as 'activo' | 'inactivo');
      return { success };
    } catch (error) {
      console.error('[SplashScreenIPC] Error updating splash screen status:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Get all splash screens for management
  ipcMain.handle('splash:getAll', async () => {
    try {
      const splashScreens = await getAllSplashScreens();
      return splashScreens;
    } catch (error) {
      console.error('[SplashScreenIPC] Error getting all splash screens:', error);
      return [];
    }
  });
} 