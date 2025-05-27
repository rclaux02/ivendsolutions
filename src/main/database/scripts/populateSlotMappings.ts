import { ipcMain } from 'electron';
import mysql from 'mysql2/promise';

// Define interfaces for clarity
interface SlotMapping {
  product_id: number;
  product_name: string;
  slot_id: string;
  quantity: number;
}

interface PopulateResult {
  totalProducts: number;
  mappingsCreated: number;
  mappings: SlotMapping[];
}

// IPC handler registration
export function registerSlotMappingTools(): void {
  ipcMain.handle('populate-slot-mappings', async () => {
    try {
      const result = await populateSlotMappings();
      return { success: true, ...result };
    } catch (error: unknown) {
      console.error('Error in populate-slot-mappings handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
}

// Main function to populate slot mappings
async function populateSlotMappings(): Promise<PopulateResult> {
  console.log('Starting slot mapping population...');
  
  // Database connection configuration
  const dbConfig = {
    host: process.env.DEV_DB_HOST || 'localhost',
    port: parseInt(process.env.DEV_DB_PORT || '3306', 10),
    database: process.env.DEV_DB_NAME || 'vapebox',
    user: process.env.DEV_DB_USER || 'root',
    password: process.env.DEV_DB_PASSWORD || ''
  };
  
  // Create connection
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Begin transaction
    await connection.beginTransaction();
    
    // 1. Get all products from the database
    const [products] = await connection.execute(
      'SELECT FS_ID, FS_DES_PROD, FS_STOCK FROM TA_PRODUCTO WHERE FS_STOCK > 0'
    ) as [any[], any];
    
    console.log(`Found ${products.length} products with stock > 0`);
    
    // 2. Clear existing slot mappings
    await connection.execute('DELETE FROM TA_PRODUCT_SLOT_MAPPING');
    console.log('Cleared existing slot mappings');
    
    // 3. Distribute products across slots
    const slotMappings: SlotMapping[] = [];
    let mappingsCreated = 0;
    
    // Define some motor slots (example motors in the machine)
    const motorSlots = [
      'Motor11', 'Motor12', 'Motor13', 'Motor14', 'Motor15',
      'Motor21', 'Motor22', 'Motor23', 'Motor24', 'Motor25',
      'Motor31', 'Motor32', 'Motor33', 'Motor34', 'Motor35',
      'Motor41', 'Motor42', 'Motor43', 'Motor44', 'Motor45',
      'Motor51', 'Motor52', 'Motor53', 'Motor54', 'Motor55'
    ];
    
    // For each product, assign to 1-3 motor slots with varying quantities
    for (const product of products) {
      // Determine how many slots this product will occupy (1-3)
      const slotsToUse = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
      
      // Calculate total quantity to distribute (don't exceed stock)
      const totalQuantity = Math.min(product.FS_STOCK, Math.floor(Math.random() * 15) + 5);
      
      // Select random slots
      const selectedSlots: string[] = [];
      for (let i = 0; i < slotsToUse; i++) {
        // Get unused slot
        let slot: string;
        do {
          const randomIndex = Math.floor(Math.random() * motorSlots.length);
          slot = motorSlots[randomIndex];
        } while (selectedSlots.includes(slot));
        
        selectedSlots.push(slot);
      }
      
      // Distribute quantity across selected slots
      let remainingQuantity = totalQuantity;
      
      for (let i = 0; i < selectedSlots.length; i++) {
        const slot = selectedSlots[i];
        
        // For last slot, use all remaining quantity
        let slotQuantity: number;
        if (i === selectedSlots.length - 1) {
          slotQuantity = remainingQuantity;
        } else {
          // Distribute between 1 and remaining quantity / (slots left)
          const avgRemaining = Math.ceil(remainingQuantity / (selectedSlots.length - i));
          slotQuantity = Math.floor(Math.random() * avgRemaining) + 1;
        }
        
        remainingQuantity -= slotQuantity;
        
        // Insert mapping record
        const query = `
          INSERT INTO TA_PRODUCT_SLOT_MAPPING (
            product_id, slot_id, quantity, last_updated
          ) VALUES (?, ?, ?, ?)
        `;
        
        const params = [
          product.FS_ID,
          slot,
          slotQuantity,
          new Date()
        ];
        
        await connection.execute(query, params);
        mappingsCreated++;
        
        slotMappings.push({
          product_id: product.FS_ID,
          product_name: product.FS_DES_PROD,
          slot_id: slot,
          quantity: slotQuantity
        });
        
        console.log(`Mapped product ${product.FS_ID} (${product.FS_DES_PROD}) to slot ${slot} with quantity ${slotQuantity}`);
      }
    }
    
    // Commit transaction
    await connection.commit();
    
    console.log(`Slot mapping population completed successfully. Created ${mappingsCreated} mappings.`);
    
    return {
      totalProducts: products.length,
      mappingsCreated: mappingsCreated,
      mappings: slotMappings
    };
  } catch (error) {
    // Rollback on error
    await connection.rollback();
    console.error('Population failed, transaction rolled back:', error);
    throw error;
  } finally {
    // Close the connection
    await connection.end();
  }
}

// Export the main function for direct use
export { populateSlotMappings }; 