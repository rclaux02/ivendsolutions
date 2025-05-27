import { contextBridge, ipcRenderer } from 'electron';

// List of all valid IPC channels
const validSendChannels = [
  'verification-start',
  'verification-cancel',
  'hardware:status',
  'hardware:error'
];

const validInvokeChannels = [
  'upload-to-database',
  'upload-to-ftp',
  'populate-slot-mappings',
  'hardware:initialize',
  'hardware:status',
  'hardware:dispense-product',
  'hardware:verify-age',
  'hardware:error',
  'izipay:login',
  'izipay:process-transaction',
  'izipay:list-ports',
  'izipay:test-port',
  'izipay:test-api',
  'products:get-for-machine',
  'products:get-by-code',
  'get-slot-mapping',
  'dispense-product-db',
  'start-face-sdk',
  'stop-face-sdk',
  'create-user',
  'detect-faces',
  'match-faces',
  'ping-face-service',
  'users:get-all-embeddings',
  // Add Rappi channels
  'rappi:authenticate',
  'rappi:getStatus',
  'rappi:initiateHandshake',
  'rappi:verifyHandshake',
  // Add Rappi Inventory channels
  'rappi-inventory:generate',
  'rappi-inventory:getStats',
  'rappi-inventory:updateConfig',
  'rappi-inventory:getConfig',
  'faces:getAll',
  'faces:save',
  // --- Add new purchase channels ---
  'purchase:createTransaction',
  'purchase:createItem',
  'purchase:submitFeedback'
  // --- End of new channels ---
];

const validListenChannels = [
  'verification-success',
  'verification-failure',
  'hardware:status',
  'hardware:error'
];

// Log that preload is running
// console.log('Preload script is running...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data?: any) => {
      // console.log(`Renderer attempting to send on channel: ${channel}`);
      if (validSendChannels.includes(channel)) {
        // console.log(`Sending on channel: ${channel}`);
        ipcRenderer.send(channel, data);
      } else {
        console.error(`Invalid send channel: ${channel}`);
      }
    },
    invoke: (channel: string, data?: any) => {
      // console.log(`Renderer attempting to invoke on channel: ${channel}`);
      if (validInvokeChannels.includes(channel)) {
        // console.log(`Invoking on channel: ${channel}`);
        return ipcRenderer.invoke(channel, data);
      }
      console.error(`Invalid invoke channel: ${channel}`);
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    },
    on: (channel: string, func: (...args: any[]) => void) => {
      // console.log(`Renderer setting up listener on channel: ${channel}`);
      if (validListenChannels.includes(channel)) {
        // console.log(`Setting up listener on channel: ${channel}`);
        // Deliberately strip event as it includes `sender` 
        const subscription = (_event: any, ...args: any[]) => func(...args);
        ipcRenderer.on(channel, subscription);
        return () => {
          // console.log(`Removing listener from channel: ${channel}`);
          ipcRenderer.removeListener(channel, subscription);
        };
      }
      console.error(`Invalid listen channel: ${channel}`);
      return () => {};
    },
    removeAllListeners: (channel: string) => {
      // console.log(`Renderer removing all listeners from channel: ${channel}`);
      if (validListenChannels.includes(channel)) {
        // console.log(`Removing all listeners from channel: ${channel}`);
        ipcRenderer.removeAllListeners(channel);
      } else {
        console.error(`Invalid removeAllListeners channel: ${channel}`);
      }
    }
  }
});

// console.log('Preload script completed, electron bridge exposed'); 