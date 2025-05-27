import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import axios from 'axios';

interface DocumentData {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  edad: number;
  direccion: string;
}

export class DocumentVerification {
  private static SECONDS_TO_WAIT = 15;
  private static MINIMUM_AGE = 18;
  private static MINIMUM_SIMILARITY = 0.2;
  
  // Paths for document data and photos
  private jsonPath = path.join(process.env.APPDATA || '', 'VapeVendingMachine', 'Text_Data.json');
  private photoPath = path.join(process.env.APPDATA || '', 'VapeVendingMachine', 'Photo.jpg');
  private cameraPhotoPath = path.join(process.env.APPDATA || '', 'VapeVendingMachine', 'FotoClienteCamara.jpg');
  private comparisonResultsPath = path.join(process.env.APPDATA || '', 'VapeVendingMachine', 'comparison_results.txt');
  
  // Path to Regula FaceSDK executable
  private regulaExePath = path.join(process.env.PROGRAMFILES || '', 'Regula', 'FaceSDK', 'Regula.FaceSDK.NetCoreExample.exe');
  
  // FTP server details
  private ftpServer = 'ftp://your-ftp-server.com/public_html/Repo/';
  private ftpUsername = 'your-username';
  private ftpPassword = 'your-password';
  
  // MySQL connection details (to be implemented with a secure approach)
  private dbConfig = {
    host: 'your-db-host',
    port: 3306,
    database: 'your-database',
    user: 'your-username',
    password: 'your-password'
  };

