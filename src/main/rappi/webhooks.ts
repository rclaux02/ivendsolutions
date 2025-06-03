const express = require('express');
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { products, Product } from '../data/dummyProducts';
import { HardwareChannel } from '../hardware/hardwareChannel';
import axios from 'axios';
import { 
  createRappiOrder, 
  updateRappiOrderStatus, 
  updateRappiOrderCourierAssignment,
  getRappiOrderCourierEventUuid
} from '../database/operations/rappiOrderOperations';
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Set environment variables explicitly
const PORT = 8081;
const RAPPI_API_KEY = 'f1851d96-64ee-4dc4-bf2b-9c442e22240f' // Test '1d54fd91d5282798eba6a8b4cd8e0ecd8c07fb50eb43137ab27a99f32ae198c8';

// Tests Chile
// const RAPPI_STORE_ID_TEST = 9953; // store id test de Rappi Chile
// const RAPPI_CLIENT_ID = 'ssyqmv1PkgnqARhJNbTHb8tUEy0zpEpa';
// const RAPPI_CLIENT_SECRET = 'VAhRLYlaikXjjsG0MqmUbYcUgvGZ7LcY5jjfbx8KSM03zYW-pdMcAOEtYxih3Suz';
// const RAPPI_BASE_URL = 'https://services.rappi.cl/api/open-api';

// Tests Peru
const RAPPI_CLIENT_ID = '7QX2s459mffWRUhbbGhgXn1TrzIwjKE1' // Test 'ugRKsfn27Au5jEmkcaIDrbDFHlkderHv';
const RAPPI_CLIENT_SECRET = 'Wui1NCI2BkbLzrDMu1Qq0MD4aO3HEq0377IzVIx83f1s2vptQ5LGMrzxQQBN4AxG'// Test 'cgAC7VMO6--j6qj-WLxPO9a1MGVVEQcwYiniPDnwoLP-3WOEnzfM0NKB0b-BD-cP';
const RAPPI_BASE_URL = 'https://services.rappi.pe/api/open-api';
const RAPPI_STORE_ID_TEST = 59434; // store id real de Vapebox Rappi Peru

// Id y secret para tests en chile
// CLIENT_ID: ssyqmv1PkgnqARhJNbTHb8tUEy0zpEpa
// CLIENT_SECRET: VAhRLYlaikXjjsG0MqmUbYcUgvGZ7LcY5jjfbx8KSM03zYW-pdMcAOEtYxih3Suz


// Define Rappi webhook event types
export enum RappiWebhookEvent {
  ORDER_CREATED = 'order.created',
  ORDER_ACCEPTED = 'order.accepted',
  ORDER_PREPARING = 'order.preparing',
  ORDER_READY = 'order.ready',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_REJECTED = 'order.rejected',
  PRODUCT_REMOVED = 'order.product.removed',
  UNITS_MODIFIED = 'order.product.units.modified'
}

// Define Rappi order status
export enum RappiOrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

// Define Rappi order interface
export interface RappiOrder {
  id: string;
  status: RappiOrderStatus;
  items: RappiOrderItem[];
  total: number;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  store: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Define Rappi order item interface
export interface RappiOrderItem {
  id: string;
  name: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// Define inventory result interface
interface InventoryResult {
  success: boolean;
  error?: string;
}

// Define inventory management interface
interface InventoryManagement {
  checkStock(slotId: string): Promise<number>;
  reserveStock(slotId: string, quantity: number): Promise<InventoryResult>;
  releaseStock(slotId: string, quantity: number): Promise<InventoryResult>;
  updateStock(slotId: string, newQuantity: number): Promise<InventoryResult>;
  getAvailableStock(slotId: string): Promise<number>;
}

// Create inventory management class
class VendingMachineInventory implements InventoryManagement {
  private inventory: Map<string, number> = new Map();
  private reservedStock: Map<string, number> = new Map();

  constructor() {
    // Initialize inventory from products data
    products.forEach(product => {
      this.inventory.set(product.slot_id, product.slot_quantity);
    });
  }

  async checkStock(slotId: string): Promise<number> {
    return this.inventory.get(slotId) || 0;
  }

  async reserveStock(slotId: string, quantity: number): Promise<InventoryResult> {
    const currentStock = await this.checkStock(slotId);
    if (currentStock >= quantity) {
      this.reservedStock.set(slotId, (this.reservedStock.get(slotId) || 0) + quantity);
      return { success: true };
    }
    return { success: false, error: 'Insufficient stock' };
  }

  async releaseStock(slotId: string, quantity: number): Promise<InventoryResult> {
    const reserved = this.reservedStock.get(slotId) || 0;
    if (reserved >= quantity) {
      this.reservedStock.set(slotId, reserved - quantity);
      return { success: true };
    }
    return { success: false, error: 'Invalid release quantity' };
  }

