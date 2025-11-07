import { createConnectionPool } from '../database/dbConnection';
import { getSmartDbConfig } from '../database/dbConfig';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';

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
 * Interface for products with stock information
 */
export interface ProductWithStock extends RowDataPacket {
  FS_ID: number;
  FS_SKU: string;
  FS_DES_PROD: string;
  FS_MARCA: string;
  FN_PREC_VTA: number;
  FS_DSCTO: string;
  FS_SABOR: string;
  FS_PORCENTAJE_NICOTINA: number;
  FX_IMG: Buffer;
  total_stock: number;
}

/**
 * Interface for Rappi inventory item
 */
export interface RappiInventoryItem {
  product_id: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  flavor?: string;
  nicotine_percentage?: number;
  discount?: string;
  image_url?: string;
}

/**
 * Service for managing Rappi inventory operations
 */
export class RappiInventoryService {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  /**
   * Get current inventory from database
   */
  private async getCurrentInventory(): Promise<ProductWithStock[]> {
    return withSmartConnection(async (connection) => {
      const [rows] = await connection.execute<ProductWithStock[]>(`
        SELECT 
          p.FS_ID,
          p.FS_SKU,
          p.FS_DES_PROD,
          p.FS_MARCA,
          p.FN_PREC_VTA,
          p.FS_DSCTO,
          p.FS_SABOR,
          p.FS_PORCENTAJE_NICOTINA,
          p.FX_IMG,
          COALESCE(SUM(psm.quantity), 0) as total_stock
        FROM TA_PRODUCTO p
        LEFT JOIN TA_PRODUCT_SLOT_MAPPING psm ON p.FS_ID = psm.product_id
        WHERE 1=1
        GROUP BY p.FS_ID, p.FS_SKU, p.FS_DES_PROD, p.FS_MARCA, p.FN_PREC_VTA, 
                 p.FS_DSCTO, p.FS_SABOR, p.FS_PORCENTAJE_NICOTINA, p.FX_IMG
        ORDER BY p.FS_DES_PROD
      `);
      
      return rows;
    });
  }

  /**
   * Convert database products to Rappi inventory format
   */
  private convertToRappiFormat(products: ProductWithStock[]): RappiInventoryItem[] {
    return products.map(product => {
      // Convert image buffer to base64 URL if available
      let imageUrl: string | undefined;
      if (product.FX_IMG) {
        try {
          const base64Image = Buffer.from(product.FX_IMG).toString('base64');
          imageUrl = `data:image/jpeg;base64,${base64Image}`;
        } catch (err) {
          console.error('Error converting image buffer to base64:', err);
        }
      }

      return {
        product_id: product.FS_ID.toString(),
        name: product.FS_DES_PROD,
        brand: product.FS_MARCA || 'Unknown',
        price: product.FN_PREC_VTA,
        stock: product.total_stock,
        flavor: product.FS_SABOR,
        nicotine_percentage: product.FS_PORCENTAJE_NICOTINA,
        discount: product.FS_DSCTO,
        image_url: imageUrl
      };
    });
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(): Promise<RappiInventoryItem[]> {
    try {
      console.log('[RappiInventory] Generating inventory report...');
      
      const products = await this.getCurrentInventory();
      const rappiInventory = this.convertToRappiFormat(products);
      
      console.log(`[RappiInventory] Generated inventory with ${rappiInventory.length} products`);
      
      return rappiInventory;
    } catch (error) {
      console.error('[RappiInventory] Error generating inventory report:', error);
      throw error;
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<{
    totalProducts: number;
    totalStock: number;
    productsWithStock: number;
    averagePrice: number;
  }> {
    try {
      const products = await this.getCurrentInventory();
      
      const totalProducts = products.length;
      const totalStock = products.reduce((sum, p) => sum + p.total_stock, 0);
      const productsWithStock = products.filter(p => p.total_stock > 0).length;
      const averagePrice = products.length > 0 
        ? products.reduce((sum, p) => sum + p.FN_PREC_VTA, 0) / products.length 
        : 0;
      
      return {
        totalProducts,
        totalStock,
        productsWithStock,
        averagePrice: Math.round(averagePrice * 100) / 100
      };
    } catch (error) {
      console.error('[RappiInventory] Error getting inventory stats:', error);
      throw error;
    }
  }
}

// Default configuration
const defaultConfig: any = {
  storeId: '59434',
  machineCode: 'MACHINE-1',
  outputDirectory: 'rappi-inventory',
  saleType: 'UNIT',
  defaultImageUrl: 'https://example.com/placeholder.jpg'
};

// Create and export singleton instance
export const rappiInventoryService = new RappiInventoryService(defaultConfig); 

