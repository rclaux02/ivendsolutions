import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Canvas, Image, loadImage } from 'canvas';

/**
 * IPC channel names for face detection operations
 */
export enum FaceDetectionChannel {
  DETECT_FACE = 'detect-face',
  SAVE_FACE = 'save-face'
}

/**
 * Register all face detection-related IPC handlers
 */
export function registerFaceDetectionIPC(): void {
  // Handler for face detection
  ipcMain.handle(FaceDetectionChannel.DETECT_FACE, async (_, frameBuffer: ArrayBuffer) => {
    try {
      // For now, we'll assume the camera is always working and return true
      // This avoids using TensorFlow completely
      
      // In a real implementation, you would:
      // 1. Use a different library like OpenCV for face detection
      // 2. Or implement a basic algorithm to detect faces
      
      // Just save the image for debugging if needed
      const tempFile = path.join(app.getPath('temp'), 'temp-face-detection.jpg');
      fs.writeFileSync(tempFile, Buffer.from(frameBuffer));
      
      // Return true to indicate a face was "detected"
      // You can implement actual face detection later if needed
      return true;
    } catch (error) {
      console.error('Error in face detection:', error);
      return false;
    }
  });

  // Handler for saving detected face
  ipcMain.handle(FaceDetectionChannel.SAVE_FACE, async (_, faceBuffer: ArrayBuffer) => {
    try {
      // Create app data directory if it doesn't exist
      const appDataPath = path.join(app.getPath('userData'), 'faces');
      if (!fs.existsSync(appDataPath)) {
        fs.mkdirSync(appDataPath, { recursive: true });
      }

      // Save the image directly without any face detection
      const facePath = path.join(appDataPath, 'FotoClienteCamara.jpg');
      fs.writeFileSync(facePath, Buffer.from(faceBuffer));
      
      return true;
    } catch (error) {
      console.error('Error saving face:', error);
      throw error;
    }
  });
}

/**
 * Unregister all face detection-related IPC handlers
 */
export function unregisterFaceDetectionIPC(): void {
  ipcMain.removeHandler(FaceDetectionChannel.DETECT_FACE);
  ipcMain.removeHandler(FaceDetectionChannel.SAVE_FACE);
} 