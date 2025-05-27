import { EventEmitter } from 'events';
import { AgeVerificationResult, AgeVerificationService, AgeVerificationEvent } from './ageVerification';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Implementation of the age verification service
 */
export class AgeVerificationServiceImpl extends EventEmitter implements AgeVerificationService {
  private isVerifying: boolean = false;
  private lastResult: AgeVerificationResult | null = null;
  private regulaExePath: string;
  private appDataPath: string;
  private jsonPath: string;
  private photoPath: string;
  private cameraPhotoPath: string;
  private comparisonResultsPath: string;
  
  constructor() {
    super();
    
    // Set up paths
    this.appDataPath = path.join(process.env.APPDATA || '', 'VapeVendingMachine');
    this.jsonPath = path.join(this.appDataPath, 'Text_Data.json');
    this.photoPath = path.join(this.appDataPath, 'Photo.jpg');
    this.cameraPhotoPath = path.join(this.appDataPath, 'FotoClienteCamara.jpg');
    this.comparisonResultsPath = path.join(this.appDataPath, 'comparison_results.txt');
    
    // Path to Regula FaceSDK executable
    this.regulaExePath = path.join(
      process.env.PROGRAMFILES || '', 
      'Regula', 
      'FaceSDK', 
      'Regula.FaceSDK.NetCoreExample.exe'
    );
    
    // Ensure the directory exists
    if (!fs.existsSync(this.appDataPath)) {
      fs.mkdirSync(this.appDataPath, { recursive: true });
    }
  }
  
