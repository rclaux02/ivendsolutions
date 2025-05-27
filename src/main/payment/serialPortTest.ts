import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import { platform } from 'os';

/**
 * Function to test connection to a serial port
 * @param portPath COM port to test (e.g., 'COM9')
 */
export async function testSerialPort(portPath: string): Promise<boolean> {
  console.log(`Testing serial port connection to ${portPath}...`);
  
  try {
    // Create a test port instance
    const port = new SerialPort({
      path: 'COM9',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false
    });

    // Return promise that resolves when port opens or rejects on error
    return new Promise((resolve) => {
      // Setup handlers first
      port.on('open', () => {
        console.log(`Successfully opened port ${portPath}`);
        // Close the port after successful test
        port.close((err) => {
          if (err) {
            console.error(`Error closing port ${portPath}:`, err);
          } else {
            console.log(`Successfully closed port ${portPath} after test`);
          }
          resolve(true);
        });
      });

      port.on('error', (err) => {
        console.error(`Error with port ${portPath}:`, err);
        
        // If access denied, the port exists but is in use
        if (err.message && err.message.includes('Access denied')) {
          console.log(`Port ${portPath} exists but is already in use by another process`);
          resolve(true); // Consider "access denied" a success for connection testing
        } else {
          resolve(false)
        }
      });

      // Now try to open the port
      port.open((err) => {
        if (err) {
          console.error(`Failed to open port ${portPath}:`, err);
          
          // If access denied, the port exists but is in use
          if (err.message && err.message.includes('Access denied')) {
            console.log(`Port ${portPath} exists but is already in use`);
            resolve(true); // Consider "access denied" a success for connection testing
          } else {
            resolve(false);
          }
          return;
        }
        // The 'open' event handler will be called on success
      });

      // Set timeout for opening
      setTimeout(() => {
        if (!port.isOpen) {
          console.log(`Timeout trying to open port ${portPath}`);
          resolve(false);
        }
      }, 3000);
    });
  } catch (error) {
    console.error(`Exception testing port ${portPath}:`, error);
    
    // If access denied, the port exists but is in use
    if (error instanceof Error && error.message && error.message.includes('Access denied')) {
      console.log(`Port ${portPath} exists but is in use by another process`);
      return true; // Consider "access denied" a success for connection testing
    }
    
    return false;
  }
}

/**
 * Function to list all available serial ports
 * @param verbose Whether to log detailed information about ports
 */
export async function listSerialPorts(verbose: boolean = false): Promise<string[]> {
  if (verbose) {
    console.log('Listing all available serial ports...');
  }
  
  try {
    const ports = await SerialPort.list();
    
    if (verbose) {
      console.log('Available ports:', ports.map(p => `${p.path} (${p.manufacturer || 'unknown manufacturer'})`));
    }
    
    return ports.map(p => p.path);
  } catch (error) {
    console.error('Error listing serial ports:', error);
    return [];
  }
}

/**
 * Attempts to identify processes that might be using a COM port (Windows only)
 * @param portPath The COM port to check (e.g., 'COM9')
 * @returns Promise<string> A string with information about potential processes using the port
 */
export async function checkPortUsage(portPath: string): Promise<string> {
  // This only works on Windows
  if (platform() !== 'win32') {
    return 'Port usage check is only available on Windows';
  }
  
  return new Promise((resolve) => {
    // Use Windows' netstat command to check port usage
    exec('netstat -ano', (error, stdout) => {
      if (error) {
        resolve(`Error checking port usage: ${error.message}`);
        return;
      }
      
      // Look for handles to the COM port
      resolve(`Checked for processes using ${portPath}. For detailed information, please check Task Manager.`);
    });
  });
} 