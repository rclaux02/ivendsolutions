import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { FaceSdk, ImageSource } from '@regulaforensics/facesdk-webclient';
import { withConnection } from '../database/dbConnection';
import { RowDataPacket } from 'mysql2/promise';
import { createClient } from '../database/operations/clientOperations';

// Define a type for the embedding data (adjust if needed)
interface ClientEmbedding extends RowDataPacket {
  id: string;
  name: string; // Assuming there's a name column
  FACE_EMBEDDING: string; // Stored as JSON string
}

/**
 * Check if the Regula FaceSDK service is running
 * @returns Promise<boolean> True if the service is running, false otherwise
 */
async function isRegulaServiceRunning(): Promise<boolean> {
  const axios = require('axios');
  
  try {
    // Try to ping the Regula FaceSDK service using explicit IPv4 address
    console.log('Pinging Regula FaceSDK service...');
    const response = await axios.get('http://127.0.0.1:41101/api/ping', {
      timeout: 3000,
      headers: {
        'Accept': 'application/json'
      }
    });
    console.log('Regula FaceSDK service response:', response.data);
    
    // Check if we got a valid response
    const isValid = response.status === 200 && 
                   response.data && 
                   response.data.code === 200 &&
                   response.data['app-name'] === 'Regula Face Recognition Web API';
    
    if (isValid) {
      console.log('Regula FaceSDK service is running correctly');
      return true;
    } else {
      console.log('Regula FaceSDK service responded but with unexpected data:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('Regula FaceSDK service is not running or not accessible:', error);
    
    // Add more detailed error info for debugging
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. The Regula FaceSDK service is not running on port 41101.');
      console.error('Please ensure the service is installed and started.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. The Regula FaceSDK service might be blocked by a firewall.');
    }
    
    return false;
  }
}

/**
 * IPC channel names for user-related operations
 */
export enum UserChannel {
  CREATE_USER = 'create-user',
  GET_USER = 'get-user',
  DETECT_FACES = 'detect-faces',
  PING_FACE_SERVICE = 'ping-face-service',
  GET_ALL_EMBEDDINGS = 'users:get-all-embeddings'
}

/**
 * Register all user-related IPC handlers
 */
export function registerUserIPC(): void {
  // Handler for pinging the Regula FaceSDK service
  ipcMain.handle(UserChannel.PING_FACE_SERVICE, async () => {
    try {
      console.log('Pinging Regula FaceSDK service...');
      const isRunning = await isRegulaServiceRunning();
      return {
        success: true,
        isRunning
      };
    } catch (error: any) {
      console.error('Error in ping-face-service IPC handler:', error.message);
      return {
        success: false,
        isRunning: false,
        error: error.message
      };
    }
  });

  // Handler for getting all face embeddings
  ipcMain.handle(UserChannel.GET_ALL_EMBEDDINGS, async () => {
    console.log('[UserIPC] Received get-all-face-embeddings request');
    try {
      // Use withConnection utility
      const rows = await withConnection<ClientEmbedding[]>(async (connection) => {
        const [results] = await connection.query<ClientEmbedding[]>(
          'SELECT FS_ID, FS_NOM, FACE_EMBEDDING FROM TA_CLI_VAPES WHERE FACE_EMBEDDING IS NOT NULL AND FACE_EMBEDDING != \'\''
        );
        return results; // Return the actual rows
      });

      // Log count and first 3 names
      console.log(`[UserIPC] Found ${rows.length} clients with face embeddings.`);
      if (rows.length > 0) {
        const firstThreeNames = rows.slice(0, 3).map(row => row.FS_NOM).join(', ');
        console.log(`[UserIPC] First 3 client names: ${firstThreeNames}`);
      }

      return { 
        success: true, 
        data: rows 
      };
    } catch (error) {
      console.error('[UserIPC] Error fetching face embeddings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  });

  // Handler for creating a new user
  ipcMain.handle(UserChannel.CREATE_USER, async (_, args: {
    firstName?: string;
    lastName?: string;
    maternalLastName?: string;
    dni?: string;
    age?: number;
    sexo?: string;
    photoBase64?: string;
    photo2Base64?: string;
    faceEmbedding?: string;
  }) => {
    try {
      console.log('[UserIPC] Received create-user IPC call with data:', args);
      
      // Call the database operation to create the client
      const newClientId = await createClient({
        FS_NOM: args.firstName || '',
        FS_APE_PA: args.lastName || '',
        FS_APE_MA: args.maternalLastName || '',
        FS_DNI: args.dni || '',
        FS_EDAD: args.age || 0,
        FS_SEXO: args.sexo || '',
        FS_EMP: 'RFEnterprises',
        FS_SEDE: '001',
        FS_LOCAL: '001',
        FS_TEL: '',
        FS_EMAIL: '',
        FX_FOTO: args.photoBase64 || null,
        FX_FOTO2: args.photo2Base64 || null,
        FACE_EMBEDDING: args.faceEmbedding || null
      });

      if (!newClientId) {
        throw new Error('Failed to create client record in database.');
      }

      console.log(`[UserIPC] Successfully created client with ID: ${newClientId}`);
      return {
        success: true,
        clientId: newClientId
      };
    } catch (error) {
      console.error('Error in create-user IPC handler:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
  
  // Handler for face detection
  ipcMain.handle(UserChannel.DETECT_FACES, async (_, args: { image: string }) => {
    try {
      console.log('Received detect-faces IPC call');
      
      // Use the Regula Face SDK to detect faces
      const axios = require('axios');
      
      // Make sure we have an image to process
      if (!args.image) {
        throw new Error('No image provided for face detection');
      }
      

      // Check if the Regula service is running
      const serviceRunning = await isRegulaServiceRunning();
      if (!serviceRunning) {
        console.log('Regula FaceSDK service is not available');
        return {
          success: false,
          error: 'Regula FaceSDK service is not running or not accessible',
          details: 'Please ensure the Regula FaceSDK service is installed and running on your system.'
        };
      }
      
      console.log('Regula service is running, proceeding with face detection');
      // Call the Regula FaceSDK detection API directly from the main process
      // to avoid CORS issues in the renderer - USE EXPLICIT IPv4 ADDRESS!
      const response = await axios.post('http://127.0.0.1:41101/api/detect', {
        image: args.image
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });
      
      console.log('Face detection API response results:', response.data.results);
      
      // Return the face detection results directly
      return response.data;
    } catch (error) {
      console.error('Error in detect-faces IPC handler:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

/**
 * Unregister all user-related IPC handlers
 */
export function unregisterUserIPC(): void {
  ipcMain.removeHandler(UserChannel.CREATE_USER);
  ipcMain.removeHandler(UserChannel.GET_USER);
  ipcMain.removeHandler(UserChannel.DETECT_FACES);
  ipcMain.removeHandler(UserChannel.PING_FACE_SERVICE);
  ipcMain.removeHandler(UserChannel.GET_ALL_EMBEDDINGS);
} 