  async updateStock(slotId: string, newQuantity: number): Promise<InventoryResult> {
    if (newQuantity >= 0) {
      this.inventory.set(slotId, newQuantity);
      return { success: true };
    }
    return { success: false, error: 'Invalid quantity' };
  }

  async getAvailableStock(slotId: string): Promise<number> {
    const total = await this.checkStock(slotId);
    const reserved = this.reservedStock.get(slotId) || 0;
    return Math.max(0, total - reserved);
  }
}

// Create inventory management instance
const inventoryManager = new VendingMachineInventory();

// Initialize webhook server
const webhookApp = express();
webhookApp.use(express.json());

// Middleware to verify API key
const verifyApiKey: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== RAPPI_API_KEY) {
    console.error('Invalid API key received:', apiKey);
    res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    return;
  }
  
  next();
};

// Apply API key verification to all webhook endpoints
// webhookApp.use('/webhook', verifyApiKey);

// Webhook endpoints
webhookApp.post('/webhook/order-created', async (req: Request, res: Response): Promise<void> => {
  try {
    // Log the entire request for debugging
    console.log('Received webhook request:');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Debug event_uuid specifically
    console.log('Debug event_uuid:', {
      bodyType: typeof req.body,
      isObject: req.body instanceof Object,
      hasEventUuid: 'event_uuid' in req.body,
      eventUuidValue: req.body.event_uuid,
      bodyKeys: Object.keys(req.body),
      bodyStringified: JSON.stringify(req.body)
    });

    // Extract order ID from request body
    const orderId = req.body.id;
    if (!orderId) {
      throw new Error('Order ID not found in request body');
    }

    // Get bearer token first
    const authResponse = await axios.post(
      `${RAPPI_BASE_URL}/login`,
      {
        client_id: RAPPI_CLIENT_ID,
        client_secret: RAPPI_CLIENT_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    console.log('authResponse.data: ', authResponse.data);
    const bearerToken = authResponse.data.access_token;

    // Check if this is a created order event
    if (req.body.status === 'created') {
      const createdOrderEventUuid = req.body.event_uuid;
      console.log('Successfully extracted event_uuid:', createdOrderEventUuid);
      try {
        await createRappiOrder(orderId, createdOrderEventUuid, {
          total: req.body.total,
          total_price: req.body.total_price,
          client: {
            first_name: req.body.client?.first_name || '',
            last_name: req.body.client?.last_name || '',
            email: req.body.client?.email || ''
          }
        });
        console.log('Successfully stored order in database');
      } catch (error) {
        console.error('Error storing order in database:', error);
        throw error;
      }

      
      // Make request to start picking the order with bearer token
      console.log('Using event_uuid:', createdOrderEventUuid);

      const response = await axios.post(
        `${RAPPI_BASE_URL}/v1/orders/${orderId}/start_picking`,
        {
          "picking_time": 15
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearerToken}`,
            'event_uuid': createdOrderEventUuid
          }
        }
      );
      console.log('Start picking response:', response.data);

      // const startPickingEventUuid = response.data.event_uuid;
      // console.log('startPickingEventUuid: ', startPickingEventUuid);

      // Report invoice after successful start picking
      const invoiceResponse = await axios.post(
        `${RAPPI_BASE_URL}/v1/orders/${orderId}/report_invoice`,
        {
          "total_price": 12
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearerToken}`,
            'event_uuid': createdOrderEventUuid
          }
        }
      );
      console.log('Report invoice response:', invoiceResponse.data);

      // const invoiceEventUuid = invoiceResponse.data.event_uuid;
      // console.log('invoiceEventUuid: ', invoiceEventUuid);

      // Request courier after successful invoice report
      const courierResponse = await axios.post(
        `${RAPPI_BASE_URL}/v1/orders/${orderId}/request_courier`,
        {
          "store_id": RAPPI_STORE_ID_TEST,
          "vehicle_type": "motorbike"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${bearerToken}`,
            'event_uuid': createdOrderEventUuid
          }
        }
      );
      console.log('Request courier response:', courierResponse.data);
    }
    

    // Check if this is a delivered order event, when status is "finished"
    if (req.body.status === 'finished') {
      console.log('Received order delivery confirmation (finished status)');
      
      try {
        // Extract order ID and event UUID from request body
        const orderId = req.body.id;
        const eventUuid = req.body.event_uuid;
        const deliveredAt = req.body.delivered_at || new Date().toISOString();
        
        // Log delivery details
        console.log(`Processing order delivery for order ID: ${orderId}`);
        console.log(`Delivery event UUID: ${eventUuid}`);
        console.log(`Delivered at: ${deliveredAt}`);
        
        // Update the order status to DELIVERED in the database with delivered_at timestamp
        const updated = await updateRappiOrderStatus(orderId, 'DELIVERED', eventUuid, deliveredAt);
        
        if (updated) {
          console.log(`Successfully updated order ${orderId} status to DELIVERED`);
        } else {
          console.error(`Failed to update order ${orderId} status to DELIVERED - order may not exist`);
        }
        
        // Return success response
        res.status(200).json({ 
          success: true,
          message: 'Order delivery processed'
        });
        return;
      } catch (error) {
        console.error('Error processing order delivery:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to process order delivery',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
      }
    }

    // Check if this is a courier assignment event AND the order is not finished
    if (req.body.courier && req.body.status !== 'finished') {
      if (req.body.courier.first_name !== "") {
        console.log('Received courier assignment for non-finished order:', req.body.courier);
        
        // Store courier assignment event UUID
        const orderId = req.body.id;
        const eventUuid = req.body.event_uuid;
        
        try {
          const updated = await updateRappiOrderCourierAssignment(
            orderId,
            eventUuid,
            {
              first_name: req.body.courier.first_name,
              last_name: req.body.courier.last_name
            }
          );
          console.log('Courier assignment update result: ', updated);
          if (updated) {
            console.log(`Successfully updated order ${orderId} with courier assignment event UUID: ${eventUuid}`);
          } else {
            console.error(`Failed to update order ${orderId} with courier assignment - order may not exist or already has this event UUID`);
          }
          
          // Return success response
          res.status(200).json({ 
            success: true,
            message: 'Courier assignment acknowledged' 
          });
          return; // Ensure we don't fall through to other handlers
        } catch (error) {
          console.error('Error processing courier assignment:', error);
          res.status(500).json({ 
            success: false, 
            error: 'Failed to process courier assignment' 
          });
          return; // Ensure we don't fall through to other handlers
        }
      }
    }

    // Check if this is a cancelled order event. Esta situacion es cuando el cliente, desde el app de Rappi, cancela el pedido.
    if (req.body.status === 'canceled') {
      console.log('Received canceled order');
      
      try {
        // Update the order status to CANCELLED in the database
        const orderId = req.body.id;
        const eventUuid = req.body.event_uuid;
        
        // Log cancellation details
        console.log(`Processing order cancellation for order ID: ${orderId}`);
        console.log(`Cancellation event UUID: ${eventUuid}`);
        
        if (req.body.cancellation_reason) {
          console.log(`Cancellation reason: ${req.body.cancellation_reason}`);
        }
        
        const updated = await updateRappiOrderStatus(orderId, 'CANCELLED', eventUuid);
        
        if (updated) {
          console.log(`Successfully updated order ${orderId} status to CANCELLED`);
          
          // We could add additional business logic here if needed:
          // - Send notification to admin
          // - Release any reserved inventory
          // - Update statistics
        } else {
          console.error(`Failed to update order ${orderId} status to CANCELLED - order may not exist`);
        }
        
        // Return success response
        res.status(200).json({ 
          success: true,
          message: 'Order cancellation processed',
          order_id: orderId
        });
        return;
      } catch (error) {
        console.error('Error processing order cancellation:', error);
        res.status(500).json({ 
          success: false,
          error: 'Failed to process order cancellation',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
      }
    }

    // Acknowledge receipt
    res.status(200).json({ 
      success: true,
      message: 'Webhook received',
      receivedData: req.body 
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start webhook server
webhookApp.listen(PORT, () => {
  console.log(`Rappi webhook server listening on port ${PORT}`);
});

// Export for use in main process
export const startRappiWebhooks = (): void => {
  // Register IPC handlers
  ipcMain.handle('rappi:authenticate', async () => {
    try {
      const authResponse = await axios.post(
        `${RAPPI_BASE_URL}/login`,
        {
          client_id: RAPPI_CLIENT_ID,
          client_secret: RAPPI_CLIENT_SECRET
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!authResponse.data.access_token) {
        throw new Error('No access token received from Rappi API');
      }

      return {
        success: true,
        token: authResponse.data.access_token
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  });

  ipcMain.handle('check-inventory', async (_: IpcMainInvokeEvent, productId: string) => {
    return inventoryManager.checkStock(productId);
  });

  ipcMain.handle('reserve-inventory', async (_: IpcMainInvokeEvent, productId: string, quantity: number) => {
    return inventoryManager.reserveStock(productId, quantity);
  });

  ipcMain.handle('release-inventory', async (_: IpcMainInvokeEvent, productId: string, quantity: number) => {
    return inventoryManager.releaseStock(productId, quantity);
  });

  ipcMain.handle('update-inventory', async (_: IpcMainInvokeEvent, productId: string, quantity: number) => {
    return inventoryManager.updateStock(productId, quantity);
  });
}; 