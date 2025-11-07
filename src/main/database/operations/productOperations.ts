import { createConnectionPool } from '../dbConnection';
import { getSmartDbConfig } from '../dbConfig';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';

/**
 * Interface representing a product from the database
 */
export interface DatabaseProduct extends RowDataPacket {
  FS_ID: number;
  FS_EMP: string;
  FS_SEDE: string;
  FS_LOCAL: string;
  FN_COD_PROD: string;
  FS_DES_PROD: string;
  FS_SKU: string;
  FS_STOCK: number;
  FN_COD_LIS_PREC: string;
  FS_ALMA: string;
  FS_NOM_USU_CRE: string;
  FD_FEC_CRE: Date;
  FD_FEC_MOD: Date;
  FX_IMG: Buffer;
  FN_PREC_VTA: number;
  FX_IMG2: Buffer;
  FS_INFO: string;
  FS_DSCTO: string;
  FS_MARCA: string;
  FS_PUFFS: number;
  FS_PORCENTAJE_NICOTINA?: number;
  FS_SABOR?: string;
  total_quantity?: number; // Total quantity across all slots
}

/**
 * Interface representing a product slot mapping
 */
export interface SlotMapping extends RowDataPacket {
  product_id: number;
  slot_id: string;
  quantity: number;
}

/**
 * Interface for the product model used in the frontend
 */
export interface ProductModel {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  puffs: number;
  slot_id: string;
  slot_quantity: number;
  discount?: string;
  FS_PORCENTAJE_NICOTINA?: number;
  FS_SABOR?: string;
  FS_DES_PROD?: string;
  FS_DES_PROD_CONT?: string;
  FS_DES_PROD_DETA?: string;
  FS_DIMENSION?: string;
  FS_TIP_CARGA?: string;
  has_stock: boolean;
}

/**
 * Custom connection function that uses smart database configuration
 */
async function withSmartConnection<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const smartConfig = getSmartDbConfig();
  const pool = createConnectionPool(smartConfig);
  const connection = await pool.getConnection();
  
  try {
    return await callback(connection);
  } finally {
    connection.release();
    pool.end();
  }
}

/**
 * Get all products available for a specific machine code
 * @param machineCode The machine code (FS_LOCAL) to filter products by
 * @returns Promise with an array of products
 */
export async function getProductsForMachine(machineCode: string): Promise<ProductModel[]> {
  try {
    const [rows] = await withSmartConnection<[DatabaseProduct[], any]>(async (connection) => {
      return connection.query(`
        SELECT 
          p.*,
          SUM(sm.QUANTITY) as total_quantity
        FROM TA_PRODUCTO p
        INNER JOIN TA_PRODUCT_SLOT_MAPPING sm
          ON p.FS_ID = sm.PRODUCT_ID
        WHERE sm.MACHINE_CODE = ?
        GROUP BY p.FS_ID
        HAVING SUM(sm.QUANTITY) > 0
      `, [machineCode]);
    });

    console.log(`Found ${rows.length} products for machine ${machineCode}`);
    
    if (rows.length > 0) {
      console.log('First product sample:', {
        id: rows[0].FS_ID,
        sku: rows[0].FS_SKU,
        description: rows[0].FS_DES_PROD,
        price: rows[0].FN_PREC_VTA,
        totalQuantity: rows[0].total_quantity
      });
    }

    // Get slot mappings for all products to determine primary slots
    const productSlotMappings = await getSlotMappingsForProducts(
      rows.map(row => row.FS_ID.toString()),
      machineCode
    );

    // Map database rows to the ProductModel interface
    return rows.map(row => {
      // Convert image buffer to base64 URL if available
      let imageUrl = '/placeholder.svg';
      if (row.FX_IMG) {
        try {
          const base64Image = Buffer.from(row.FX_IMG).toString('base64');
          imageUrl = `data:image/jpeg;base64,${base64Image}`;
        } catch (err) {
          console.error('Error converting image buffer to base64:', err);
        }
      }

      // Find the first slot with stock for this product (if any)
      const productId = row.FS_ID.toString();
      const productSlots = productSlotMappings[productId] || [];
      const firstSlotWithStock = productSlots.length > 0 ? productSlots[0].slot_id : '';
      const totalQuantity = row.total_quantity || 0;
      
      return {
        id: productId,
        name: row.FS_DES_PROD,
        brand: row.FS_MARCA || row.FS_ALMA || 'Unknown', // Use new FS_MARCA field, fallback to FS_ALMA
        price: row.FN_PREC_VTA,
        image: imageUrl,
        puffs: row.FS_PUFFS || 0,
        slot_id: firstSlotWithStock,
        slot_quantity: totalQuantity,
        discount: row.FS_DSCTO,
        FS_PORCENTAJE_NICOTINA: row.FS_PORCENTAJE_NICOTINA,
        FS_SABOR: row.FS_SABOR,
        FS_DES_PROD: row.FS_DES_PROD,
        FS_DES_PROD_CONT: row.FS_DES_PROD_CONT,
        FS_DES_PROD_DETA: row.FS_DES_PROD_DETA,
        FS_DIMENSION: row.FS_DIMENSION,
        FS_TIP_CARGA: row.FS_TIP_CARGA,
        has_stock: totalQuantity > 0
      };
    });
  } catch (error) {
    console.error('Error fetching products for machine:', error);
    throw error;
  }
}

