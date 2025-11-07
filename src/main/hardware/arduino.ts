import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';
import { ReadlineParser } from '@serialport/parser-readline';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * SerialDeviceController handles communication with the microcontroller that controls
 * the vending machine's dispensing mechanism via a USB-SERIAL CH340 adapter.
 */
export class ArduinoController extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private isConnected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private commandQueue: string[] = [];
  private isProcessingCommand: boolean = false;
  private portPath: string;
  private baudRate: number;
  private alternativePorts: string[] = [];
  private currentPortIndex: number = 0;
  private attemptedPorts: Set<string> = new Set();
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private deviceType: string = 'USB-SERIAL CH340';
  
  // 🌡️ NUEVAS PROPIEDADES PARA TEMPERATURA
  private temperatureInterval: NodeJS.Timeout | null = null;
  private currentTemperature: number | null = null;
  private temperatureUpdateCallback: ((temp: number) => void) | null = null;


  constructor(portPath: string = 'COM5', baudRate: number = 9600) {
    super();
    this.portPath = 'COM5'; //cambiar si es necesario
    this.baudRate = baudRate;
    // Initialize with common alternative ports
    this.alternativePorts = ['COM3', 'COM4', 'COM5', 'COM9', 'COM7', 'COM8'];
    // Remove the primary port from alternatives to avoid duplication
    this.alternativePorts = this.alternativePorts.filter(port => port !== this.portPath);
  }
  
  /**
   * Initialize the connection to the serial device
   */
  public async connect(): Promise<boolean> {
    try {
      if (this.isConnected) {
        console.log(`[ARDUINO 1] Already connected to ${this.deviceType} on ${this.portPath}`);
        return true;
      }

      console.log(`[ARDUINO 2] Attempting to connect to ${this.deviceType} on ${this.portPath} at ${this.baudRate} baud`);
      console.log(`[ARDUINO 3] Current time: ${new Date().toISOString()}`);
      console.log(`[ARDUINO 4] Process ID: ${process.pid}`);
      
      // List available ports for debugging
      try {
        const { SerialPort } = require('serialport');
        const ports = await SerialPort.list();
        console.log('[ARDUINO 5] Available serial ports:');
        if (ports.length === 0) {
          console.log('[ARDUINO 6] No serial ports detected on this system');
        }
        
        ports.forEach((port: any) => {
          const manufacturer = port.manufacturer || 'Unknown manufacturer';
          const vendorId = port.vendorId || 'Unknown vendor';
          const productId = port.productId || 'Unknown product';
          console.log(`[ARDUINO 7] - ${port.path} (${manufacturer})`);
          console.log(`[ARDUINO 8]   Vendor ID: ${vendorId}, Product ID: ${productId}`);
          console.log(`[ARDUINO 9]   Path: ${port.path}, pnpId: ${port.pnpId || 'N/A'}`);
          
          // Identify CH340 devices specifically
          if (manufacturer.toLowerCase().includes('wch.cn') || 
              manufacturer.toLowerCase().includes('ch340') || 
              manufacturer.toLowerCase().includes('usb-serial')) {
            console.log(`[ARDUINO 10]   * Detected ${this.deviceType} device`);
          }
        });
      } catch (err) {
        console.error('[ARDUINO 11] Error listing serial ports:', err);
      }
      
      console.log(`[ARDUINO 12] Configuring serial port ${this.portPath} with settings: baudRate=${this.baudRate}, dataBits=8, stopBits=1, parity=none`);
      
      // Configure the serial port with specific settings for CH340
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        rtscts: false,
        xon: false,
        xoff: false,
        autoOpen: false
      });

      return new Promise((resolve, reject) => {
        if (!this.port) {
          console.error('[ARDUINO 13] Serial port not initialized');
          reject(new Error('Serial port not initialized'));
          return;
        }

        console.log(`[ARDUINO 14] Attempting to open port ${this.portPath} with 5 second timeout`);
        
        // Set a timeout for the open operation
        const openTimeout = setTimeout(() => {
          console.error(`[ARDUINO 15] Timeout opening port ${this.portPath} after 5 seconds`);
          this.port?.close();
          resolve(false);
        }, 5000); // 5 second timeout

        this.port.open(async (err) => {
          clearTimeout(openTimeout);
          
          if (err) {
            console.error('[ARDUINO 16] Error opening serial port:', err.message);
            console.error('[ARDUINO 17] Error details:', JSON.stringify(err, null, 2));
            console.error(`[ARDUINO 18] Error code: ${(err as any).code || 'N/A'}, Error syscall: ${(err as any).syscall || 'N/A'}`);
            
            // Try alternative ports
            this.tryAlternativePorts(resolve);
            return;
          }

          // Successfully opened the port
          console.log(`[ARDUINO 23] Port ${this.portPath} opened successfully`);
          
          // Set up the parser
          this.parser = this.port!.pipe(new ReadlineParser({ delimiter: '\r\n' }));
          console.log(`[ARDUINO 24] Parser set up with delimiter '\\r\\n'`);
          
          // Set up event listeners
          this.setupEventListeners();
          console.log(`[ARDUINO 25] Event listeners set up`);
          
          // Mark as connected
          this.isConnected = true;
          console.log(`[ARDUINO 26] Successfully connected to ${this.deviceType} on ${this.portPath}`);
          
          // Initialize temperature system after successful connection
          await this.initializeTemperatureSystem();
          
          // Process any queued commands
          if (this.commandQueue.length > 0) {
            console.log(`[ARDUINO 27] Processing ${this.commandQueue.length} queued commands`);
          }
          this.processCommandQueue();
          
          resolve(true);
        });
      });
    } catch (error) {
      console.error(`[ARDUINO 28] Error connecting to ${this.deviceType}:`, error);
      console.error('[ARDUINO 29] Stack trace:', (error as Error).stack);
      return false;
    }
  }

  /**
   * Try alternative ports when the current port fails
   */
  private tryAlternativePorts(resolve: (value: boolean) => void): void {
    // Reset connection attempts for the next port
    this.connectionAttempts = 0;
    
    // Try an alternative port if we've exhausted retries
    if (this.alternativePorts.length > 0) {
      const nextPort = this.alternativePorts[this.currentPortIndex];
      this.currentPortIndex = (this.currentPortIndex + 1) % this.alternativePorts.length;
      
      console.log(`Trying alternative port: ${nextPort}`);
      this.portPath = nextPort;
      
      // Try to connect to the alternative port
      this.connect().then(resolve).catch(() => {
        this.startReconnectInterval();
        resolve(false);
      });
    } else {
      console.error('No alternative ports available');
      this.startReconnectInterval();
      resolve(false);
    }
  }

  /**
   * Try to release a port that might be in use by another process
   * This is a more aggressive approach that might help in some cases
   */
  private async releasePort(portPath: string): Promise<void> {
    // This is a Windows-specific approach
    if (process.platform === 'win32') {
      try {
        // Try to use mode command to reset the COM port
        await execAsync(`mode ${portPath} BAUD=9600 PARITY=N DATA=8 STOP=1 to=off dtr=off rts=off`);
        console.log(`Reset port ${portPath} using mode command`);
        
        // Additional Windows-specific approach to close any open handles to the port
        try {
          // This is a more aggressive approach that might help in some cases
          await execAsync(`powershell -Command "$port = new-Object System.IO.Ports.SerialPort('${portPath}', 9600); try { $port.Open(); $port.Close(); } catch { }"`, { timeout: 3000 });
          console.log(`Attempted to close any open handles to ${portPath} using PowerShell`);
        } catch (err) {
          // Ignore errors from this command
        }
        
        // Try to use devcon to disable and re-enable the device
        try {
          // Note: This requires devcon.exe to be installed and in the PATH
          // This is a very aggressive approach and should be used with caution
          const devconPath = process.env.DEVCON_PATH || 'devcon';
          await execAsync(`${devconPath} restart =ports ${portPath}`, { timeout: 5000 });
          console.log(`Attempted to restart ${portPath} using devcon`);
          
          // Add a delay after restarting the device
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          // Ignore errors from this command as devcon might not be available
        }
        
        // Try to use net stop/start to restart the serial port service
        try {
          await execAsync('net stop "Serial port service" && net start "Serial port service"', { timeout: 5000 });
          console.log('Attempted to restart serial port service');
          
          // Add a delay after restarting the service
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          // Ignore errors from this command as the service might not exist
        }
      } catch (err) {
        console.error(`Failed to reset port ${portPath} using mode command:`, err);
      }
    }
  }

  /**
   * Try connecting to a specific port
   * @param portPath The port path to try
   * @returns Promise that resolves with connection success
   */
  public async tryPort(portPath: string): Promise<boolean> {
    if (this.isConnected) {
      this.disconnect();
    }
    
    this.portPath = portPath;
    this.connectionAttempts = 0;
    return this.connect();
  }

  /**
   * Try to forcefully reconnect by closing and reopening the port
   */
  public async forceReconnect(): Promise<boolean> {
    console.log(`Forcing reconnection to ${this.deviceType}...`);
    
    // Disconnect if connected
    if (this.isConnected) {
      this.disconnect();
    }
    
    // Try to release the port
    try {
      await this.releasePort(this.portPath);
      
      // Add a small delay after releasing the port
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error('Error releasing port during force reconnect:', err);
    }
    
    // Reset connection attempts
    this.connectionAttempts = 0;
    
    // Try to connect again
    return this.connect();
  }

  /**
   * Set up event listeners for the serial port
   */
  private setupEventListeners(): void {
    if (!this.port || !this.parser) {
      console.log('[ARDUINO 30] Cannot set up event listeners: port or parser is null');
      return;
    }

    console.log('[ARDUINO 31] Setting up event listeners for serial port');
    
    this.port.on('error', (err) => {
      console.error('[ARDUINO 32] Serial port error:', err.message);
      console.error('[ARDUINO 33] Error details:', JSON.stringify(err, null, 2));
      this.handleDisconnect();
    });

    this.port.on('close', () => {
      console.log('[ARDUINO 34] Serial port closed');
      this.handleDisconnect();
    });

    this.parser.on('data', (data: string) => {
      console.log(`[ARDUINO 35] Received data from ${this.deviceType}:`, data);
      this.emit('data', data);
      
      // Handle specific microcontroller responses
      if (data.includes('ONOK')) {
        console.log(`[ARDUINO 36] Board has just powered on`);
        this.emit('boardPoweredOn');
      } else if (data.includes('INOK')) {
        console.log(`[ARDUINO 37] Board is ready to receive a new command`);
        this.isProcessingCommand = false;
        this.processCommandQueue();
      } else if (data.includes('RCVOK')) {
        console.log(`[ARDUINO 38] Board received the initiation command`);
        this.emit('initCommandReceived');
      } else if (data.includes('MMOK')) {
        console.log(`[ARDUINO 40] Board received the motor move command`);
        this.emit('motorCommandReceived');
      } else if (data.includes('SNOK')) {
        console.log(`[ARDUINO 41] Sensor activated - product has dropped`);
        this.emit('sensorActivated', true);
      } else if (data.includes('SNFLD')) {
        console.error(`[ARDUINO 42] Sensor failed - product did not drop`);
        this.emit('sensorActivated', false);
      } else if (data.includes('STPOK')) {
        console.log(`[ARDUINO 43] Product dispensing process completed`);
        this.emit('productDispensed');
        this.isProcessingCommand = false;
        this.processCommandQueue();
      } else if (data.includes('ERROR')) {
        console.error(`[ARDUINO 44] Error response from board:`, data);
        this.isProcessingCommand = false;
        this.processCommandQueue();
      }
      
      // 🚀 CAPTURAR TODOS LOS MENSAJES DE ERROR DEL ARDUINO
      // Capturar errores específicos de motores y formato
      if (data.includes('Error: Se excedio el maximo de 10 motores')) {
        console.error(`[ARDUINO ERROR] 🚨 MOTOR LIMIT EXCEEDED: Maximum of 10 motors exceeded`);
        this.emit('motorError', { type: 'MOTOR_LIMIT_EXCEEDED', message: data });
      } else if (data.includes('Error: Numero de motor invalido o fuera de rango')) {
        console.error(`[ARDUINO ERROR] 🚨 INVALID MOTOR NUMBER: Motor number invalid or out of range`);
        this.emit('motorError', { type: 'INVALID_MOTOR_NUMBER', message: data });
      } else if (data.includes('Error: Formato de lista de motores invalido')) {
        console.error(`[ARDUINO ERROR] 🚨 INVALID MOTOR LIST FORMAT: Motor list format is invalid`);
        this.emit('motorError', { type: 'INVALID_MOTOR_LIST_FORMAT', message: data });
      } else if (data.includes('ERROR:') && data.includes('%d')) {
        console.error(`[ARDUINO ERROR] 🚨 GENERAL OPERATION ERROR: ${data}`);
        this.emit('motorError', { type: 'GENERAL_OPERATION_ERROR', message: data });
      }
      
      // Capturar cualquier otro mensaje que contenga "Error:" o "ERROR:"
      if (data.toLowerCase().includes('error:') || data.toLowerCase().includes('error ')) {
        console.error(`[ARDUINO ERROR] 🚨 UNKNOWN ERROR: ${data}`);
        this.emit('motorError', { type: 'UNKNOWN_ERROR', message: data });
      }

      // 🌡️ MANEJO DE RESPUESTAS DE TEMPERATURA
      if (data.includes('TEMP:')) {
        console.log(`[ARDUINO TEMP] Temperature response received: ${data}`);
        // Extraer temperatura del formato "TEMP: 7.18 C"
        const tempMatch = data.match(/TEMP:\s*([\d.]+)\s*C/);
        if (tempMatch) {
          const temperature = parseFloat(tempMatch[1]);
          this.currentTemperature = temperature;
          console.log(`[ARDUINO TEMP] Parsed temperature: ${temperature}°C`);
          
          this.emit('temperatureUpdate', temperature);
          
          // Llamar callback si existe
          if (this.temperatureUpdateCallback) {
            this.temperatureUpdateCallback(temperature);
          }
        }
      }
    });
    
    console.log('[ARDUINO 45] Event listeners set up successfully');
  }

  /**
   * Handle disconnection by cleaning up and attempting to reconnect
   */
  private handleDisconnect(): void {
    if (!this.isConnected) return; // Already disconnected
    
    this.isConnected = false;
    this.isProcessingCommand = false;
    
    if (this.port) {
      try {
        this.port.close();
      } catch (e) {
        console.error('Error closing port:', e);
      }
    }
    
    this.port = null;
    this.parser = null;
    
    this.emit('disconnect');
    this.startReconnectInterval();

    // Clean up temperature monitoring
    this.stopTemperatureMonitoring();
    this.currentTemperature = null;
    this.temperatureUpdateCallback = null;
  }

  /**
   * Start the reconnection interval if not already running
   */
  private startReconnectInterval(): void {
    if (!this.reconnectInterval) {
      console.log('Starting reconnect interval');
      this.reconnectInterval = setInterval(() => {
        console.log(`Attempting to reconnect to ${this.deviceType}...`);
        this.connect().then(connected => {
          if (connected && this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
        });
      }, 5000); // Try to reconnect every 5 seconds
    }
  }

  /**
   * Disconnect from the serial device
   */
  public disconnect(): void {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.port) {
      this.port.close((err) => {
        if (err) {
          console.error('Error closing serial port:', err.message);
        } else {
          console.log('Serial port closed successfully');
        }
      });
    }

    this.isConnected = false;
    this.port = null;
    this.parser = null;
  }

  /**
   * Send a command to the serial device
   * @param command The command to send
   * @returns Promise that resolves when the command is sent
   */
  public sendCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        console.log(`[ARDUINO 44] Not connected to ${this.deviceType}, queueing command: ${command}`);
        console.log(`[ARDUINO 45] Connection status: connected=${this.isConnected}, portPath=${this.portPath}, baudRate=${this.baudRate}`);
        this.commandQueue.push(command);
        this.connect(); // Try to connect
        resolve();
        return;
      }

      if (this.isProcessingCommand) {
        console.log(`[ARDUINO 46] Already processing a command, queueing: ${command}`);
        console.log(`[ARDUINO 47] Current command queue length: ${this.commandQueue.length}`);
        this.commandQueue.push(command);
        resolve();
        return;
      }

      if (!this.port) {
        console.error(`[ARDUINO 48] Serial port not initialized, cannot send command: ${command}`);
        reject(new Error('Serial port not initialized'));
        return;
      }

      console.log(`[ARDUINO 49] Sending command to ${this.deviceType}: ${command}`);
      this.isProcessingCommand = true;
      
      // Add a newline to the command
      const fullCommand = command + '\n';
      
      this.port.write(fullCommand, (err) => {
        if (err) {
          console.error(`[ARDUINO 50] Error writing to serial port: ${err.message}`);
          console.error(`[ARDUINO 51] Error details:`, JSON.stringify(err, null, 2));
          this.isProcessingCommand = false;
          reject(err);
          return;
        }
        
        // Drain ensures all data is sent before resolving
        this.port!.drain((drainErr) => {
          if (drainErr) {
            console.error(`[ARDUINO 52] Error draining serial port: ${drainErr.message}`);
            console.error(`[ARDUINO 53] Error details:`, JSON.stringify(drainErr, null, 2));
            this.isProcessingCommand = false;
            reject(drainErr);
            return;
          }
          
          console.log(`[ARDUINO 54] Command sent successfully: ${command}`);
          
          // Set a timeout for command response
          setTimeout(() => {
            if (this.isProcessingCommand) {
              console.log(`[ARDUINO 55] Command response timeout for: ${command}, processing next command`);
              this.isProcessingCommand = false;
              this.processCommandQueue();
            }
          }, 3000); // 3 second timeout for response
          
          
          resolve();
        });
      });
    });
  }

  /**
   * Process the next command in the queue
   */
  private processCommandQueue(): void {
    if (this.commandQueue.length === 0 || this.isProcessingCommand || !this.isConnected) {
      return;
    }

    const nextCommand = this.commandQueue.shift();
    if (nextCommand) {
      this.sendCommand(nextCommand).catch(err => {
        console.error('Error processing queued command:', err);
        this.isProcessingCommand = false;
        this.processCommandQueue();
      });
    }
  }

  /**
   * Dispense a product from the vending machine
   * @param motorNumber The motor number corresponding to the product slot
   * @returns Promise that resolves when the product is dispensed
   */
  public async dispenseProduct(motorNumber: string): Promise<void> {
    console.log(`[ARDUINO 56] Dispense product request received for motor ${motorNumber}`);
    
    if (!this.isConnected) {
      console.error(`[ARDUINO 57] ${this.deviceType} not connected. Cannot dispense product.`);
      console.log(`[ARDUINO 58] Please ensure the ${this.deviceType} is properly connected to ${this.portPath} and no other application is using the port.`);
      console.log(`[ARDUINO 59] Connection status: connected=${this.isConnected}, portPath=${this.portPath}, baudRate=${this.baudRate}`);
      
      return Promise.reject(new Error(`Cannot dispense product: ${this.deviceType} not connected to ${this.portPath}`));
    }
    
    // Check if Arduino is currently processing a command
    if (this.isProcessingCommand) {
      console.log(`[ARDUINO 59.1] Arduino is currently processing a command, waiting...`);
      console.log(`[ARDUINO 59.2] Command queue length: ${this.commandQueue.length}`);
      
      // Wait for current command to complete
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isProcessingCommand) {
            clearInterval(checkInterval);
            console.log(`[ARDUINO 59.3] Arduino is now ready for new command`);
            resolve();
          }
        }, 100);
      });
    }
    
    return new Promise((resolve, reject) => {
      // Step 1: Set up listeners for the complete dispensing sequence
      const onMotorCommandReceived = () => {
        console.log(`[ARDUINO 60] Motor command received for motor ${motorNumber}`);
        // Wait for sensor activation
      };
      
      const onSensorActivated = (activated: boolean) => {
        if (activated) {
          console.log(`[ARDUINO 61] Sensor detected product drop for motor ${motorNumber}`);
          // Wait for STPOK which confirms the entire process is complete
        } else {
          console.error(`[ARDUINO 62] Sensor failed to detect product drop for motor ${motorNumber}`);
          console.log(`[ARDUINO 62.1] This might indicate a hardware issue or product stuck in slot`);
          // We still wait for STPOK, but log this as a potential issue
        }
      };
      
      let onProductDispensed = () => {
        console.log(`[ARDUINO 63] Product dispensing process completed for motor ${motorNumber}`);
        this.removeAllDispenseListeners();
        
        // Add a delay before resolving to ensure Arduino is ready for next command
        setTimeout(() => {
          console.log(`[ARDUINO 63.1] Resolving dispense promise for motor ${motorNumber} after delay`);
          resolve();
        }, 1000); // 1 second delay
      };
      
      const removeAllDispenseListeners = () => {
        this.removeListener('motorCommandReceived', onMotorCommandReceived);
        this.removeListener('sensorActivated', onSensorActivated);
        this.removeListener('productDispensed', onProductDispensed);
      };
      
      this.removeAllDispenseListeners = removeAllDispenseListeners;
      
      // Set up the listeners for the dispensing sequence
      this.on('motorCommandReceived', onMotorCommandReceived);
      this.on('sensorActivated', onSensorActivated);
      this.on('productDispensed', onProductDispensed);

      // Step 2: Send the motor command directly in the format M{motorNumber}F
      const motorCommand = `M${motorNumber}F`;
      console.log(`[ARDUINO 64] Sending motor command: ${motorCommand}`);
      
      // Add a timeout for the entire dispensing process
      const dispenseTimeout = setTimeout(() => {
        console.error(`[ARDUINO 64.1] Dispense timeout for motor ${motorNumber} after 10 seconds`);
        removeAllDispenseListeners();
        reject(new Error(`Dispense timeout for motor ${motorNumber}`));
      }, 10000); // 10 second timeout for entire process
      
      this.sendCommand(motorCommand).catch((error: any) => {
        clearTimeout(dispenseTimeout);
        removeAllDispenseListeners();
        reject(new Error(`Failed to send motor command: ${error.message}`));
      });
      
      // Clear timeout when dispense completes
      const originalOnProductDispensed = onProductDispensed;
      onProductDispensed = () => {
        clearTimeout(dispenseTimeout);
        originalOnProductDispensed();
      };
    });
  }

  // Helper property to store the current removal function for dispensing listeners
  private removeAllDispenseListeners: () => void = () => {};

  /**
   * Check if a product is available in a specific slot
   * @param slotId The ID of the slot to check
   * @returns Promise that resolves with the availability status
   */
  public async checkProductAvailability(slotId: string): Promise<boolean> {
    if (!this.isConnected) {
      console.error(`[ARDUINO 63] ${this.deviceType} not connected. Cannot check product availability for slot ${slotId}.`);
      
      // For testing purposes, assume the product is available
      return Promise.resolve(true);
    }
    
    return new Promise((resolve, reject) => {
      const command = `CHECK ${slotId}`;
      
      // Set up a one-time listener for the response
      const responseHandler = (data: string) => {
        if (data.includes(`CHECK ${slotId}`)) {
          this.removeListener('data', responseHandler);
          resolve(data.includes('AVAILABLE'));
        }
      };
      
      this.on('data', responseHandler);
      
      // Set a timeout in case we don't get a response
      const timeout = setTimeout(() => {
        this.removeListener('data', responseHandler);
        reject(new Error('Timeout waiting for product availability check'));
      }, 5000);
      
      this.sendCommand(command).catch(err => {
        clearTimeout(timeout);
        this.removeListener('data', responseHandler);
        reject(err);
      });
    });
  }

  /**
   * Get the status of the vending machine
   * @returns Promise that resolves with the status
   */
  public async getStatus(): Promise<{ [key: string]: any }> {
    if (!this.isConnected) {
      return {
        connected: false,
        deviceType: this.deviceType,
        portPath: this.portPath,
        baudRate: this.baudRate
      };
    }
    
    return new Promise((resolve, reject) => {
      const command = 'STATUS';
      
      // Set up a one-time listener for the response
      const responseHandler = (data: string) => {
        if (data.includes('STATUS')) {
          this.removeListener('data', responseHandler);
          
          try {
            // Parse the status response
            const statusJson = data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1);
            const status = JSON.parse(statusJson);
            resolve({
              ...status,
              connected: true,
              deviceType: this.deviceType,
              portPath: this.portPath,
              baudRate: this.baudRate
            });
          } catch (e) {
            // If we can't parse the JSON, return a basic status
            resolve({
              connected: true,
              deviceType: this.deviceType,
              portPath: this.portPath,
              baudRate: this.baudRate,
              rawResponse: data
            });
          }
        }
      };
      
      this.on('data', responseHandler);
      
      // Set a timeout in case we don't get a response
      const timeout = setTimeout(() => {
        this.removeListener('data', responseHandler);
        // Don't reject, just return basic status
        resolve({
          connected: true,
          deviceType: this.deviceType,
          portPath: this.portPath,
          baudRate: this.baudRate,
          error: 'Timeout waiting for status'
        });
      }, 5000);
      
      this.sendCommand(command).catch(err => {
        clearTimeout(timeout);
        this.removeListener('data', responseHandler);
        // Don't reject, just return basic status with error
        resolve({
          connected: true,
          deviceType: this.deviceType,
          portPath: this.portPath,
          baudRate: this.baudRate,
          error: `Error sending status command: ${err.message}`
        });
      });
    });
  }

  /**
   * Get the port path
   * @returns The port path
   */
  public getPortPath(): string {
    return this.portPath;
  }

  /**
   * Get the baud rate
   * @returns The baud rate
   */
  public getBaudRate(): number {
    return this.baudRate;
  }

  /**
   * Get the connection status
   * @returns Connection status object
   */
  public getConnectionStatus(): { connected: boolean; deviceType: string; portPath: string; baudRate: number; attemptedPorts: string[] } {
    return {
      connected: this.isConnected,
      deviceType: this.deviceType,
      portPath: this.portPath,
      baudRate: this.baudRate,
      attemptedPorts: Array.from(this.attemptedPorts)
    };
  }

  /**
   * Set initial temperature from database
   * @param temperature Temperature value from database
   */
  public async setInitialTemperature(temperature: number): Promise<void> {
    // Redondear temperatura a entero para el comando
    const tempInt = Math.round(temperature);
    
    if (!this.isConnected) {
      console.log(`[ARDUINO TEMP] Not connected, queueing initial temperature command: I32,${tempInt}S`);
      this.commandQueue.push(`I32,${tempInt}S`);
      this.commandQueue.push('fan1');
      return;
    }

    const command = `I32,${tempInt}S`;
    console.log(`[ARDUINO TEMP] Setting initial temperature: ${command}`);
    await this.sendCommand(command);
    
    // Send fan1 command after temperature initialization
    console.log(`[ARDUINO TEMP] Sending fan1 command after temperature initialization`);
    await this.sendCommand('fan1');
  }

  /**
   * Get the last temperature from database
   */
  private async getLastTemperatureFromDB(): Promise<number | null> {
    try {
      // Import the database connection function
      const { withConnection } = require('../database/dbConnection');
      
      const rows = await withConnection(async (connection: any) => {
        const [result] = await connection.query('SELECT FS_TEMP FROM TA_TEMP ORDER BY FD_FEC_TEMP DESC LIMIT 1');
        return result;
      });
      
      return Array.isArray(rows) && rows.length > 0 ? rows[0].FS_TEMP : null;
    } catch (error) {
      console.error('[ARDUINO TEMP] Error fetching last temperature from DB:', error);
      return null;
    }
  }

  /**
   * Get the last temperature from database and send initialization command
   */
  public async initializeTemperatureSystem(): Promise<void> {
    try {
      console.log('[ARDUINO TEMP] Initializing temperature system...');
      
      // Get last temperature from database
      let lastTemp = await this.getLastTemperatureFromDB();
      
      // Si no hay temperatura previa, usar temperatura por defecto
      if (lastTemp === null) {
        lastTemp = 13; // Temperatura por defecto en grados Celsius
        console.log(`[ARDUINO TEMP] No previous temperature found, using default: ${lastTemp}°C`);
      } else {
        console.log(`[ARDUINO TEMP] Using last temperature from database: ${lastTemp}°C`);
      }
      
      // Redondear temperatura a entero para el comando
      const tempInt = Math.round(lastTemp);
      const initCommand = `I32,${tempInt}S`;
      console.log(`[ARDUINO TEMP] Sending initialization command: ${initCommand}`);
      
      if (!this.isConnected) {
        console.log(`[ARDUINO TEMP] Not connected, queueing init command: ${initCommand}`);
        this.commandQueue.push(initCommand);
        this.commandQueue.push('fan1');
        return;
      }
      
      // Send temperature initialization command
      this.sendCommand(initCommand).then(() => {
        console.log(`[ARDUINO TEMP] Temperature system initialized with temp: ${lastTemp}°C`);
        
        // Send fan1 command after temperature initialization
        console.log(`[ARDUINO TEMP] Sending fan1 command after temperature initialization`);
        this.sendCommand('fan1').then(() => {
          console.log(`[ARDUINO TEMP] Fan1 command sent successfully`);
        }).catch((error) => {
          console.error('[ARDUINO TEMP] Error sending fan1 command:', error);
        });
      }).catch((error) => {
        console.error('[ARDUINO TEMP] Error sending init command:', error);
      });
    } catch (error) {
      console.error('[ARDUINO TEMP] Error initializing temperature system:', error);
    }
  }

  /**
   * Request temperature (every 2 minutes)
   */
  public async requestTemperature(): Promise<void> {
    if (!this.isConnected) {
      console.log(`[ARDUINO TEMP] Not connected, queueing temperature request: I30S`);
      this.commandQueue.push('I30S');
      return;
    }

    const command = 'I30S';
    console.log(`[ARDUINO TEMP] Requesting temperature: ${command}`);
    
    // Send command without await since sendCommand is not async
    this.sendCommand(command).then(() => {
      console.log(`[ARDUINO TEMP] Temperature request sent: ${command}`);
    }).catch((error) => {
      console.error('[ARDUINO TEMP] Error sending temperature request:', error);
    });
  }

  /**
   * Start temperature monitoring (every 10 seconds)
   */
  public async startTemperatureMonitoring(): Promise<void> {
    console.log('[ARDUINO TEMP] Starting temperature monitoring every 10 seconds');
    
    // Clear existing interval if any
    if (this.temperatureInterval) {
      clearInterval(this.temperatureInterval);
    }

    // Initialize temperature system first - CORREGIR: con await
    await this.initializeTemperatureSystem();

    // Set up interval for every 10 seconds (10000 ms)
    this.temperatureInterval = setInterval(() => {
      console.log('[ARDUINO TEMP] 10-second interval: requesting temperature');
      this.requestTemperature();
    }, 10000);
  }

  /**
   * Stop temperature monitoring
   */
  public stopTemperatureMonitoring(): void {
    console.log('[ARDUINO TEMP] Stopping temperature monitoring');
    if (this.temperatureInterval) {
      clearInterval(this.temperatureInterval);
      this.temperatureInterval = null;
    }
  }

  /**
   * Get current temperature
   */
  public getCurrentTemperature(): number | null {
    return this.currentTemperature;
  }

  /**
   * Set temperature update callback
   */
  public setTemperatureUpdateCallback(callback: (temp: number) => void): void {
    this.temperatureUpdateCallback = callback;
  }

  /**
   * Clean up temperature monitoring on disconnect
   */
}

// Export a singleton instance
export const arduinoController = new ArduinoController(); 