import { ipcMain } from 'electron';
import { FaceSdk, ImageSource } from '@regulaforensics/facesdk-webclient';
import { spawn, ChildProcess } from 'child_process';

/**
 * IPC channel names for face recognition operations
 */
export enum FaceRecognitionChannel {
  MATCH_FACES = 'match-faces',
  START_FACE_SDK = 'start-face-sdk',
  STOP_FACE_SDK = 'stop-face-sdk'
}

// Store the Face SDK process and instance
let faceSdkProcess: ChildProcess | null = null;
let faceSdk: FaceSdk | null = null;

/**
 * Initialize the Face SDK client
 */
async function initializeFaceSDK(): Promise<void> {
  try {
    console.log('Initializing Regula FaceSDK...');
    faceSdk = new FaceSdk({ 
      basePath: 'http://127.0.0.1:41101',
      isJsonMime: (mime: string) => mime.includes('json')
    });
    
    // Test the connection
    await faceSdk.matchingApi.match({
      tag: "test_connection",
      images: []
    }, "test_request");
    
    console.log('Regula FaceSDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Regula FaceSDK:', error);
    faceSdk = null;
    throw error;
  }
}

/**
 * Register all face recognition-related IPC handlers
 */
export function registerFaceRecognitionIPC(): void {
  // Handler for starting the Face SDK service
  ipcMain.handle('start-face-sdk', async (_, args: { path: string }) => {
    try {
      if (faceSdkProcess) {
        console.log('Face SDK service is already running');
        return;
      }

      console.log('Starting Face SDK service...');
      faceSdkProcess = spawn(args.path, {
        windowsHide: true
      });

      faceSdkProcess.on('error', (error) => {
        console.error('Face SDK service error:', error);
        faceSdk = null;
      });

      faceSdkProcess.on('exit', (code) => {
        console.log('Face SDK service exited with code:', code);
        faceSdkProcess = null;
        faceSdk = null;
      });

      // Wait for the service to start and initialize SDK
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await initializeFaceSDK();
      console.log('Face SDK service started and initialized');
    } catch (error) {
      console.error('Error starting Face SDK service:', error);
      throw error;
    }
  });

  // Handler for stopping the Face SDK service
  ipcMain.handle('stop-face-sdk', async () => {
    try {
      if (faceSdkProcess) {
        console.log('Stopping Face SDK service...');
        faceSdkProcess.kill();
        faceSdkProcess = null;
        faceSdk = null;
      }
    } catch (error) {
      console.error('Error stopping Face SDK service:', error);
      throw error;
    }
  });

  // Register IPC handler for face matching
  ipcMain.handle(FaceRecognitionChannel.MATCH_FACES, async (_, args: { 
    currentFace?: ArrayBuffer, 
    storedFace?: ArrayBuffer,
    idFace?: string,
    cameraFace?: string 
  }) => {
    try {
      console.log('Received match-faces IPC call');
      
      // Extract faces from arguments, supporting both formats
      let face1: ArrayBuffer | string | undefined;
      let face2: ArrayBuffer | string | undefined;
      let face1Type = ImageSource.LIVE;
      let face2Type = ImageSource.DOCUMENT_RFID;
      
      // Check which argument format is being used
      if (args.currentFace && args.storedFace) {
        // Original format used by the camera component
        face1 = args.currentFace;
        face2 = args.storedFace;
        face1Type = ImageSource.LIVE;
        face2Type = ImageSource.DOCUMENT_RFID;
      } else if (args.idFace && args.cameraFace) {
        // New format used by the document scan component
        face1 = args.cameraFace;
        face2 = args.idFace;
        face1Type = ImageSource.LIVE;
        face2Type = ImageSource.DOCUMENT_RFID;
      } else {
        throw new Error('Missing face data for comparison. Provide either currentFace/storedFace or idFace/cameraFace pairs.');
      }
      
      // Validate inputs and SDK initialization
      if (!face1 || !face2) {
        throw new Error('Missing face data for comparison');
      }
      
      if (!faceSdk) {
        throw new Error('Face SDK not initialized. Please start the service first.');
      }
      
      console.log('Performing face comparison using Regula FaceSDK');
      
      // Prepare the images for matching
      // If string base64 is provided, use it directly
      // If ArrayBuffer is provided, convert it to base64
      const prepareImageData = (data: ArrayBuffer | string): string => {
        if (typeof data === 'string') {
          return data; // Already base64
        } else {
          return Buffer.from(data).toString('base64');
        }
      };
      
      // Compare faces using Regula FaceSDK according to API spec
      const response = await faceSdk.matchingApi.match({
        tag: "face_matching_session",
        images: [
          {
            index: 0,
            type: face1Type,
            data: prepareImageData(face1),
            detectAll: false
          },
          {
            index: 1,
            type: face2Type,
            data: prepareImageData(face2),
            detectAll: false
          }
        ]
      }, "face_matching_request");
      
      console.log('Face comparison completed successfully');
      
      // The response will contain:
      // - code: result code (0 for success)
      // - detections: array of detected faces with their locations
      // - results: array of comparison results with similarity scores
      return {
        success: response.code === 0,
        similarity: response.results?.[0]?.similarity ?? 0,
        detections: response.detections,
        results: response.results
      };
    } catch (error) {
      console.error('Error in face matching IPC handler:', error);
      throw error;
    }
  });
}

/**
 * Unregister all face recognition-related IPC handlers
 */
export function unregisterFaceRecognitionIPC(): void {
  ipcMain.removeHandler(FaceRecognitionChannel.MATCH_FACES);
  ipcMain.removeHandler('start-face-sdk');
  ipcMain.removeHandler('stop-face-sdk');
  
  // Stop the Face SDK service if it's running
  if (faceSdkProcess) {
    faceSdkProcess.kill();
    faceSdkProcess = null;
  }
  
  faceSdk = null;
} 