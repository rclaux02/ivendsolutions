import { RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../database/dbConnection';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Configuration for Rappi inventory service
 */
export interface RappiInventoryConfig {
  storeId: string;
  machineCode: string;
  outputDirectory: string;
  saleType: string;
  defaultImageUrl: string;
}

/**
 * Interface for database product with slot quantities
 */
interface ProductWithStock extends RowDataPacket {
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
  id: string;
  store_id: string;
  ean: string;
  name: string;
  trademark: string;
  description: string;
  price: number;
  discount_price?: number;
  stock: number;
  sale_type: string;
  image_url: string;
}

/**
 * Rappi Inventory Service
 */
export class RappiInventoryService {
  private config: RappiInventoryConfig;

  constructor(config: RappiInventoryConfig) {
    this.config = config;
  }

  /**
   * Get current inventory from database
   */
  private async getCurrentInventory(): Promise<ProductWithStock[]> {
    return withConnection(async (connection) => {
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
   * Transform database product to Rappi format
   */
  private transformToRappiFormat(product: ProductWithStock): RappiInventoryItem {
    // Pad product ID to 12 digits with leading zeros
    const paddedId = product.FS_ID.toString().padStart(12, '0');
    
    // Calculate discount price if discount exists
    let discountPrice: number | undefined;
    if (product.FS_DSCTO && product.FS_DSCTO.trim() !== '') {
      try {
        const discountPercent = parseFloat(product.FS_DSCTO);
        if (!isNaN(discountPercent) && discountPercent > 0) {
          discountPrice = product.FN_PREC_VTA - (product.FN_PREC_VTA * (discountPercent / 100));
        }
      } catch (error) {
        console.warn(`Invalid discount format for product ${product.FS_ID}: ${product.FS_DSCTO}`);
      }
    }
    
    // Create rich description with flavor and nicotine info
    let description = product.FS_DES_PROD;
    if (product.FS_SABOR && product.FS_SABOR.trim() !== '') {
      description += ` - Sabor: ${product.FS_SABOR}`;
    }
    if (product.FS_PORCENTAJE_NICOTINA && product.FS_PORCENTAJE_NICOTINA > 0) {
      description += ` - Nicotina: ${product.FS_PORCENTAJE_NICOTINA.toFixed(2)}%`;
    }
    
    return {
      id: paddedId,
      store_id: this.config.storeId,
      ean: paddedId, // Using padded ID as EAN
      name: product.FS_DES_PROD,
      trademark: product.FS_MARCA || 'Unknown',
      description: description,
      price: product.FN_PREC_VTA,
      discount_price: discountPrice,
      stock: product.total_stock,
      sale_type: this.config.saleType,
      image_url: this.config.defaultImageUrl
    };
  }

 /**
  * // API Rappi Inventory
  */

 private async uploadToRappiAPI(records: any[]): Promise<void>  {
  const apiUrl = 'https://services.grability.rappi.com/api/cpgs-integration/datasets';
  const apiKey = 'f1851d96-64ee-4dc4-bf2b-9c442e22240f'; // API key for authentication
  const payload = {
    type: '',
    records // The records to be uploaded
  };
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api_key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload to Rappi API: ${response.status} - ${errorText}`);
  }

  console.log('[RAPPI INVENTORY] Successfully uploaded to Rappi API.');
}

  /**
   * Generate CSV content from inventory items
   */
  private generateCSVContent(items: RappiInventoryItem[]): string {
    // CSV header
    const headers = [
      'id', 'store_id', 'ean', 'name', 'trademark', 'description', 
      'price', 'discount_price', 'stock', 'sale_type', 'image_url'
    ];
    
    // Helper function to escape CSV values
    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      
      // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };
    
    // Generate CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...items.map(item => [
        escapeCSVValue(item.id),
        escapeCSVValue(item.store_id),
        escapeCSVValue(item.ean),
        escapeCSVValue(item.name),
        escapeCSVValue(item.trademark),
        escapeCSVValue(item.description),
        escapeCSVValue(item.price),
        escapeCSVValue(item.discount_price),
        escapeCSVValue(item.stock),
        escapeCSVValue(item.sale_type),
        escapeCSVValue(item.image_url)
      ].join(','))
    ];
    
    return csvRows.join('\n');
  }

  /**
   * Generate filename for inventory file
   */
  private generateFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .replace('T', '_');
    
    return `rappi_inventory_full_${this.config.machineCode}_${timestamp}.csv`;
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.config.outputDirectory);
    } catch {
      await fs.mkdir(this.config.outputDirectory, { recursive: true });
    }
  }

  /**
   * Generate inventory file
   */
  public async generateInventoryFile(): Promise<{
    success: boolean;
    filePath?: string;
    stats?: {
      totalProducts: number;
      totalStock: number;
      productsWithStock: number;
      productsOutOfStock: number;
    };
    error?: string;
  }> {
    try {
      console.log('[RAPPI INVENTORY] Starting inventory generation...');
      
      // Get current inventory
      const products = await this.getCurrentInventory();
      console.log(`[RAPPI INVENTORY] Found ${products.length} products in database`);
      
      // Transform to Rappi format
      const rappiItems = products.map(product => this.transformToRappiFormat(product));
      
      // Calculate statistics
      const stats = {
        totalProducts: rappiItems.length,
        totalStock: rappiItems.reduce((sum, item) => sum + item.stock, 0),
        productsWithStock: rappiItems.filter(item => item.stock > 0).length,
        productsOutOfStock: rappiItems.filter(item => item.stock === 0).length
      };

      // Upload to Rappi API
      await this.uploadToRappiAPI(rappiItems);
      console.log('[RAPPI INVENTORY] Uploaded inventory to Rappi API successfully.');      
      console.log('[RAPPI INVENTORY] Statistics:', stats);
      
      // Generate CSV content
      const csvContent = this.generateCSVContent(rappiItems);
      
      // Ensure output directory exists
      await this.ensureOutputDirectory();
      
      // Generate filename and full path
      const filename = this.generateFilename();
      const filePath = path.join(this.config.outputDirectory, filename);
      
      // Write file
      await fs.writeFile(filePath, csvContent, 'utf8');
      
      console.log(`[RAPPI INVENTORY] Successfully generated inventory file: ${filePath}`);
      
      return {
        success: true,
        filePath,
        stats
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY] Error generating inventory file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get inventory statistics without generating file
   */
  public async getInventoryStats(): Promise<{
    success: boolean;
    stats?: {
      totalProducts: number;
      totalStock: number;
      productsWithStock: number;
      productsOutOfStock: number;
    };
    error?: string;
  }> {
    try {
      const products = await this.getCurrentInventory();
      const rappiItems = products.map(product => this.transformToRappiFormat(product));
      
      const stats = {
        totalProducts: rappiItems.length,
        totalStock: rappiItems.reduce((sum, item) => sum + item.stock, 0),
        productsWithStock: rappiItems.filter(item => item.stock > 0).length,
        productsOutOfStock: rappiItems.filter(item => item.stock === 0).length
      };
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('[RAPPI INVENTORY] Error getting inventory stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<RappiInventoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): RappiInventoryConfig {
    return { ...this.config };
  }
}

// Default configuration
const defaultConfig: RappiInventoryConfig = {
  storeId: '59434',
  machineCode: 'MACHINE-1',
  outputDirectory: 'rappi-inventory',
  saleType: 'UNIT',
  defaultImageUrl: 'https://example.com/placeholder.jpg'
};

// Create and export singleton instance
export const rappiInventoryService = new RappiInventoryService(defaultConfig); 