  constructor() {
    // Create directories if they don't exist
    const dir = path.dirname(this.jsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Start watching for document data
    this.startWatchingForDocuments();
  }

  /**
   * Start watching for document data files
   */
  public startWatchingForDocuments(): void {
    // Check for document data every second
    const checkInterval = setInterval(() => {
      if (this.areDocumentFilesRecentlyModified()) {
        clearInterval(checkInterval);
        this.processDocumentVerification();
      }
    }, 1000);
  }

  /**
   * Check if document files were recently modified
   */
  private areDocumentFilesRecentlyModified(): boolean {
    try {
      // Check if files exist
      if (!fs.existsSync(this.jsonPath) || !fs.existsSync(this.photoPath)) {
        return false;
      }

      // Get last modification times
      const jsonStats = fs.statSync(this.jsonPath);
      const photoStats = fs.statSync(this.photoPath);
      
      const currentTime = new Date().getTime();
      const jsonModTime = jsonStats.mtime.getTime();
      const photoModTime = photoStats.mtime.getTime();
      
      // Check if both files were modified within the last SECONDS_TO_WAIT seconds
      const jsonRecentlyModified = (currentTime - jsonModTime) / 1000 <= DocumentVerification.SECONDS_TO_WAIT;
      const photoRecentlyModified = (currentTime - photoModTime) / 1000 <= DocumentVerification.SECONDS_TO_WAIT;
      
      return jsonRecentlyModified && photoRecentlyModified;
    } catch (error) {
      console.error('Error checking file modification times:', error);
      return false;
    }
  }

  /**
   * Process document verification
   */
  public async processDocumentVerification(): Promise<void> {
    try {
      // Read and parse document data
      const documentData = this.readDocumentData();
      if (!documentData) {
        this.handleVerificationFailure('Failed to read document data');
        return;
      }
      
      // Check if camera photo exists
      if (!fs.existsSync(this.cameraPhotoPath)) {
        this.handleVerificationFailure('Camera photo not found');
        return;
      }
      
      // Execute Regula face comparison
      await this.executeRegulaFaceComparison();
      
      // Wait for comparison results
      if (!this.waitForFile(this.comparisonResultsPath, 5000)) {
        this.handleVerificationFailure('Face comparison results not available');
        return;
      }
      
      // Read comparison results
      const similarity = this.readFaceComparisonResults();
      
      // Verify age and face similarity
      if (documentData.edad >= DocumentVerification.MINIMUM_AGE && similarity >= DocumentVerification.MINIMUM_SIMILARITY) {
        // Upload document data to database
        await this.uploadDataToDatabase(documentData);
        
        // Upload photos to FTP server
        const firstUploadResult = await this.uploadFileToFtp(this.photoPath);
        const secondUploadResult = await this.uploadFileToFtp(this.cameraPhotoPath);
        
        if (firstUploadResult && secondUploadResult) {
          // Execute PHP script if needed
          await this.executePhpScript('https://your-server.com/Repo/script.php');
          
          // Notify success
          this.handleVerificationSuccess(documentData);
        } else {
          this.handleVerificationFailure('Failed to upload photos');
        }
      } else if (documentData.edad < DocumentVerification.MINIMUM_AGE) {
        this.handleVerificationFailure('Age verification failed - User is underage');
      } else {
        this.handleVerificationFailure('Face verification failed - Low similarity score');
      }
    } catch (error) {
      console.error('Error in document verification process:', error);
      this.handleVerificationFailure('Unexpected error during verification');
    }
  }

  /**
   * Read document data from JSON file
   */
  private readDocumentData(): DocumentData | null {
    try {
      const jsonData = fs.readFileSync(this.jsonPath, 'utf8');
      const jsonObject = JSON.parse(jsonData);
      
      const documentData: DocumentData = {
        dni: '',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        fechaNacimiento: '',
        edad: 0,
        direccion: ''
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
          case 'Date of Birth':
            documentData.fechaNacimiento = field.value;
            break;
          case 'Age':
            documentData.edad = parseInt(field.value, 10);
            break;
          case 'Address Area':
            documentData.direccion = field.value;
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
  private executeRegulaFaceComparison(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(this.regulaExePath, (error, stdout, stderr) => {
        if (error) {
          console.error('Error executing Regula FaceSDK:', error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Wait for a file to exist
   */
  private waitForFile(filePath: string, timeoutMs: number): boolean {
    const startTime = new Date().getTime();
    
    while (!fs.existsSync(filePath)) {
      if (new Date().getTime() - startTime > timeoutMs) {
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

  /**
   * Upload data to database
   */
  private async uploadDataToDatabase(data: DocumentData): Promise<void> {
    // This would be implemented with a secure database connection
    // For Electron, you might want to use a REST API instead of direct DB connection
    
    // Example implementation with IPC to main process
    try {
      await window.electron.ipcRenderer.invoke('upload-to-database', {
        dni: data.dni,
        nombres: data.nombres,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        edad: data.edad,
        photoPath: this.photoPath,
        cameraPhotoPath: this.cameraPhotoPath
      });
    } catch (error) {
      console.error('Error uploading to database:', error);
      throw error;
    }
  }

  /**
   * Upload file to FTP server
   */
  private async uploadFileToFtp(filePath: string): Promise<boolean> {
    // In Electron, you would typically handle this in the main process
    // This is a placeholder for the implementation
    try {
      const result = await window.electron.ipcRenderer.invoke('upload-to-ftp', {
        filePath,
        ftpServer: this.ftpServer,
        username: this.ftpUsername,
        password: this.ftpPassword
      });
      
      return result.success;
    } catch (error) {
      console.error('Error uploading file to FTP:', error);
      return false;
    }
  }

  /**
   * Execute PHP script
   */
  private async executePhpScript(url: string): Promise<void> {
    try {
      await axios.get(url);
    } catch (error) {
      console.error('Error executing PHP script:', error);
      throw error;
    }
  }

  /**
   * Handle verification success
   */
  private handleVerificationSuccess(data: DocumentData): void {
    // Notify the main application about successful verification
    window.electron.ipcRenderer.send('verification-success', {
      dni: data.dni,
      nombres: data.nombres,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      edad: data.edad
    });
  }

  /**
   * Handle verification failure
   */
  private handleVerificationFailure(reason: string): void {
    // Notify the main application about verification failure
    window.electron.ipcRenderer.send('verification-failure', { reason });
  }
} 