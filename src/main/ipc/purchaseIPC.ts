import { ipcMain } from 'electron';
import { withTransaction } from '../database/dbConnection';
import { 
  createPurchaseTransaction,
  createPurchaseItem,
  updatePurchaseTransactionFeedback
} from '../database/operations/purchaseOperations';

/**
 * Register IPC handlers for purchase-related operations
 */
export function registerPurchaseIPC(): void {
  // Handler for creating a purchase transaction
  ipcMain.handle('purchase:createTransaction', async (_event, data: any) => {
    try {
      console.log('[PurchaseIPC] Creating purchase transaction:', data);
      
      const result = await withTransaction(async (connection) => {
        // Create the transaction header
        const transactionId = await createPurchaseTransaction(connection, {
          clientId: data.clientId,
          paymentTransactionId: data.paymentTransactionId,
          totalAmount: data.totalAmount
        });
        
        return transactionId;
      });
      
      if (result) {
        console.log(`[PurchaseIPC] Successfully created transaction with ID: ${result}`);
        return result;
      } else {
        console.error('[PurchaseIPC] Failed to create transaction record');
        return null;
      }
    } catch (error) {
      console.error('[PurchaseIPC] Error creating purchase transaction:', error);
      throw error; // Re-throw to be handled by the renderer
    }
  });

  // Handler for creating a purchase item
  ipcMain.handle('purchase:createItem', async (_event, data: any) => {
    try {
      console.log('[PurchaseIPC] Creating purchase item:', data);
      
      const result = await withTransaction(async (connection) => {
        // Create the item record
        const itemId = await createPurchaseItem(connection, {
          transactionId: data.transactionId,
          productId: data.productId,
          quantity: data.quantity,
          unitPriceAtPurchase: data.unitPriceAtPurchase,
          discountPercentApplied: data.discountPercentApplied,
          discountedPrice: data.discountedPrice,
          slotIdDispensedFrom: data.slotIdDispensedFrom
        });
        
        return itemId;
      });
      
      if (result) {
        console.log(`[PurchaseIPC] Successfully created purchase item with ID: ${result}`);
        return result;
      } else {
        console.error('[PurchaseIPC] Failed to create purchase item record');
        return null;
      }
    } catch (error) {
      console.error('[PurchaseIPC] Error creating purchase item:', error);
      throw error; // Re-throw to be handled by the renderer
    }
  });
  
  // Handler for submitting feedback for a purchase
  ipcMain.handle('purchase:submitFeedback', async (_event, data: { paymentTransactionId: string, feedbackValue: 'happy' | 'neutral' | 'sad', feedbackReason?: string }) => {
    try {
      console.log('[PurchaseIPC] Submitting feedback for payment transaction:', data.paymentTransactionId);
      
      const result = await withTransaction(async (connection) => {
        const success = await updatePurchaseTransactionFeedback(connection, {
          paymentTransactionId: data.paymentTransactionId,
          feedbackValue: data.feedbackValue,
          feedbackReason: data.feedbackReason
        });
        return success;
      });
      
      if (result) {
        console.log(`[PurchaseIPC] Successfully submitted feedback for payment transaction ID: ${data.paymentTransactionId}`);
        return true;
      } else {
        console.warn('[PurchaseIPC] Failed to submit feedback for payment transaction ID:', data.paymentTransactionId);
        // Returning false as the operation didn't update rows, maybe the ID was wrong
        return false; 
      }
    } catch (error) {
      console.error('[PurchaseIPC] Error submitting purchase feedback:', error);
      throw error; // Re-throw to be handled by the renderer
    }
  });

  // Log that handlers have been set up
  console.log('Purchase IPC handlers registered');
} 