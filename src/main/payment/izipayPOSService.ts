import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import { IzipayService } from './izipayService';
import axios from 'axios';

export interface POSConfig {
  portPath: string;
  baudRate: number;
  credentials: {
    username: string;
    password: string;
  };
  apiUrl: string;
}

interface IzipayTransaction {
  ecr_transaccion: string;
  ecr_amount: string;
  ecr_aplicacion: string;
  ecr_currency_code: string;
}

export class IzipayPOSService extends EventEmitter {
  private token: string | null = null;
  private serialPort: SerialPort | null = null;
  public readonly config: POSConfig;
  public readonly izipayService: IzipayService;
  private verbose: boolean;

  constructor(config: POSConfig) {
    super();
    this.config = config;
    this.izipayService = new IzipayService(config.apiUrl);
    this.verbose = process.env.IZIPAY_VERBOSE_LOGS === 'true'; // Control verbosity via env variable
    
    // Only log initialization if verbose
    if (this.verbose) {
      console.log('IzipayPOSService initialized with config:', {
        portPath: config.portPath,
        baudRate: config.baudRate,
        apiUrl: config.apiUrl
      });
    } else {
      console.log('IzipayPOSService initialized');
    }
  }

  async initialize(): Promise<boolean> {
    try {
      if (this.verbose) {
        console.log('Initializing IzipayPOSService...');
      }
      
      // Ensure any existing port is closed before initializing
      if (this.serialPort) {
        await this.closeSerialPort();
      }
      
      await this.openSerialPort();
      return true;
    } catch (error) {
      console.error('Error initializing IzipayPOSService:', error);
      return false;
    }
  }

  private async openSerialPort(): Promise<void> {
    // Close existing port if open
    await this.closeSerialPort();

    // Track if this is the initial port opening
    const isInitialOpen = !this.serialPort;

    return new Promise((resolve, reject) => {
      try {
        if (isInitialOpen) {
          console.log(`[izipayPOS] Opening serial port ${this.config.portPath}...`);
        }
        console.log('in izipay pos service')
        this.serialPort = new SerialPort({
          path: 'COM10',
          baudRate: this.config.baudRate,
          autoOpen: false // Don't open automatically - we'll handle it manually
        });

        // Set up event handlers
        this.serialPort.on('error', (err) => {
          console.error(`Serial port error on ${this.config.portPath}:`, err);
          this.emit('error', err);
        });

        this.serialPort.on('data', (data) => {
          // Only log data during actual transactions, not during initialization
          this.emit('data', data);
        });

        // Handle port open event
        this.serialPort.on('open', () => {
          if (isInitialOpen) {
            console.log(`Successfully opened port ${this.config.portPath}`);
          }
          resolve();
        });

        // Open the port manually
        this.serialPort.open((err) => {
          if (err) {
            console.error(`Failed to open port ${this.config.portPath}:`, err);
            reject(err);
            return;
          }
          // The 'open' event handler above will be called
        });
      } catch (error) {
        console.error(`Exception opening port ${this.config.portPath}:`, error);
        reject(error);
      }
    });
  }

  async closeSerialPort(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.serialPort) {
        resolve();
        return;
      }
      
      const closePort = () => {
        if (this.serialPort?.isOpen) {
          console.log(`Closing serial port ${this.config.portPath}...`);
          
          // For Windows, try to reset the port first
          if (process.platform === 'win32') {
            try {
              const { exec } = require('child_process');
              exec(`mode ${this.config.portPath} BAUD=9600 PARITY=N DATA=8 STOP=1 to=off dtr=off rts=off`, (err: any) => {
                if (err) {
                  console.error(`Error resetting port ${this.config.portPath} using mode command:`, err);
                } else {
                  console.log(`Successfully reset port ${this.config.portPath} using mode command`);
                }
                // Continue with closing the port
                this.serialPort?.close((err) => {
                  if (err) {
                    console.error(`Error closing port ${this.config.portPath}:`, err);
                  } else {
                    console.log(`Successfully closed port ${this.config.portPath}`);
                  }
                  this.serialPort = null;
                  resolve();
                });
              });
            } catch (e) {
              console.error(`Error during Windows port reset:`, e);
              // Continue with normal close if reset fails
              this.serialPort?.close((err) => {
                if (err) {
                  console.error(`Error closing port ${this.config.portPath}:`, err);
                } else {
                  console.log(`Successfully closed port ${this.config.portPath}`);
                }
                this.serialPort = null;
                resolve();
              });
            }
          } else {
            this.serialPort.close((err) => {
              if (err) {
                console.error(`Error closing port ${this.config.portPath}:`, err);
              } else {
                console.log(`Successfully closed port ${this.config.portPath}`);
              }
              this.serialPort = null;
              resolve();
            });
          }
        } else {
          console.log(`Port ${this.config.portPath} is already closed`);
          this.serialPort = null;
          resolve();
        }
      };
      
