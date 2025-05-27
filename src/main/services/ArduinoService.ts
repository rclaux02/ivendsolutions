import { SerialPort } from 'serialport';

export class ArduinoService {
  private port: SerialPort | null = null;
  private portPath: string | null = null;
  private isPortConnected: boolean = false;

  async connect(portPath: string = 'COM3'): Promise<void> {
    try {
      this.port = new SerialPort({
        path: 'COM4',
        baudRate: 9600,
        autoOpen: false
      });

      await new Promise<void>((resolve, reject) => {
        this.port?.open((err) => {
          if (err) {
            reject(err);
            return;
          }
          this.isPortConnected = true;
          this.portPath = portPath;
          resolve();
        });
      });
    } catch (error) {
      console.error('Failed to connect to Arduino:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.port) {
        resolve();
        return;
      }

      this.port.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.isPortConnected = false;
        this.portPath = null;
        this.port = null;
        resolve();
      });
    });
  }

  async dispenseProduct(slotId: string): Promise<void> {
    if (!this.port || !this.isPortConnected) {
      throw new Error('Arduino not connected');
    }

    return new Promise<void>((resolve, reject) => {
      const command = `DISPENSE ${slotId}\n`;
      this.port?.write(command, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  isConnected(): boolean {
    return this.isPortConnected;
  }

  getPortPath(): string | null {
    return this.portPath;
  }
} 