/**
 * Get a single product by its product code
 * @param productCode The product code (FN_COD_PROD)
 * @returns Promise with the product or null if not found
 */
export async function getProductByCode(productCode: string): Promise<ProductModel | null> {
  try {
    const [rows] = await withSmartConnection<[DatabaseProduct[], any]>(async (connection) => {
      return connection.query(`
        SELECT 
          p.FS_ID,
          p.FS_EMP,
          p.FS_SEDE,
          p.FS_LOCAL,
          p.FN_COD_PROD,
          p.FS_DES_PROD,
          p.FS_SKU,
          p.FS_STOCK,
          p.FN_COD_LIS_PREC,
          p.FS_ALMA,
          p.FS_NOM_USU_CRE,
          p.FD_FEC_CRE,
          p.FD_FEC_MOD,
          p.FX_IMG,
          p.FN_PREC_VTA,
          p.FX_IMG2,
          p.FS_INFO,
          p.FS_DSCTO,
          p.FS_MARCA,
          p.FS_PUFFS,
          p.FS_PORCENTAJE_NICOTINA,
          p.FS_SABOR,
          p.FS_DES_PROD_CONT,
          p.FS_DES_PROD_DETA,
          p.FS_DIMENSION,
          p.FS_TIP_CARGA,
          COALESCE((
            SELECT SUM(quantity) 
            FROM TA_PRODUCT_SLOT_MAPPING 
            WHERE product_id = p.FS_ID
          ), 0) as total_quantity
        FROM TA_PRODUCTO p
        WHERE p.FN_COD_PROD = ?
      `, [productCode]);
    });

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    
    // Convert image buffer to base64 URL if available
    let imageUrl = '/placeholder.svg';
    if (row.FX_IMG) {
      try {
        const base64Image = Buffer.from(row.FX_IMG).toString('base64');
        imageUrl = `data:image/jpeg;base64,${base64Image}`;
      } catch (err) {
        console.error('Error converting image buffer to base64:', err);
      }
    }

    // Get slot mappings for this product
    const productId = row.FS_ID.toString();
    const slotMappings = await getSlotMappingsForProducts([productId], '001'); // Default machine code for getProductByCode
    const productSlots = slotMappings[productId] || [];
    const firstSlotWithStock = productSlots.length > 0 ? productSlots[0].slot_id : '';
    const totalQuantity = row.total_quantity || 0;

    return {
      id: productId,
      name: row.FS_DES_PROD,
      brand: row.FS_MARCA || row.FS_ALMA || 'Unknown',
      price: row.FN_PREC_VTA,
      image: imageUrl,
      puffs: row.FS_PUFFS || 0,
      slot_id: firstSlotWithStock,
      slot_quantity: totalQuantity,
      discount: row.FS_DSCTO,
      FS_PORCENTAJE_NICOTINA: row.FS_PORCENTAJE_NICOTINA,
      FS_SABOR: row.FS_SABOR,
      FS_DES_PROD: row.FS_DES_PROD,
      FS_DES_PROD_CONT: row.FS_DES_PROD_CONT,
      FS_DES_PROD_DETA: row.FS_DES_PROD_DETA,
      FS_DIMENSION: row.FS_DIMENSION,
      FS_TIP_CARGA: row.FS_TIP_CARGA,
      has_stock: totalQuantity > 0
    };
  } catch (error) {
    console.error('Error fetching product by code:', error);
    throw error;
  }
}

