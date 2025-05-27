import { withConnection } from '../dbConnection';
import { RowDataPacket } from 'mysql2/promise';

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
 * Interface for the product model used in the UI
 */
export interface ProductModel {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  puffs: number;
  slot_id: string; // This will be the first available slot or '' if none
  slot_quantity: number; // This will be the total quantity across all slots
  discount?: string;
  has_stock: boolean; // Whether this product has any stock available
  FS_PORCENTAJE_NICOTINA?: number;
  FS_SABOR?: string;
}

/**
 * Interface for slot mapping from the database
 */
export interface SlotMapping extends RowDataPacket {
  slot_id: string;
  quantity: number;
  product_id: number;
}

/**
 * Get all products available for a specific machine code
 * @param machineCode The machine code (FS_LOCAL) to filter products by
 * @returns Promise with an array of products
 */
export async function getProductsForMachine(machineCode: string): Promise<ProductModel[]> {
  try {
    const [rows] = await withConnection<[DatabaseProduct[], any]>(async (connection) => {
      // Query products for the specified machine with total quantities
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
          COALESCE(SUM(sm.quantity), 0) as total_quantity
        FROM TA_PRODUCTO p
        LEFT JOIN TA_PRODUCT_SLOT_MAPPING sm ON p.FS_ID = sm.product_id
        WHERE p.FS_LOCAL = ?
        GROUP BY p.FS_ID
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
      rows.map(row => row.FS_ID.toString())
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
    const [rows] = await withConnection<[DatabaseProduct[], any]>(async (connection) => {
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
    const slotMappings = await getSlotMappingsForProducts([productId]);
    const productSlots = slotMappings[productId] || [];
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
 * @returns Promise with a map of product ID to slot mappings
 */
async function getSlotMappingsForProducts(productIds: string[]): Promise<Record<string, SlotMapping[]>> {
  if (!productIds.length) {
    return {};
  }

  try {
    const [rows] = await withConnection<[SlotMapping[], any]>(async (connection) => {
      const placeholders = productIds.map(() => 'CAST(? AS UNSIGNED)').join(',');
      return connection.query<SlotMapping[]>(
        `SELECT product_id, slot_id, quantity 
         FROM TA_PRODUCT_SLOT_MAPPING 
         WHERE product_id IN (${placeholders})
         AND quantity > 0`,
        productIds
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
 * Get all available slot mappings for a product, sorted by quantity in descending order
 * @param productId The product ID (FS_ID)
 * @returns Promise with an array of slot mappings
 */
export async function getAllAvailableSlotMappings(productId: string): Promise<SlotMapping[]> {
  try {
    console.log(`[DB] Fetching all available slots for product ID: ${productId}`);
    
    // Get all slots for this product with quantity > 0
    const [rows] = await withConnection<[SlotMapping[], any]>(async (connection) => {
      return connection.query<SlotMapping[]>(
        `SELECT product_id, slot_id, quantity 
         FROM TA_PRODUCT_SLOT_MAPPING 
         WHERE product_id = CAST(? AS UNSIGNED) AND quantity > 0
         ORDER BY quantity DESC`,
        [productId]
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
 * Get available slot mapping for a product
 * @param productId The product ID (FS_ID)
 * @returns Promise with the slot mapping or null if not found
 */
export async function getAvailableSlotMapping(productId: string): Promise<SlotMapping | null> {
  try {
    // Get all slots for this product, sorted by quantity
    const productSlots = await getAllAvailableSlotMappings(productId);
    
    // Return the first available slot, or null if no slots available
    return productSlots.length > 0 ? productSlots[0] : null;
  } catch (error) {
    console.error('Error getting slot mapping:', error);
    throw error;
  }
}

/**
 * Dispense a product and update its quantity in the database
 * @param productId The product ID (FS_ID)
 * @param slotId Optional - if provided, dispense from this specific slot
 * @param quantity Optional - number of items to dispense, defaults to 1
 * @returns Promise with the dispensing result
 */
export async function dispenseProductFromSlot(
  productId: string, 
  slotId?: string,
  quantity: number = 1
): Promise<{ success: boolean; message?: string; slotId?: string; quantityDispensed?: number }> {
  try {
    console.log(`[DB] Starting dispense operation - Product ID: ${productId}, Requested quantity: ${quantity}`);
    
    // Validate inputs
    if (!productId) {
      console.error('[DB] Invalid product ID:', productId);
      return { success: false, message: 'Invalid product ID' };
    }
    
    // If slotId is provided, dispense from that specific slot
    if (slotId) {
      console.log(`[DB] Dispensing from specific slot ${slotId}`);
      
      // Verify the slot has available quantity
      const [rows] = await withConnection(async (connection) => {
        return connection.query<SlotMapping[]>(
          `SELECT slot_id, quantity 
           FROM TA_PRODUCT_SLOT_MAPPING 
           WHERE product_id = CAST(? AS UNSIGNED) AND slot_id = ? AND quantity > 0`,
          [productId, slotId]
        );
      });

      console.log(`[DB] Slot query result:`, rows);

      if (!rows || rows.length === 0) {
        console.error(`[DB] No available quantity found for product ${productId} in slot ${slotId}`);
        return {
          success: false,
          message: `No available quantity found for product ${productId} in slot ${slotId}`
        };
      }

      // Determine actual quantity to dispense (limited by available stock)
      const availableQuantity = rows[0].quantity;
      const quantityToDispense = Math.min(quantity, availableQuantity);
      
      console.log(`[DB] Available quantity: ${availableQuantity}, Will dispense: ${quantityToDispense}`);

      if (quantityToDispense <= 0) {
        console.error(`[DB] Cannot dispense ${quantityToDispense} items (must be > 0)`);
        return {
          success: false,
          message: `Cannot dispense ${quantityToDispense} items (must be > 0)`
        };
      }

      // Update the quantity in the database
      try {
        const updateResult = await withConnection(async (connection) => {
          return connection.query(
            `UPDATE TA_PRODUCT_SLOT_MAPPING 
             SET quantity = quantity - ?, last_updated = NOW() 
             WHERE product_id = CAST(? AS UNSIGNED) AND slot_id = ? AND quantity >= ?`,
            [quantityToDispense, productId, slotId, quantityToDispense]
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
    } 
    // If no slotId provided, find the best slot with most items
    else {
      console.log(`[DB] Auto-selecting best slot for product ${productId}`);
      
      // Get all available slots for this product, sorted by quantity
      const allSlots = await getAllAvailableSlotMappings(productId);
      console.log(`[DB] Available slots:`, allSlots);
      
      if (allSlots.length === 0) {
        console.error(`[DB] No available slots found for product ${productId}`);
        return {
          success: false,
          message: `No available stock found for product ${productId}`
        };
      }

      // Select the slot with the most items
      const bestSlot = allSlots[0];
      const targetSlotId = bestSlot.slot_id;
      const availableQuantity = bestSlot.quantity;
      const quantityToDispense = Math.min(quantity, availableQuantity);
      
      console.log(`[DB] Selected slot ${targetSlotId} with ${availableQuantity} units available. Will dispense: ${quantityToDispense}`);

      if (quantityToDispense <= 0) {
        console.error(`[DB] Cannot dispense ${quantityToDispense} items (must be > 0)`);
        return {
          success: false,
          message: `Cannot dispense ${quantityToDispense} items (must be > 0)`
        };
      }

      // Update the quantity in the database
      try {
        const updateResult = await withConnection(async (connection) => {
          return connection.query(
            `UPDATE TA_PRODUCT_SLOT_MAPPING 
             SET quantity = quantity - ?, last_updated = NOW() 
             WHERE product_id = CAST(? AS UNSIGNED) AND slot_id = ? AND quantity >= ?`,
            [quantityToDispense, productId, targetSlotId, quantityToDispense]
          );
        });
        
        console.log(`[DB] Update result:`, updateResult);
        
        // Verify the update was successful by checking affected rows
        if (updateResult && updateResult[0] && (updateResult[0] as any).affectedRows === 0) {
          console.error(`[DB] Update failed - no rows affected`);
          return {
            success: false,
            message: `Failed to update inventory for product ${productId} in slot ${targetSlotId}`
          };
        }
      } catch (dbError) {
        console.error(`[DB] Database update error:`, dbError);
        return {
          success: false,
          message: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
        };
      }

      console.log(`[DB] Successfully dispensed ${quantityToDispense} units from slot ${targetSlotId}`);
      return { 
        success: true,
        slotId: targetSlotId,
        quantityDispensed: quantityToDispense
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