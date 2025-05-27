import { EventEmitter } from 'events';
import { arduinoController, ArduinoController } from './arduino';

import { 
  AgeVerificationResult, 
  AgeVerificationEvent, 
  ageVerificationService 
} from '../ageVerification';
/**
 * Hardware service events
 */
export enum HardwareEvent {
  AGE_VERIFICATION_RESULT = 'age-verification-result',
  PAYMENT_STATUS = 'payment-status',
  PRODUCT_DISPENSED = 'product-dispensed',
  SENSOR_STATUS = 'sensor-status',
  ERROR = 'error'
}
/**
 * Product dispensing result
 */
export interface DispensingResult {
  success: boolean;
  message: string;
  slotId?: string;
  timestamp: number;
  hardwareConnected?: boolean;
  sensorActivated?: boolean;
  details?: {
    deviceType?: string;
    portPath?: string;
    baudRate?: number;
    commandSent?: string;
    responseReceived?: string;
    simulationMode?: boolean;
    attemptedPorts?: string[];
  };
}

/**
 * Hardware service class integrates all hardware components
 */
export class HardwareService extends EventEmitter {
  private arduino: ArduinoController;
  private isInitialized: boolean = false;

  constructor() {
    super();
    
    // Initialize Arduino controller
    this.arduino = arduinoController;
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for hardware components
   */
  private setupEventListeners(): void {
    // Arduino events
    this.arduino.on('data', (data: string) => {
      console.log('Arduino data:', data);
    });
    
    // Listen for specific events from the Arduino controller
    this.arduino.on('sensorActivated', (activated: boolean) => {
      console.log(`[HARDWARE] Sensor ${activated ? 'activated' : 'failed to activate'} - product ${activated ? 'dropped' : 'not detected'}`);
      
      // Emit sensor status event
      this.emit(HardwareEvent.SENSOR_STATUS, {
        success: activated,
        message: activated ? 'Product dropped successfully' : 'Product drop not detected by sensor',
        timestamp: Date.now()
      });
    });
    
    this.arduino.on('productDispensed', () => {
      console.log('[HARDWARE] Product dispensed event received from Arduino');
      // The slotId is stored in the result from the dispenseProduct method
      // We don't emit an event here as that's handled in the dispenseProduct method
    });
    
    this.arduino.on('disconnect', () => {
      console.log('Arduino disconnected');
      this.emit(HardwareEvent.ERROR, {
        component: 'arduino',
        message: 'Arduino disconnected',
        timestamp: Date.now()
      });
    });
    
    // Age verification events
    ageVerificationService.on(AgeVerificationEvent.COMPLETED, (result: AgeVerificationResult) => {
      console.log('Age verification completed:', result);
      this.emit(HardwareEvent.AGE_VERIFICATION_RESULT, result);
    });
    
    ageVerificationService.on(AgeVerificationEvent.FAILED, (result: AgeVerificationResult) => {
      console.log('Age verification failed:', result);
      this.emit(HardwareEvent.AGE_VERIFICATION_RESULT, result);
    });
  }

  /**
   * Initialize all hardware components
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        // console.log('[HARDWARE] Hardware service already initialized');
        return true;
      }
      
      console.log('[HARDWARE] Initializing hardware service...');
      console.log(`[HARDWARE] Current time: ${new Date().toISOString()}`);
      console.log(`[HARDWARE] Process ID: ${process.pid}`);
      
      // Initialize Arduino
      console.log(`[HARDWARE] Using default Arduino controller`);
      
      console.log('[HARDWARE] Attempting to connect to Arduino...');
      const arduinoConnected = await this.arduino.connect();
      if (!arduinoConnected) {
        console.warn('[HARDWARE] Failed to connect to Arduino.');
        console.warn('[HARDWARE] The application will continue but dispensing functions will not work.');
      } else {
        console.log('[HARDWARE] Successfully connected to Arduino');
      }
      
      // Bypass payment processor initialization for now
      console.log('[HARDWARE] Bypassing payment processor initialization to focus on microcontroller');
      
      this.isInitialized = true;
      console.log('[HARDWARE] Hardware service initialized successfully');
      return true;
    } catch (error) {
      console.error('[HARDWARE] Failed to initialize hardware service:', error);
      console.error('[HARDWARE] Stack trace:', (error as Error).stack);
      return false;
    }
  }

  /**
   * Verify age using facial recognition and/or ID
   */
  public async verifyAge(): Promise<AgeVerificationResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Start the age verification process
      await ageVerificationService.startVerification();
      
      // Return a pending result - the actual result will be emitted via events
      return {
        success: false,
        message: 'Age verification in progress',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error in age verification:', error);
      const errorResult: AgeVerificationResult = {
        success: false,
        message: `Age verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
      this.emit(HardwareEvent.AGE_VERIFICATION_RESULT, errorResult);
      return errorResult;
    }
  }


  /**
   * Dispense a product from the vending machine
   * @param slotId The ID of the slot to dispense from (corresponds to motor number)
   * @returns Promise that resolves with the dispensing result
   */
  public async dispenseProduct(slotId: string): Promise<DispensingResult> {
    try {
      console.log(`[HARDWARE] Dispensing product from slot ${slotId}`);
      
      if (!this.isInitialized) {
        console.log('[HARDWARE] Hardware service not initialized, initializing now...');
        await this.initialize();
      }
      
      // Check if the Arduino is connected
      const connectionStatus = this.arduino.getConnectionStatus();
      console.log(`[HARDWARE] Arduino connection status: connected=${connectionStatus.connected}, portPath=${connectionStatus.portPath}, baudRate=${connectionStatus.baudRate}`);
      
      if (!connectionStatus.connected) {
        console.log(`[HARDWARE] Arduino not connected. Cannot dispense product from slot ${slotId}.`);
        console.log(`[HARDWARE] Please ensure the Arduino is properly connected to ${connectionStatus.portPath} and no other application is using the port.`);
        
        return {
          success: false,
          message: `Cannot dispense product: Arduino not connected to ${connectionStatus.portPath}. Please check your device connection and try again.`,
          slotId,
          timestamp: Date.now(),
          hardwareConnected: false,
          details: {
            deviceType: connectionStatus.deviceType,
            portPath: connectionStatus.portPath,
            baudRate: connectionStatus.baudRate,
            simulationMode: false,
            attemptedPorts: connectionStatus.attemptedPorts
          }
        };
      }
      
      // Track sensor activation status
      let sensorActivated = false;
      
      // Set up a listener for the sensor status
      const sensorListener = (activated: boolean) => {
        sensorActivated = activated;
      };
      
      this.arduino.on('sensorActivated', sensorListener);
      
      // Dispense the product using the motor number, passing the quantity
      try {
        console.log(`[HARDWARE] Sending motor command for motor ${slotId} to Arduino`);
        // Pass the quantity to the arduino controller
        await this.arduino.dispenseProduct(slotId);

        // Add a small delay (e.g., 200ms) to allow the sensor event to arrive
        await new Promise(resolve => setTimeout(resolve, 200));

        // Remove the listener *after* the delay
        this.arduino.removeListener('sensorActivated', sensorListener);

      } catch (dispenseError) {
        console.error('[HARDWARE] Error during dispense command:', dispenseError);
        // Remove the listener on error
        this.arduino.removeListener('sensorActivated', sensorListener);
        throw dispenseError;
      }
      
      const result: DispensingResult = {
        success: true,
        message: sensorActivated 
          ? `1 unit of product dispensed from slot ${slotId} and detected by sensor`
          : `1 unit of product dispensed from slot ${slotId} but not detected by sensor`,
        slotId,
        timestamp: Date.now(),
        hardwareConnected: true,
        sensorActivated,
        details: {
          deviceType: connectionStatus.deviceType,
          portPath: connectionStatus.portPath,
          baudRate: connectionStatus.baudRate,
          commandSent: `Dispensed 1 unit with command sequence: I42S -> M${slotId}F`,
          simulationMode: false
        }
      };
      
      console.log(`[HARDWARE] 1 unit of product dispensed ${sensorActivated ? 'and detected by sensor' : 'but not detected by sensor'} from slot ${slotId}`);
      this.emit(HardwareEvent.PRODUCT_DISPENSED, result);
      return result;
    } catch (error) {
      console.error('[HARDWARE] Error dispensing product:', error);
      console.error('[HARDWARE] Stack trace:', (error as Error).stack);
      
      const connectionStatus = this.arduino.getConnectionStatus();
      const result: DispensingResult = {
        success: false,
        message: `Error dispensing product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        hardwareConnected: connectionStatus.connected,
        details: {
          deviceType: connectionStatus.deviceType,
          portPath: connectionStatus.portPath,
          baudRate: connectionStatus.baudRate,
          simulationMode: false,
          attemptedPorts: connectionStatus.attemptedPorts
        }
      };
      this.emit(HardwareEvent.ERROR, {
        component: 'dispenser',
        message: result.message,
        timestamp: Date.now()
      });
      return result;
    }
  }

  /**
   * Get the status of the vending machine
   */
  public async getStatus(): Promise<any> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Get Arduino status
      const arduinoStatus = await this.arduino.getStatus();
      const connectionStatus = this.arduino.getConnectionStatus();
      
      return {
        arduino: {
          connected: connectionStatus.connected,
          portPath: connectionStatus.portPath,
          baudRate: connectionStatus.baudRate,
          attemptedPorts: connectionStatus.attemptedPorts,
          ...arduinoStatus
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting hardware status:', error);
      return {
        error: `Failed to get hardware status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Clean up and dispose of hardware resources
   */
  public dispose(): void {
    if (this.arduino) {
      this.arduino.disconnect();
    }
    
    this.isInitialized = false;
    console.log('Hardware service disposed');
  }
}

// Export a singleton instance
export const hardwareService = new HardwareService(); 