/**
 * Get slot mappings for a list of product IDs
 * @param productIds Array of product IDs
 * @param machineCode The machine code to filter by
 * @returns Promise with a map of product ID to slot mappings
 */
async function getSlotMappingsForProducts(productIds: string[], machineCode: string): Promise<Record<string, SlotMapping[]>> {
  if (!productIds.length) {
    return {};
  }

  try {
    const [rows] = await withSmartConnection<[SlotMapping[], any]>(async (connection) => {
      const placeholders = productIds.map(() => 'CAST(? AS UNSIGNED)').join(',');
      return connection.query<SlotMapping[]>(
        `SELECT product_id, slot_id, quantity 
         FROM TA_PRODUCT_SLOT_MAPPING 
         WHERE product_id IN (${placeholders})
         AND machine_code = ?
         AND quantity > 0`,
        [...productIds, machineCode]
      );
    });

    // Group by product_id
    const result: Record<string, SlotMapping[]> = {};
    
    for (const row of rows) {
      const productId = row.product_id.toString();
      if (!result[productId]) {
        result[productId] = [];
      }
      result[productId].push(row);
    }

    return result;
  } catch (error) {
    console.error('Error getting slot mappings for products:', error);
    return {};
  }
}

/**
 * Get total available inventory for a product across all slots in a specific machine
 * @param productId The product ID to check
 * @param machineCode The machine code to filter by
 * @returns Promise with total available quantity
 */
export async function getTotalProductInventory(productId: string, machineCode?: string): Promise<number> {
  try {
    const currentMachineCode = machineCode || '001';
    console.log(`[DB] Getting total inventory for product ID: ${productId}, machine: ${currentMachineCode}`);
    
    const [rows] = await withSmartConnection<[any[], any]>(async (connection) => {
      return connection.query(
        `SELECT SUM(quantity) as total_quantity 
         FROM TA_PRODUCT_SLOT_MAPPING 
         WHERE product_id = CAST(? AS UNSIGNED) AND machine_code = ? AND quantity > 0`,
        [productId, currentMachineCode]
      );
    });
    
    if (!rows || rows.length === 0 || !rows[0].total_quantity) {
      console.log(`[DB] No inventory found for product ${productId} in machine ${currentMachineCode}`);
      return 0;
    }
    
    const totalQuantity = Number(rows[0].total_quantity);
    console.log(`[DB] Total inventory for product ${productId} in machine ${currentMachineCode}: ${totalQuantity}`);
    
    return totalQuantity;
  } catch (error) {
    console.error('[DB] Error getting total product inventory:', error);
    return 0;
  }
}

/**
 * Get all available slot mappings for a product, sorted by quantity in descending order
 * @param productId The product ID (FS_ID)
 * @param machineCode The machine code to filter by (optional)
 * @returns Promise with an array of slot mappings
 */
export async function getAllAvailableSlotMappings(productId: string, machineCode?: string): Promise<SlotMapping[]> {
  try {
    const currentMachineCode = machineCode || '001';
    console.log(`[DB] Fetching all available slots for product ID: ${productId}, machine: ${currentMachineCode}`);
    
    // Get all slots for this product with quantity > 0
    const [rows] = await withSmartConnection<[SlotMapping[], any]>(async (connection) => {
      return connection.query<SlotMapping[]>(
        `SELECT product_id, slot_id, quantity 
         FROM TA_PRODUCT_SLOT_MAPPING 
         WHERE product_id = CAST(? AS UNSIGNED) AND machine_code = ? AND quantity > 0
         ORDER BY quantity DESC`,
        [productId, currentMachineCode]
      );
    });
    
    if (!rows || rows.length === 0) {
      console.log(`[DB] No slots with inventory found for product ${productId}`);
      return [];
    }
    
    // Log what we found
    console.log(`[DB] Found ${rows.length} slots with inventory for product ${productId}:`, 
      rows.map(slot => `${slot.slot_id}(${slot.quantity})`).join(', ')
    );
    
    return rows;
  } catch (error) {
    console.error('[DB] Error getting all slot mappings:', error);
    return [];
  }
}

