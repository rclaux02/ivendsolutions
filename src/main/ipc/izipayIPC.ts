import { ipcMain } from 'electron';
import { IzipayPOSService } from '../payment/izipayPOSService';
import { listSerialPorts, testSerialPort } from '../payment/serialPortTest';
import axios from 'axios';

export enum IzipayChannel {
  LOGIN = 'izipay:login',
  TRANSACTION = 'izipay:process-transaction',
  TEST_PORT = 'izipay:test-port',
  LIST_PORTS = 'izipay:list-ports',
  TEST_API = 'izipay:test-api'
}

export function registerIzipayIPC(izipayService: IzipayPOSService) {
  const verbose = process.env.IZIPAY_VERBOSE_LOGS === 'true';
  
  console.log('Registering IziPay IPC handlers...');

  // Handle IziPay login
  ipcMain.handle(IzipayChannel.LOGIN, async (_, credentials: { username: string; password: string }) => {
    try {
      if (verbose) {
        console.log('Attempting IziPay login with credentials:', credentials);
      } else {
        console.log('Attempting IziPay login');
      }
      
      const success = await izipayService.login(credentials.username, credentials.password);
      
      if (verbose) {
        console.log('IziPay login result:', success);
      }
      return success;
    } catch (error) {
      console.error('IziPay login error:', error);
      return false;
    }
  });

  // Handle IziPay transaction
  ipcMain.handle(IzipayChannel.TRANSACTION, async (_, transaction: any) => {
    try {
      console.log('=== TRANSACTION FLOW [5] ===');
      console.log('IPC handler received transaction request in izipayIPC.ts');
      console.log('Original transaction data:', transaction);
      
      // Always ensure we have a fresh token before transaction
      console.log('Ensuring valid token before transaction...');
      const loginSuccess = await izipayService.ensureValidToken();
      if (!loginSuccess) {
        console.error('=== TRANSACTION FLOW [ERROR] === Failed to obtain authentication token');
        throw new Error('Failed to obtain authentication token');
      }

      // Get the token to verify it exists
      const token = izipayService.getToken();
      if (!token) {
        console.error('=== TRANSACTION FLOW [ERROR] === No authentication token available');
        throw new Error('No authentication token available');
      }

      console.log('Token obtained successfully:');
      console.log('Full token:', token); // Log the complete token

      // CRITICAL: Release the serial port before making the API call
      // The API needs to directly access the PINPAD device through the COM port
      console.log('Releasing serial port for API access...');
      await izipayService.releasePortForApiAccess();
      
      // Use the izipayService (base service inside the POS service) to process the transaction
      const result = await izipayService.izipayService.processTransaction(transaction);
      
      console.log('=== TRANSACTION FLOW [SUCCESS] ===');
      console.log('Transaction processed successfully');
      
      // Check for specific PINPAD connection error
      if (result.response_code === '99' && 
          result.message?.includes('NO HAY CONEXIÓN CON EL PINPAD')) {
        console.error('=== TRANSACTION FLOW [ERROR] === PINPAD CONNECTION ERROR');
        console.error('The API could not connect to the PINPAD device.');
        console.error('This is likely because another application (possibly even this one) has the COM port open.');
        console.error('Try restarting the application and ensuring no other programs are using the port.');
      }

      return result;
    } catch (error) {
      console.error('=== TRANSACTION FLOW [ERROR] ===');
      console.error('IziPay transaction error in izipayIPC.ts:', error);
      
      // Clear token on error in case it's expired
      izipayService.clearToken();
      throw error;
    }
  });

  // Handle listing all available COM ports
  ipcMain.handle(IzipayChannel.LIST_PORTS, async () => {
    try {
      // Only log when explicitly requesting ports
      if (verbose) {
        console.log('IPC: Handling request to list COM ports');
      }
      const ports = await listSerialPorts(verbose); // Only log details if verbose
      return { success: true, ports };
    } catch (error) {
      console.error('Error listing COM ports:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Handle testing a specific COM port
  ipcMain.handle(IzipayChannel.TEST_PORT, async (_, portPath: string) => {
    try {
      console.log(`Testing connection to COM port: ${portPath}`);
      
      // Check if this is the same port that might be open by our service
      const currentPortPath = izipayService.config?.portPath;
      
      if (currentPortPath === portPath && izipayService.isPortOpen()) {
        console.log(`Port ${portPath} is currently in use by our POS service. Closing it before testing.`);
        await izipayService.releasePortForApiAccess();
      }
      
      // Add a small delay to ensure the port is properly closed before testing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to identify processes that might be using this port
      const { checkPortUsage } = await import('../payment/serialPortTest');
      const usageInfo = await checkPortUsage(portPath);
      console.log(`Port usage information for ${portPath}:\n${usageInfo}`);
      
      const result = await testSerialPort(portPath);
      return { 
        success: result,
        message: result 
          ? `Successfully connected to ${portPath}` 
          : `Failed to connect to ${portPath}`,
        usageInfo: usageInfo  // Include the usage info in the response
      };
    } catch (error) {
      console.error(`Error testing COM port ${portPath}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });

  // Handle direct API testing (using parameters that work in Postman)
  ipcMain.handle(IzipayChannel.TEST_API, async (_, requestData: any) => {
    try {
      console.log('=== DIRECT API TEST ===');
      console.log('Testing API directly with provided parameters');
      
      // Always ensure we have a fresh token before transaction
      console.log('Ensuring valid token before API test...');
      const loginSuccess = await izipayService.ensureValidToken();
      if (!loginSuccess) {
        throw new Error('Failed to obtain authentication token');
      }

      // Get the token to verify it exists
      const token = izipayService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Token obtained successfully');
      
      // CRITICAL: Release the serial port before making the API call
      console.log('Releasing serial port for API access...');
      await izipayService.releasePortForApiAccess();
      
      // Add a longer delay to ensure the port is fully released
      console.log('Waiting for port to be fully released (2 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Testing direct API call with exact payload:');
      console.log(requestData);
      
      // Send the exact request data that works in Postman
      const response = await axios.post(
        `${izipayService.izipayService.getBaseUrl()}/procesarTransaccion`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('API response:', response.data);
      
      // Check for PINPAD connection error
      if (response.data.response_code === '99' && 
          response.data.message?.includes('NO HAY CONEXIÓN CON EL PINPAD')) {
        console.error('=== API TEST FAILED === PINPAD CONNECTION ERROR');
        console.error('The API could not connect to the PINPAD device.');
        console.error('This is likely because another application has the COM port open.');
      }
      
      return {
        success: response.data.response_code !== '99',
        data: response.data
      };
    } catch (error) {
      console.error('=== API TEST ERROR ===');
      console.error('Error testing API directly:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });

  console.log('IziPay IPC handlers registered successfully');
}

export function unregisterIzipayIPC() {
  console.log('Unregistering IziPay IPC handlers...');
  ipcMain.removeHandler(IzipayChannel.LOGIN);
  ipcMain.removeHandler(IzipayChannel.TRANSACTION);
  ipcMain.removeHandler(IzipayChannel.TEST_PORT);
  ipcMain.removeHandler(IzipayChannel.LIST_PORTS);
  ipcMain.removeHandler(IzipayChannel.TEST_API);
  console.log('IziPay IPC handlers unregistered');
} 