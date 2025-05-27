import { ipcMain } from 'electron';
import { rappiService } from '../rappi';
import type { RappiHandshakeVerificationRequest } from '../rappi';

/**
 * Set up IPC handlers for Rappi API integration
 */
export function setupRappiIPC(): void {
  // Initialize Rappi service by authenticating
  ipcMain.handle('rappi:authenticate', async () => {
    console.log('[RAPPI IPC] Authenticating with Rappi API');
    const success = await rappiService.authenticate();
    return { success };
  });

  // Get Rappi service status
  ipcMain.handle('rappi:getStatus', () => {
    console.log('[RAPPI IPC] Getting Rappi service status');
    return rappiService.getStatus();
  });

  // Initiate handshake for an order
  ipcMain.handle('rappi:initiateHandshake', async (_, orderId: string) => {
    console.log(`[RAPPI IPC] Initiating handshake for order: ${orderId}`);
    try {
      const response = await rappiService.initiateHandshake(orderId);
      return { success: !!response, data: response };
    } catch (error) {
      console.error('[RAPPI IPC] Error initiating handshake:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Verify handshake code
  ipcMain.handle('rappi:verifyHandshake', async (_, request: RappiHandshakeVerificationRequest) => {
    console.log(`[RAPPI IPC] Verifying handshake for order: ${request.order_id}`);
    try {
      const response = await rappiService.verifyHandshake(request);
      return response;
    } catch (error) {
      console.error('[RAPPI IPC] Error verifying handshake:', error);
      return {
        success: false,
        order_id: request.order_id,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Mark order as delivered
  ipcMain.handle('rappi:markOrderDelivered', async (_, orderId: string) => {
    console.log(`[RAPPI IPC] Marking order as delivered: ${orderId}`);
    try {
      const response = await rappiService.markOrderDelivered(orderId);
      return response;
    } catch (error) {
      console.error('[RAPPI IPC] Error marking order as delivered:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

export default setupRappiIPC; 