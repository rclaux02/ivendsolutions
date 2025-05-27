import { ipcMain } from 'electron';
import { hardwareService, HardwareEvent, DispensingResult } from '../hardware/hardwareService';
import { AgeVerificationResult } from '../ageVerification/ageVerification';

/**
 * IPC channel names for hardware-related operations
 */
export enum HardwareChannel {
  INITIALIZE = 'hardware:initialize',
  VERIFY_AGE = 'hardware:verify-age',
  PROCESS_PAYMENT = 'hardware:process-payment',
  GENERATE_QR_CODE = 'hardware:generate-qr-code',
  GET_PAYMENT_STATUS = 'hardware:get-payment-status',
  DISPENSE_PRODUCT = 'hardware:dispense-product',
  GET_STATUS = 'hardware:get-status',
  
  // Events from hardware to renderer
  AGE_VERIFICATION_RESULT = 'hardware:age-verification-result',
  PAYMENT_STATUS_UPDATE = 'hardware:payment-status-update',
  PRODUCT_DISPENSED = 'hardware:product-dispensed',
  HARDWARE_ERROR = 'hardware:error'
}

/**
 * Register all hardware-related IPC handlers
 * @param mainWindow The main Electron window
 */
export function registerHardwareIPC(mainWindow: Electron.BrowserWindow): void {
  // Forward hardware events to the renderer process
  hardwareService.on(HardwareEvent.AGE_VERIFICATION_RESULT, (result: AgeVerificationResult) => {
    mainWindow.webContents.send(HardwareChannel.AGE_VERIFICATION_RESULT, result);
  });
  
  // hardwareService.on(HardwareEvent.PAYMENT_STATUS, (status: PaymentResponse) => {
  //   mainWindow.webContents.send(HardwareChannel.PAYMENT_STATUS_UPDATE, status);
  // });
  
  hardwareService.on(HardwareEvent.PRODUCT_DISPENSED, (result: DispensingResult) => {
    mainWindow.webContents.send(HardwareChannel.PRODUCT_DISPENSED, result);
  });
  
  hardwareService.on(HardwareEvent.ERROR, (error: any) => {
    mainWindow.webContents.send(HardwareChannel.HARDWARE_ERROR, error);
  });
  
  // Register IPC handlers for renderer to main process communication
  
  // Initialize hardware
  ipcMain.handle(HardwareChannel.INITIALIZE, async () => {
    try {
      const result = await hardwareService.initialize();
      return { success: result };
    } catch (error) {
      console.error('Error initializing hardware:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
  
  // Verify age
  ipcMain.handle(HardwareChannel.VERIFY_AGE, async () => {
    try {
      return await hardwareService.verifyAge();
    } catch (error) {
      console.error('Error in age verification IPC handler:', error);
      return {
        success: false,
        message: `Age verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      } as AgeVerificationResult;
    }
  });

  
  // Dispense product
  ipcMain.handle(HardwareChannel.DISPENSE_PRODUCT, async (_, slotId: string) => {
    try {
      console.log(`[HARDWARE 1] Dispensing product from slot ${slotId}`);
      return await hardwareService.dispenseProduct(slotId);
    } catch (error) {
      console.error('Error dispensing product in IPC handler:', error);
      return {
        success: false,
        message: `Error dispensing product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      } as DispensingResult;
    }
  });
  
  // Get hardware status
  ipcMain.handle(HardwareChannel.GET_STATUS, async () => {
    try {
      return await hardwareService.getStatus();
    } catch (error) {
      console.error('Error getting hardware status in IPC handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
}

/**
 * Unregister all hardware-related IPC handlers
 */
export function unregisterHardwareIPC(): void {
  ipcMain.removeHandler(HardwareChannel.INITIALIZE);
  ipcMain.removeHandler(HardwareChannel.VERIFY_AGE);
  ipcMain.removeHandler(HardwareChannel.PROCESS_PAYMENT);
  ipcMain.removeHandler(HardwareChannel.GENERATE_QR_CODE);
  ipcMain.removeHandler(HardwareChannel.GET_PAYMENT_STATUS);
  ipcMain.removeHandler(HardwareChannel.DISPENSE_PRODUCT);
  ipcMain.removeHandler(HardwareChannel.GET_STATUS);
  
  // Clean up hardware service
  hardwareService.dispose();
} 