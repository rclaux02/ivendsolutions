// Load environment variables first
require('dotenv').config();

console.log('[MAIN] ===== STARTING APPLICATION =====');
console.log('[MAIN] Node version:', process.version);
console.log('[MAIN] Platform:', process.platform);
console.log('[MAIN] MACHINE_CODE:', process.env.MACHINE_CODE);
console.log('[MAIN] SPLASH_REPOSITORY_URL:', process.env.SPLASH_REPOSITORY_URL);

// Register splash screen IPC handlers IMMEDIATELY
console.log('[MAIN] Registering splash screen IPC handlers...');
const { registerSplashScreenIPC } = require('./ipc/splashScreenIPC');
registerSplashScreenIPC();
console.log('[MAIN] Splash screen IPC handlers registered');

// Disable console output for file watching logs and save logs to file
// This must be at the top of the file, before any imports
const disableWatchLogs = () => {
  const fs = require('fs');
  const path = require('path');
  const { app } = require('electron');
  
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  
  // Create logs directory
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Create log file with machine code and date
  const machineCode = process.env.MACHINE_CODE || 'MACHINE-1';
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  const logFile = path.join(logDir, `log${machineCode}${dateStr}_${timeStr}.txt`);
  
  // Track repeated messages to avoid spam
  const messageCounts = new Map<string, number>();
  const lastLogTime = new Map<string, number>();
  
  // Function to check if message is important
  const isImportantLog = (message: string): boolean => {
    const importantKeywords = [
      'ERROR', 'WARN', 'FAILED', 'SUCCESS', 'TRANSACTION', 'PAYMENT', 
      'PURCHASE', 'FEEDBACK', 'DISPENSE', 'ARDUINO', 'HARDWARE',
      'DATABASE', 'CONNECTION', 'LOGIN', 'LOGOUT', 'USER', 'CLIENT',
      'PRODUCT', 'CART', 'ORDER', 'RAPPI', 'IZIPAY', 'LICENSE',
      'FACE', 'RECOGNITION', 'VERIFICATION', 'AGE', 'DOCUMENT'
    ];
    
    return importantKeywords.some(keyword => 
      message.toUpperCase().includes(keyword)
    );
  };
  
  // Function to check if message should be logged (avoid spam)
  const shouldLogMessage = (message: string): boolean => {
    const now = Date.now();
    const lastTime = lastLogTime.get(message) || 0;
    
    // If same message was logged less than 30 seconds ago, skip it
    if (now - lastTime < 30000) {
      return false;
    }
    
    // If message is repeated more than 5 times in 1 minute, skip it
    const count = messageCounts.get(message) || 0;
    if (count > 5) {
      return false;
    }
    
    lastLogTime.set(message, now);
    messageCounts.set(message, count + 1);
    
    return true;
  };
  
  // Function to write to log file
  const writeToLog = (level: string, ...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Only log important messages
    if (!isImportantLog(message)) {
      return;
    }
    
    // Avoid spam
    if (!shouldLogMessage(message)) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} ${level.toUpperCase()}: ${message}\n`;
    
    try {
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      // Silently fail if can't write to file
    }
  };
  
  console.log = function(...args) {
    // Skip file watching logs
    if (args.length > 0) {
      const msg = String(args[0] || '');
      if (
        msg.includes('Watched paths') ||
        msg.includes('node_modules') ||
        msg.includes('.js') ||
        msg.includes('@tensorflow') ||
        msg.includes('Successfully created database pool') ||
        msg.includes('[CONSOLE]') ||
        msg.includes('browserslist') ||
        msg.includes('vite') ||
        msg.includes('transforming')
      ) {
        return; // Skip file watching logs and repetitive messages
      }
    }
    
    // Write to log file (only important ones)
    writeToLog('LOG', ...args);
    
    // Call original console.log
    originalConsoleLog.apply(console, args);
  };
  
  console.error = function(...args) {
    writeToLog('ERROR', ...args);
    originalConsoleError.apply(console, args);
  };
  
  console.warn = function(...args) {
    writeToLog('WARN', ...args);
    originalConsoleWarn.apply(console, args);
  };
  
  console.info = function(...args) {
    writeToLog('INFO', ...args);
    originalConsoleInfo.apply(console, args);
  };
  
  // Log the log file location
  console.log(` Logs importantes se guardan en: ${logFile}`);
};

// Execute immediately
disableWatchLogs();

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { registerHardwareIPC, unregisterHardwareIPC } from './ipc/hardwareIPC';
import { hardwareService } from './hardware/hardwareService';
import { registerFaceRecognitionIPC, unregisterFaceRecognitionIPC } from './ipc/faceRecognitionIPC';
import { registerFaceDetectionIPC, unregisterFaceDetectionIPC } from './ipc/faceDetectionIPC';
import { registerIzipayIPC, unregisterIzipayIPC } from './ipc/izipayIPC';
import { IzipayPOSService } from './payment/izipayPOSService';
import { registerProductIPC } from './ipc/productIPC';
import { setupPaymentIPC } from './ipc/paymentIPC';
import { registerUserIPC, unregisterUserIPC } from './ipc/userIPC';
import { registerPurchaseIPC } from './ipc/purchaseIPC';
import { registerLicenseIPC } from './ipc/licenseIPC';
import { startRappiWebhooks } from './rappi/webhooks';
import { ngrokService } from './ngrokService';
import * as url from 'url';
import { startConnectionKeepalive, stopConnectionKeepalive, withConnection } from './database/dbConnection';
import { RowDataPacket } from 'mysql2/promise';

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

ipcMain.handle('temp:getCurrent', async () => {
  try {
    const [rows] = await withConnection(async (connection) => {
      return connection.query<RowDataPacket[]>('SELECT FS_TEMP FROM TA_TEMP ORDER BY FD_FEC_TEMP DESC LIMIT 1');
    });
    return Array.isArray(rows) && rows.length > 0 ? rows[0].FS_TEMP : null;
  } catch (error) {
    console.error('Error fetching temperature:', error);
    return null;
  }
});

async function createWindow() {
  console.log('[MAIN] Creating window...');
  
  // Force development-like behavior for both environments
  // This ensures consistent behavior between dev and production
  const SCALE_FACTOR = 1;
  const PRODUCTION_WIDTH = 2260;
  const PRODUCTION_HEIGHT = 3840;
  
  const DEV_WIDTH = Math.round(PRODUCTION_WIDTH * SCALE_FACTOR);
  const DEV_HEIGHT = Math.round(PRODUCTION_HEIGHT * SCALE_FACTOR);

  // Use development configuration for both dev and production to ensure consistency
  mainWindow = new BrowserWindow({
    width: DEV_WIDTH,  // Always use dev width for consistency
    height: DEV_HEIGHT, // Always use dev height for consistency
    fullscreen: false, // Never fullscreen to match development behavior
    frame: false, // Remove window frame (no title bar, close, minimize, maximize buttons)
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
    registerIzipayIPC(izipayService);
    registerProductIPC();
    setupPaymentIPC();
    registerUserIPC();
    registerPurchaseIPC();
    registerLicenseIPC();
    // registerSplashScreenIPC(); // Remove this line - already registered above
  }

  // Force development-like behavior in both environments
  if (process.env.NODE_ENV === 'development') {
    console.log('Running in development, loading URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.maximize();
    mainWindow.webContents.openDevTools({ mode: 'right' });
  } else {
    // Production: use built files with clean UI (no dev tools)
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
    mainWindow.maximize();
    // Dev tools can be opened manually with F12 if needed for debugging
  }

  // Initialize hardware services
  try {
    console.log('Initializing hardware services...');
    await hardwareService.initialize(); // ️ HABILITAR INICIALIZACIÓN DEL HARDWARE
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

  // Start Rappi webhook server after window is created (ALWAYS start webhook)
  console.log('🔍 Debug: NODE_ENV =', process.env.NODE_ENV);
  console.log('🔍 Debug: process.argv =', process.argv);
  
  // ALWAYS start webhook regardless of environment or flags
  const enableWebhook = true;
  console.log('🔍 Debug: enableWebhook =', enableWebhook);
  
  if (enableWebhook) {
    console.log('🚀 Starting webhook server...');
    try {
      await startRappiWebhooks();
      console.log('✅ Rappi webhook server started on port 8081');
      
      // Start ngrok if webhook is enabled
      console.log('🚀 Starting ngrok...');
      let ngrokStarted = await ngrokService.startNgrok();
      
      // Si falla con dominio personalizado, intentar sin dominio
      if (!ngrokStarted) {
        console.log('⚠️ Ngrok failed with custom domain, trying without domain...');
        ngrokStarted = await ngrokService.startNgrokWithoutDomain();
      }
      
      if (ngrokStarted) {
        console.log('✅ Ngrok started successfully');
      } else {
        console.log('⚠️ Ngrok failed to start, but webhook server is running locally');
        console.log('💡 You can still test webhooks locally at: http://localhost:8081');
      }
    } catch (error) {
      console.error('❌ Error starting Rappi webhook server:', error);
    }
  } else {
    console.log('ℹ️ Rappi webhook server not started (use --enable-webhook flag or run in development mode)');
  }

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
  
  // Stop ngrok
  ngrokService.stopNgrok();
  
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
  
  // Stop ngrok
  ngrokService.stopNgrok();
  
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