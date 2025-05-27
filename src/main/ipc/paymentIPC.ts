import { ipcMain } from 'electron';
import { IzipayPOSService } from '../payment/izipayPOSService';

// Initialize Izipay service
const izipayService = new IzipayPOSService({
  portPath: 'COM9',
  baudRate: 9600,
  credentials: {
    username: 'izipay',
    password: 'izipay'
  },
  apiUrl: 'http://localhost:9090/API_PPAD'
});

export function setupPaymentIPC() {
  // Handle payment processing
  ipcMain.handle('process-payment', async (event, { amount }) => {
    try {
      console.log('Processing payment with amount:', amount);
      
      // Format amount for Izipay (multiply by 100 to get cents)
      const formattedAmount = (amount * 100).toString();
      
      // Create transaction object
      const transaction = {
        ecr_transaccion: "01",
        ecr_amount: formattedAmount,
        ecr_aplicacion: 'POS',
        ecr_currency_code: '604'
      };

      // Process the transaction
      const result = await izipayService.processTransaction(transaction);
      
      console.log('Payment result:', result);
      
      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
} 