  /**
   * Start the age verification process
   */
  public async startVerification(): Promise<void> {
    if (this.isVerifying) {
      throw new Error('Verification already in progress');
    }
    
    this.isVerifying = true;
    this.lastResult = null;
    
    try {
      // Emit started event
      this.emit(AgeVerificationEvent.STARTED);
      
      // Start watching for document data
      await this.watchForDocumentData();
    } catch (error) {
      this.isVerifying = false;
      
      // Create failure result
      this.lastResult = {
        success: false,
        message: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
      
      // Emit failed event
      this.emit(AgeVerificationEvent.FAILED, this.lastResult);
      
      throw error;
    }
  }
  
  /**
   * Cancel the current verification process
   */
  public async cancelVerification(): Promise<void> {
    if (!this.isVerifying) {
      return;
    }
    
    this.isVerifying = false;
    
    // Create cancelled result
    this.lastResult = {
      success: false,
      message: 'Verification cancelled by user',
      timestamp: Date.now()
    };
    
    // Emit cancelled event
    this.emit(AgeVerificationEvent.CANCELLED, this.lastResult);
  }
  
  /**
   * Get the result of the verification process
   */
  public async getVerificationResult(): Promise<AgeVerificationResult> {
    if (this.isVerifying) {
      throw new Error('Verification still in progress');
    }
    
    if (!this.lastResult) {
      throw new Error('No verification result available');
    }
    
    return this.lastResult;
  }
  
  /**
   * Watch for document data files
   */
  private async watchForDocumentData(): Promise<void> {
    return new Promise((resolve, reject) => {
      const SECONDS_TO_WAIT = 60; // Maximum time to wait for document data
      const startTime = Date.now();
      
      const checkInterval = setInterval(async () => {
        try {
          // Check if verification was cancelled
          if (!this.isVerifying) {
            clearInterval(checkInterval);
            reject(new Error('Verification cancelled'));
            return;
          }
          
          // Check if timeout reached
          if (Date.now() - startTime > SECONDS_TO_WAIT * 1000) {
            clearInterval(checkInterval);
            this.isVerifying = false;
            
            // Create timeout result
            this.lastResult = {
              success: false,
              message: 'Verification timed out',
              timestamp: Date.now()
            };
            
            // Emit failed event
            this.emit(AgeVerificationEvent.FAILED, this.lastResult);
            
            reject(new Error('Verification timed out'));
            return;
          }
          
          // Check if document files exist and were recently modified
          if (await this.areDocumentFilesRecentlyModified()) {
            clearInterval(checkInterval);
            
            // Process the document verification
            await this.processDocumentVerification();
            
            resolve();
          }
        } catch (error) {
          clearInterval(checkInterval);
          this.isVerifying = false;
          reject(error);
        }
      }, 1000);
    });
  }
  
  /**
   * Check if document files were recently modified
   */
  private async areDocumentFilesRecentlyModified(): Promise<boolean> {
    try {
      // Check if files exist
      if (!fs.existsSync(this.jsonPath) || !fs.existsSync(this.photoPath)) {
        return false;
      }
      
      // Get last modification times
      const jsonStats = fs.statSync(this.jsonPath);
      const photoStats = fs.statSync(this.photoPath);
      
      const currentTime = Date.now();
      const jsonModTime = jsonStats.mtime.getTime();
      const photoModTime = photoStats.mtime.getTime();
      
      // Check if both files were modified within the last 15 seconds
      const SECONDS_TO_WAIT = 15;
      const jsonRecentlyModified = (currentTime - jsonModTime) / 1000 <= SECONDS_TO_WAIT;
      const photoRecentlyModified = (currentTime - photoModTime) / 1000 <= SECONDS_TO_WAIT;
      
      return jsonRecentlyModified && photoRecentlyModified;
    } catch (error) {
      console.error('Error checking file modification times:', error);
      return false;
    }
  }
  
  /**
   * Process document verification
   */
  private async processDocumentVerification(): Promise<void> {
    try {
      // Read and parse document data
      const documentData = this.readDocumentData();
      if (!documentData) {
        throw new Error('Failed to read document data');
      }
      
      // Check if camera photo exists
      if (!fs.existsSync(this.cameraPhotoPath)) {
        throw new Error('Camera photo not found');
      }
      
      // Execute Regula face comparison
      await this.executeRegulaFaceComparison();
      
      // Wait for comparison results
      if (!this.waitForFile(this.comparisonResultsPath, 5000)) {
        throw new Error('Face comparison results not available');
      }
      
      // Read comparison results
      const similarity = this.readFaceComparisonResults();
      
      // Verify age and face similarity
      const MINIMUM_AGE = 18;
      const MINIMUM_SIMILARITY = 0.2;
      
      if (documentData.edad >= MINIMUM_AGE && similarity >= MINIMUM_SIMILARITY) {
        // Create success result
        this.lastResult = {
          success: true,
          message: 'Age verification successful',
          userData: {
            ...documentData,
            photoPath: this.photoPath,
            cameraPhotoPath: this.cameraPhotoPath,
            similarity
          },
          timestamp: Date.now()
        };
        
        // Emit completed event
        this.emit(AgeVerificationEvent.COMPLETED, this.lastResult);
      } else if (documentData.edad < MINIMUM_AGE) {
        // Create underage result
        this.lastResult = {
          success: false,
          message: 'Age verification failed - User is underage',
          userData: {
            ...documentData,
            similarity
          },
          timestamp: Date.now()
        };
        
        // Emit failed event
        this.emit(AgeVerificationEvent.FAILED, this.lastResult);
      } else {
        // Create low similarity result
        this.lastResult = {
          success: false,
          message: 'Face verification failed - Low similarity score',
          userData: {
            ...documentData,
            similarity
          },
          timestamp: Date.now()
        };
        
        // Emit failed event
        this.emit(AgeVerificationEvent.FAILED, this.lastResult);
      }
    } catch (error) {
      // Create error result
      this.lastResult = {
        success: false,
        message: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now()
      };
      
      // Emit failed event
      this.emit(AgeVerificationEvent.FAILED, this.lastResult);
      
      throw error;
    } finally {
      this.isVerifying = false;
    }
  }
  
  /**
   * Read document data from JSON file
   */
  private readDocumentData(): { dni: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; edad: number } | null {
    try {
      const jsonData = fs.readFileSync(this.jsonPath, 'utf8');
      const jsonObject = JSON.parse(jsonData);
      
      const documentData = {
        dni: '',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        edad: 0
      };
      
      // Extract fields from JSON
      for (const field of jsonObject.Text.fieldList) {
        switch (field.fieldName) {
          case 'Personal Number':
            documentData.dni = field.value;
            break;
          case 'Given Names':
            documentData.nombres = field.value;
            break;
          case 'Surname':
            documentData.apellidoPaterno = field.value;
            break;
          case 'Second Surname':
            documentData.apellidoMaterno = field.value;
            break;
          case 'Age':
            documentData.edad = parseInt(field.value, 10);
            break;
        }
      }
      
      return documentData;
    } catch (error) {
      console.error('Error reading document data:', error);
      return null;
    }
  }
  
  /**
   * Execute Regula face comparison
   */
  private async executeRegulaFaceComparison(): Promise<void> {
    try {
      await execAsync(this.regulaExePath);
    } catch (error) {
      console.error('Error executing Regula FaceSDK:', error);
      throw new Error('Failed to execute face comparison');
    }
  }
  
  /**
   * Wait for a file to exist
   */
  private waitForFile(filePath: string, timeoutMs: number): boolean {
    const startTime = Date.now();
    
    while (!fs.existsSync(filePath)) {
      if (Date.now() - startTime > timeoutMs) {
        return false;
      }
      
      // Sleep for a short time
      const sleepTime = 100;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sleepTime);
    }
    
    return true;
  }
  
  /**
   * Read face comparison results
   */
  private readFaceComparisonResults(): number {
    try {
      const content = fs.readFileSync(this.comparisonResultsPath, 'utf8');
      const lines = content.split('\n');
      const targetPair = 'pair(1, 2)';
      
      for (const line of lines) {
        if (line.includes(targetPair)) {
          const parts = line.split('similarity: ');
          if (parts.length > 1) {
            return parseFloat(parts[1].trim());
          }
        }
      }
      
      return 0;
    } catch (error) {
      console.error('Error reading comparison results:', error);
      return 0;
    }
  }
}

// Create and export a singleton instance
export const ageVerificationService = new AgeVerificationServiceImpl(); 