/**
 * Dispense a product from a specific slot or find the best available slot
 * @param productId The product ID to dispense
 * @param slotId Optional specific slot ID to dispense from
 * @param quantity Number of items to dispense (default: 1)
 * @param machineCode The machine code to filter by (optional)
 * @returns Promise with dispense result
 */
export async function dispenseProductFromSlot(
  productId: string, 
  slotId?: string,
  quantity: number = 1,
  machineCode?: string
): Promise<{ 
  success: boolean; 
  message?: string; 
  slotId?: string; 
  quantityDispensed?: number;
  usedSlots?: Array<{slotId: string, quantityDispensed: number}>;
  isMultiSlot?: boolean;
}> {
  try {
    const currentMachineCode = machineCode || '001';
    console.log(`[DB] Dispensing ${quantity} units of product ${productId} from slot ${slotId || 'auto'}, machine: ${currentMachineCode}`);
    
    // If a specific slot is provided, try to dispense from it first
    if (slotId) {
      console.log(`[DB] Attempting to dispense from specified slot: ${slotId}`);
      
      // Check if the slot has enough inventory
      const [slotRows] = await withSmartConnection<[SlotMapping[], any]>(async (connection) => {
        return connection.query<SlotMapping[]>(
          `SELECT product_id, slot_id, quantity 
           FROM TA_PRODUCT_SLOT_MAPPING 
           WHERE product_id = CAST(? AS UNSIGNED) AND slot_id = ? AND machine_code = ? AND quantity >= ?`,
          [productId, slotId, currentMachineCode, quantity]
        );
      });
      
      if (!slotRows || slotRows.length === 0) {
        console.log(`[DB] Slot ${slotId} doesn't have enough inventory for product ${productId}`);
        return {
          success: false,
          message: `Insufficient inventory in slot ${slotId} for product ${productId}`
        };
      }
      
      const slotInfo = slotRows[0];
      const quantityToDispense = Math.min(quantity, slotInfo.quantity);
      
      console.log(`[DB] Slot ${slotId} has ${slotInfo.quantity} units, dispensing ${quantityToDispense}`);

      // Update the quantity in the database
      try {
        const updateResult = await withSmartConnection(async (connection) => {
          return connection.query(
            `UPDATE TA_PRODUCT_SLOT_MAPPING 
             SET quantity = quantity - ?, last_updated = NOW() 
             WHERE product_id = CAST(? AS UNSIGNED) AND slot_id = ? AND machine_code = ? AND quantity >= ?`,
            [quantityToDispense, productId, slotId, currentMachineCode, quantityToDispense]
          );
        });
        
        console.log(`[DB] Update result:`, updateResult);
        
        // Verify the update was successful by checking affected rows
        if (updateResult && updateResult[0] && (updateResult[0] as any).affectedRows === 0) {
          console.error(`[DB] Update failed - no rows affected`);
          return {
            success: false,
            message: `Failed to update inventory for product ${productId} in slot ${slotId}`
          };
        }
      } catch (dbError) {
        console.error(`[DB] Database update error:`, dbError);
        return {
          success: false,
          message: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
        };
      }

      console.log(`[DB] Successfully dispensed ${quantityToDispense} units from slot ${slotId}`);
      return { 
        success: true,
        slotId: slotId,
        quantityDispensed: quantityToDispense
      };
    } else {
      // No specific slot provided, implement multi-slot dispensing
      console.log(`[DB] No specific slot provided, implementing multi-slot dispensing for product ${productId}`);
      
      // Get all available slots for this product in the current machine
      const availableSlots = await getAllAvailableSlotMappings(productId, currentMachineCode);
      
      if (availableSlots.length === 0) {
        console.log(`[DB] No slots with inventory found for product ${productId} in machine ${currentMachineCode}`);
        return {
          success: false,
          message: `No inventory available for product ${productId} in machine ${currentMachineCode}`
        };
      }
      
      // Calculate total available quantity across all slots
      const totalAvailableQuantity = availableSlots.reduce((sum, slot) => sum + slot.quantity, 0);
      console.log(`[DB] Total available quantity for product ${productId} across all slots: ${totalAvailableQuantity}`);
      
      if (totalAvailableQuantity < quantity) {
        console.log(`[DB] Insufficient total inventory: ${totalAvailableQuantity} < ${quantity}`);
        return {
          success: false,
          message: `Insufficient total inventory for ${quantity} units of product ${productId}. Available: ${totalAvailableQuantity} units`
        };
      }
      
      // Implement multi-slot dispensing
      let remainingQuantity = quantity;
      let totalDispensed = 0;
      const usedSlots: Array<{slotId: string, quantityDispensed: number}> = [];
      
      // Sort slots by quantity (highest first) for optimal dispensing
      const sortedSlots = [...availableSlots].sort((a, b) => b.quantity - a.quantity);
      
      for (const slot of sortedSlots) {
        if (remainingQuantity <= 0) break;
        
        const quantityToDispenseFromSlot = Math.min(remainingQuantity, slot.quantity);
        console.log(`[DB] Dispensing ${quantityToDispenseFromSlot} units from slot ${slot.slot_id} (has ${slot.quantity} units)`);
        
      try {
        const updateResult = await withSmartConnection(async (connection) => {
          return connection.query(
            `UPDATE TA_PRODUCT_SLOT_MAPPING 
             SET quantity = quantity - ?, last_updated = NOW() 
               WHERE product_id = CAST(? AS UNSIGNED) AND slot_id = ? AND machine_code = ? AND quantity >= ?`,
              [quantityToDispenseFromSlot, productId, slot.slot_id, currentMachineCode, quantityToDispenseFromSlot]
          );
        });
        
          // Verify the update was successful
        if (updateResult && updateResult[0] && (updateResult[0] as any).affectedRows === 0) {
            console.error(`[DB] Update failed for slot ${slot.slot_id}`);
            continue; // Try next slot
          }
          
          // Update tracking variables
          remainingQuantity -= quantityToDispenseFromSlot;
          totalDispensed += quantityToDispenseFromSlot;
          usedSlots.push({
            slotId: slot.slot_id,
            quantityDispensed: quantityToDispenseFromSlot
          });
          
          console.log(`[DB] Successfully dispensed ${quantityToDispenseFromSlot} units from slot ${slot.slot_id}`);
          
        } catch (dbError) {
          console.error(`[DB] Database update error for slot ${slot.slot_id}:`, dbError);
          continue; // Try next slot
        }
      }
      
      if (totalDispensed === 0) {
        console.error(`[DB] Failed to dispense any units from any slot`);
          return {
            success: false,
          message: `Failed to dispense any units of product ${productId} from available slots`
          };
        }
      
      if (totalDispensed < quantity) {
        console.log(`[DB] Partially dispensed: ${totalDispensed}/${quantity} units`);
        return {
          success: false,
          message: `Partially dispensed: ${totalDispensed}/${quantity} units of product ${productId}`
        };
      }

      console.log(`[DB] Multi-slot dispensing completed successfully: ${totalDispensed} units from slots:`, 
        usedSlots.map(slot => `${slot.slotId}(${slot.quantityDispensed})`).join(', ')
      );
      
      return { 
        success: true,
        slotId: usedSlots[0].slotId, // Return first slot used for compatibility
        quantityDispensed: totalDispensed,
        usedSlots: usedSlots, // Add information about all slots used
        isMultiSlot: usedSlots.length > 1 // Indicate if multiple slots were used
      };
    }
  } catch (error) {
    console.error('[DB] Error dispensing product:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred while dispensing product'
    };
  }
} 