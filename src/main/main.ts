// Disable console output for file watching logs
// This must be at the top of the file, before any imports
const disableWatchLogs = () => {
  const originalConsoleLog = console.log;
  
  console.log = function(...args) {
    // Skip file watching logs
    if (args.length > 0) {
      const msg = String(args[0] || '');
      if (
        msg.includes('Watched paths') ||
        msg.includes('node_modules') ||
        msg.includes('.js') ||
        msg.includes('@tensorflow')
      ) {
        return; // Skip file watching logs
      }
    }
    originalConsoleLog.apply(console, args);
  };
};

// Execute immediately
disableWatchLogs();

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerHardwareIPC, unregisterHardwareIPC } from './ipc/hardwareIPC';
import { registerFaceRecognitionIPC, unregisterFaceRecognitionIPC } from './ipc/faceRecognitionIPC';
import { registerFaceDetectionIPC, unregisterFaceDetectionIPC } from './ipc/faceDetectionIPC';
import { hardwareService } from './hardware/hardwareService';
import setupRappiIPC from './ipc/rappiIPC';
import setupRappiInventoryIPC from './ipc/rappiInventoryIPC';
import { rappiService } from './rappi';
import { registerSlotMappingTools } from './database/scripts/populateSlotMappings';
import { registerIzipayIPC, unregisterIzipayIPC } from './ipc/izipayIPC';
import { IzipayPOSService } from './payment/izipayPOSService';
import { registerProductIPC } from './ipc/productIPC';
import { setupPaymentIPC } from './ipc/paymentIPC';
import { registerUserIPC, unregisterUserIPC } from './ipc/userIPC';
import { registerPurchaseIPC } from './ipc/purchaseIPC';
import * as url from 'url';
import { startConnectionKeepalive, stopConnectionKeepalive } from './database/dbConnection';

// Add this try-catch block at the top level with silent logging
try {
  if (process.env.NODE_ENV === 'development') {
    require('electron-reloader')(module, {
      debug: false, // Disable debug logging
      watchRenderer: true,
      silent: true // Add silent option to suppress logs
    });
  }
} catch (_) { /* Ignore errors silently */ }

// Store the main window reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

// Initialize IzipayPOSService without automatic port initialization
const izipayService = new IzipayPOSService({
  portPath: 'COM9', // Default to COM9, can be changed via settings
  baudRate: 9600,
  credentials: {
    username: 'izipay',
    password: 'izipay'
  },
  apiUrl: 'http://localhost:9090/API_PPAD'
});

async function createWindow() {
  // Original dimensions: 2260 x 3840
  // Scaled down for development while maintaining aspect ratio
  const SCALE_FACTOR = 1; // This will give us 904 x 1536
  const PRODUCTION_WIDTH = 2260;
  const PRODUCTION_HEIGHT = 3840;
  
  const DEV_WIDTH = Math.round(PRODUCTION_WIDTH * SCALE_FACTOR);
  const DEV_HEIGHT = Math.round(PRODUCTION_HEIGHT * SCALE_FACTOR);

  mainWindow = new BrowserWindow({
    width: process.env.NODE_ENV === 'development' ? DEV_WIDTH : PRODUCTION_WIDTH,
    height: process.env.NODE_ENV === 'development' ? DEV_HEIGHT : PRODUCTION_HEIGHT,
    fullscreen: process.env.NODE_ENV !== 'development',
    // autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Center the window
    // center: true,
    // Remove the default menu bar
    // autoHideMenuBar: true
  });
  
  mainWindow.setMenuBarVisibility(false); // 🔒 Force it always hidden

  // Register IPC handlers for hardware communication
  if (mainWindow) {
    registerHardwareIPC(mainWindow);
    registerFaceRecognitionIPC();
    registerFaceDetectionIPC();
    setupRappiIPC();
    setupRappiInventoryIPC();
    registerSlotMappingTools();
    registerIzipayIPC(izipayService);
    registerProductIPC();
    setupPaymentIPC();
    registerUserIPC();
    registerPurchaseIPC();
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Running in development, loading URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.maximize();
    mainWindow.webContents.openDevTools({ mode: 'right' });
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
    mainWindow.maximize();
  }

  // Initialize hardware services
  try {
    console.log('Initializing hardware services...');
    await hardwareService.initialize();
    console.log('Hardware services initialized successfully');
    
    // Start database connection keepalive to prevent cold starts
    startConnectionKeepalive();
    console.log('Database connection keepalive started');
    
    // Initialize Rappi service
    console.log('Rappi service will be initialized when needed');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Check if Regula FaceSDK service is running
  try {
    const axios = require('axios');
    console.log('Checking if Regula FaceSDK service is running...');
    await axios.get('http://127.0.0.1:41101/api/ping', { timeout: 2000 });
    console.log('✅ Regula FaceSDK service is running');
  } catch (error: any) {
    console.error('❌ Regula FaceSDK service is NOT running!');
    console.error('Face verification features will not work.');
    console.error('Please make sure the Regula FaceSDK service is installed and running on port 41101.');
    console.error('Error details:', error.message);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Clean up hardware resources
  unregisterHardwareIPC();
  unregisterFaceRecognitionIPC();
  unregisterFaceDetectionIPC();
  unregisterIzipayIPC();
  unregisterUserIPC();
  
  // Stop the database keepalive
  stopConnectionKeepalive();
  
  // Close serial port connection
  await izipayService.dispose();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  // Prevent default quit to allow async cleanup
  event.preventDefault();
  
  // Ensure hardware resources are cleaned up
  unregisterHardwareIPC();
  unregisterFaceRecognitionIPC();
  unregisterFaceDetectionIPC();
  unregisterIzipayIPC();
  unregisterUserIPC();
  
  // Close serial port connection
  try {
    console.log('Closing serial ports before quit...');
    // Force the port to close by resetting it first
    if (izipayService) {
      // Ensure the port is properly released before quitting
      // await izipayService.closeSerialPort();
      // Double-check it's closed
      if (izipayService.isPortOpen()) {
        console.log('Port still open after closeSerialPort(), trying dispose...');
        await izipayService.dispose();
      }
    }
    console.log('Serial ports closed successfully');
  } catch (error) {
    console.error('Error closing serial ports:', error);
  }
  
  // Now we can quit safely
  app.exit();
});

// Clean up IPC handlers on app quit
app.on('will-quit', async (event) => {
  // Prevent default quit to allow async cleanup
  event.preventDefault();
  
  unregisterFaceRecognitionIPC();
  unregisterFaceDetectionIPC();
  unregisterIzipayIPC();
  unregisterUserIPC();
  
  // Final attempt to close serial port
  try {
    console.log('Final serial port cleanup...');
    await izipayService.dispose();
  } catch (error) {
    console.error('Error in final serial port cleanup:', error);
  }
  
  // Continue with quit
  setTimeout(() => app.exit(), 100);
}); 