      // For Windows, sometimes we need to forcibly drain the port first
      if (process.platform === 'win32' && this.serialPort.isOpen) {
        console.log(`Attempting to drain port ${this.config.portPath} before closing...`);
        try {
          // Drain any pending data
          this.serialPort.flush((err) => {
            if (err) {
              console.error(`Error flushing port ${this.config.portPath}:`, err);
            }
            // Continue with close regardless of flush success
            closePort();
          });
        } catch (e) {
          console.error(`Exception during port flush attempt:`, e);
          closePort();
        }
      } else {
        closePort();
      }
    });
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('=== TOKEN FLOW [1] ===');
      console.log('Attempting IziPay login in izipayPOSService.login');
      console.log('Login credentials:', { username });
      
      // Use the izipayService login method instead of reimplementing it
      const success = await this.izipayService.login(username, password);
      
      if (success) {
        // Get the token from izipayService and store it in this class too
        this.token = this.izipayService.getToken();
        console.log('=== TOKEN FLOW [2] ===');
        console.log('Token received:', this.token);
        console.log('Token stored successfully');
        return true;
      }

      console.log('=== TOKEN FLOW [ERROR] ===');
      console.log('Login failed, no valid token received');
      this.token = null;
      return false;
    } catch (error) {
      console.error('IziPay login error:', error);
      this.token = null;
      return false;
    }
  }

  async processPayment(amount: number): Promise<any> {
    try {
      console.log('[IZIPAY-POS] Starting payment process for amount:', amount);
      
      // Only try to initialize if the port is completely null (not just closed)
      if (!this.serialPort) {
        console.log('[IZIPAY-POS] Port not initialized, attempting to initialize...');
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize POS connection');
        }
      }

      console.log('[IZIPAY-POS] Current connection status:', {
        isPortConnected: !!this.serialPort,
        isSerialPortOpen: this.serialPort?.isOpen,
        portPath: this.config.portPath
      });

      // Always authenticate before processing payment to ensure fresh token
      console.log('[IZIPAY-POS] Attempting to authenticate before payment...');
      await this.authenticate();
      console.log('[IZIPAY-POS] Authentication completed. New token state:', this.token ? 'Token received' : 'No token received');

      if (!this.token) {
        console.error('[IZIPAY-POS] Authentication succeeded but no token was set');
        throw new Error('Authentication failed - no token available');
      }

      // Format amount according to Izipay specs (amount in cents)
      const formattedAmount = Math.round(amount * 100).toString();
      console.log('[IZIPAY-POS] Formatted amount:', formattedAmount);

      // esto es del izipaytestmodal, ya ha sido probado y funciona
      // const transaction = {
      //   ecr_transaccion: "01",
      //   ecr_amount: '110',
      //   ecr_aplicacion: 'POS',
      //   ecr_currency_code: '604'
      // };

      // Prepare transaction request
      const transactionRequest = {
        ecr_aplicacion: "POS",
        ecr_transaccion: "01",
        ecr_amount: formattedAmount,
        ecr_currency_code: "604", // PEN (Peruvian Sol)
        token: this.token // Include the authentication token
      };
      console.log('[IZIPAY-POS] Prepared transaction request:', JSON.stringify(transactionRequest, null, 2));

      // Before sending to POS, release the port for API access
      console.log('[IZIPAY-POS] Releasing port for API access...');
      await this.releasePortForApiAccess();

      // Check available COM ports before proceeding
      const { listSerialPorts } = require('./serialPortTest');
      const availablePorts = await listSerialPorts(true);
      console.log('[IZIPAY-POS] Available COM ports:', availablePorts);
      
      if (!availablePorts.includes(this.config.portPath)) {
        console.error('[IZIPAY-POS] Target COM port not available:', this.config.portPath);
        throw new Error(`COM port ${this.config.portPath} is not available`);
      }

      // Send transaction to POS terminal
      console.log('[IZIPAY-POS] Sending transaction to POS terminal...');
      const response = await this.sendToPOS(transactionRequest);
      console.log('[IZIPAY-POS] Received response from POS terminal:', response);
      return response;
    } catch (error: any) {
      console.error('[IZIPAY-POS] Payment processing error:', error);
      console.error('[IZIPAY-POS] Error details:', {
        message: error.message,
        stack: error.stack,
        token: this.token ? 'Token exists' : 'No token',
        connectionStatus: {
          isPortConnected: !!this.serialPort,
          isSerialPortOpen: this.serialPort?.isOpen,
          portPath: this.config.portPath
        }
      });
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    try {
      console.log('[IZIPAY-POS] Starting authentication process...');
      const username = this.config.credentials.username;
      const password = this.config.credentials.password;
      
      console.log('[IZIPAY-POS] Using credentials for authentication');
      
      // Use the izipayService to handle authentication
      const success = await this.izipayService.login(username, password);
      
      if (!success) {
        throw new Error('Authentication failed');
      }
      
      // Get the token from izipayService
      this.token = this.izipayService.getToken();
      console.log('[IZIPAY-POS] Authentication successful, token obtained');
    } catch (error: any) {
      console.error('[IZIPAY-POS] Authentication error:', error);
      console.error('[IZIPAY-POS] Authentication error details:', {
        message: error.message,
        stack: error.stack,
        config: {
          apiUrl: this.config.apiUrl,
          username: this.config.credentials.username
        }
      });
      
      // Provide specific error messages for common issues
      if (error.message && error.message.includes('ECONNREFUSED')) {
        throw new Error('Failed to connect to Izipay API - service may not be running on localhost:9090');
      } else if (error.message && error.message.includes('ETIMEDOUT')) {
        throw new Error('Izipay API connection timeout - check network connectivity');
      } else if (error.message && error.message.includes('Authentication failed')) {
        throw new Error('Izipay API authentication failed - check credentials or service status');
      } else {
        throw new Error(`Izipay API error: ${error.message || 'Unknown error'}`);
      }
    }
  }

  private async sendToPOS(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.serialPort) {
        console.error('[IZIPAY-POS] Serial port not initialized');
        reject(new Error('Serial port not initialized'));
        return;
      }

      console.log('[IZIPAY-POS] Preparing POS request with token:', this.token ? 'Token exists' : 'No token');

      // Add authentication token to the request headers
      const requestWithAuth = {
        ...data,
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      };
      console.log('[IZIPAY-POS] Request with auth headers:', JSON.stringify(requestWithAuth, null, 2));

      // Convert data to string format expected by POS
      const command = this.formatPOSCommand(requestWithAuth);
      console.log('[IZIPAY-POS] Formatted POS command:', command);

      this.serialPort.write(command, (error) => {
        if (error) {
          console.error('[IZIPAY-POS] Error writing to serial port:', error);
          reject(error);
          return;
        }

        console.log('[IZIPAY-POS] Command written to serial port, waiting for response...');

        // Set up a one-time listener for the response
        this.once('response', (response) => {
          console.log('[IZIPAY-POS] Received response from POS:', response);
          resolve(response);
        });

        // Set up a timeout
        setTimeout(() => {
          console.error('[IZIPAY-POS] POS response timeout after 30 seconds');
          reject(new Error('POS response timeout'));
        }, 30000); // 30 second timeout
      });
    });
  }

  private formatPOSCommand(data: any): string {
    // Format according to IziPay POS protocol, now including the token
    return `${data.ecr_aplicacion}|${data.ecr_transaccion}|${data.ecr_amount}|${data.ecr_currency_code}|${data.token}\n`;
  }

  getToken(): string | null {
    // Check both our local token and the izipayService token
    const serviceToken = this.izipayService.getToken();
    
    // If there's a mismatch, sync with the izipayService token
    if (this.token !== serviceToken) {
      if (this.verbose) {
        console.log('Token mismatch detected between POS service and base service, syncing...');
      }
      this.token = serviceToken;
    }
    
    return this.token;
  }

  async ensureValidToken(): Promise<boolean> {
    try {
      if (this.verbose) {
        console.log('Ensuring valid token...');
      }
      // Always get a fresh token before transaction
      const loginResult = await this.login(this.config.credentials.username, this.config.credentials.password);
      if (this.verbose) {
        console.log('Token validation result:', loginResult);
      }
      return loginResult;
    } catch (error) {
      console.error('Error ensuring valid token:', error);
      return false;
    }
  }

  clearToken() {
    if (this.verbose) {
      console.log('Clearing token in IzipayPOSService');
    }
    this.token = null;
    
    // Also clear token in the izipayService
    this.izipayService.clearToken();
  }

  // Method to check if the port is open
  isPortOpen(): boolean {
    return !!(this.serialPort && this.serialPort.isOpen);
  }

  // Method to check port status
  getPortStatus(): { connected: boolean; portPath?: string } {
    return {
      connected: this.isPortOpen(),
      portPath: this.isPortOpen() ? this.config.portPath : undefined
    };
  }

  // Call this when disposing the service
  async dispose(): Promise<void> {
    console.log('Disposing IzipayPOSService...');
    await this.closeSerialPort();
    this.clearToken();
    this.removeAllListeners();
  }

  // Add a method to release the port before API operations
  async releasePortForApiAccess(): Promise<void> {
    // If we have the port open, we need to close it so the API can access it
    if (this.isPortOpen()) {
      console.log(`Releasing port ${this.config.portPath} for API access...`);
      
      try {
        // First try the normal close
        await this.closeSerialPort();
        
        // Double-check it's really closed
        if (this.serialPort && this.serialPort.isOpen) {
          console.log('Port still open after first close attempt, trying forceful close...');
          
          // Try more aggressively to close it
          this.serialPort.close((err) => {
            if (err) {
              console.error(`Error in forceful close of port ${this.config.portPath}:`, err);
            } else {
              console.log(`Forceful close of port ${this.config.portPath} successful`);
            }
          });
          
          // Null out the reference to ensure we don't try to use it
          this.serialPort = null;
        }

        // For Windows, try additional cleanup
        if (process.platform === 'win32') {
          try {
            // Try to use mode command to reset the COM port
            const { exec } = require('child_process');
            exec(`mode ${this.config.portPath} BAUD=9600 PARITY=N DATA=8 STOP=1 to=off dtr=off rts=off`, (err: any) => {
              if (err) {
                console.error(`Error resetting port ${this.config.portPath} using mode command:`, err);
              } else {
                console.log(`Successfully reset port ${this.config.portPath} using mode command`);
              }
            });

            // Try to use PowerShell to close any open handles
            exec(`powershell -Command "$port = new-Object System.IO.Ports.SerialPort('${this.config.portPath}', 9600); try { $port.Open(); $port.Close(); } catch { }"`, (err: any) => {
              if (err) {
                console.error(`Error closing handles to port ${this.config.portPath} using PowerShell:`, err);
              } else {
                console.log(`Successfully closed handles to port ${this.config.portPath} using PowerShell`);
              }
            });
          } catch (e) {
            console.error(`Error during Windows-specific port cleanup:`, e);
          }
        }
        
        // Add a delay to ensure the port is fully released
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`Port ${this.config.portPath} released for API access`);
      } catch (error) {
        console.error(`Error releasing port ${this.config.portPath}:`, error);
        // Ensure we don't leave references to problematic port objects
        this.serialPort = null;
      }
    } else {
      console.log(`Port ${this.config.portPath} is already closed`);
    }
  }

  /**
   * Process a payment transaction
   * @param transaction Transaction details
   * @returns Promise with transaction result
   */
  public async processTransaction(transaction: IzipayTransaction): Promise<any> {
    try {
      // Before sending to POS, release the port for API access
      console.log('[IZIPAY-POS] Releasing port for API access...');
      await this.releasePortForApiAccess();

      // Check available COM ports before proceeding
      const { listSerialPorts } = require('./serialPortTest');
      const availablePorts = await listSerialPorts(true);
      console.log('[IZIPAY-POS] Available COM ports:', availablePorts);
      
      if (!availablePorts.includes(this.config.portPath)) {
        console.error('[IZIPAY-POS] Target COM port not available:', this.config.portPath);
        throw new Error(`COM port ${this.config.portPath} is not available`);
      }

      // Send transaction to API
      console.log('[IZIPAY-POS] Sending transaction:', transaction);
      const response = await this.sendTransaction(transaction);
      
      console.log('[IZIPAY-POS] Transaction response:', response);
      return response;
    } catch (error) {
      console.error('[IZIPAY-POS] Transaction error:', error);
      throw error;
    }
  }

  /**
   * Send a transaction to the Izipay API
   * @param transaction Transaction details
   * @returns Promise with API response
   */
  private async sendTransaction(transaction: IzipayTransaction): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiUrl}/procesarTransaccion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.config.credentials.username}:${this.config.credentials.password}`).toString('base64')}`
        },
        body: JSON.stringify(transaction)
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[IZIPAY-POS] API request error:', error);
      throw error;
    }
  }
}