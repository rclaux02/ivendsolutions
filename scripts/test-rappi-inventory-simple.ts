#!/usr/bin/env ts-node

import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

// Database configuration - adjust these values to match your setup
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: process.env.DEV_DB_PASSWORD || 'Asdf1234!',
  database: process.env.DEV_DB_NAME || 'vapebox',
  port: parseInt(process.env.DEV_DB_PORT || '3306', 10),
};



// Rappi configuration
const RAPPI_CONFIG = {
  storeId: '59434',
  machineCode: 'TEST-MACHINE-1',
  outputDirectory: 'test-rappi-inventory',
  saleType: 'UNIT',
  defaultImageUrl: 'https://example.com/placeholder.jpg'
};

interface ProductWithStock {
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

interface RappiInventoryItem {
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
 * Get current inventory from database
 */
async function getCurrentInventory(): Promise<ProductWithStock[]> {
  const connection = await mysql.createConnection(DB_CONFIG);
  
  try {
    const query = `
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
    `;
    
    const [rows] = await connection.execute(query);
    return rows as ProductWithStock[];
  } finally {
    await connection.end();
  }
}

/**
 * Transform product to Rappi format
 */
function transformToRappiFormat(product: ProductWithStock): RappiInventoryItem {
  // Parse discount percentage
  let discountPercent = 0;
  if (product.FS_DSCTO && product.FS_DSCTO.trim() !== '') {
    const parsed = parseFloat(product.FS_DSCTO);
    if (!isNaN(parsed)) {
      discountPercent = parsed;
    }
  }

  // Calculate discounted price if discount exists
  const basePrice = Number(product.FN_PREC_VTA) || 0;
  const discountedPrice = discountPercent > 0 
    ? basePrice - (basePrice * (discountPercent / 100))
    : undefined;

  // Create description with flavor and nicotine info
  let description = product.FS_DES_PROD || '';
  if (product.FS_SABOR && product.FS_SABOR.trim() !== '') {
    description += ` - Sabor: ${product.FS_SABOR}`;
  }
  if (product.FS_PORCENTAJE_NICOTINA && product.FS_PORCENTAJE_NICOTINA > 0) {
    description += ` - Nicotina: ${product.FS_PORCENTAJE_NICOTINA}%`;
  }

  return {
    id: product.FS_SKU || String(product.FS_ID),
    store_id: RAPPI_CONFIG.storeId,
    ean: product.FS_SKU || String(product.FS_ID),
    name: product.FS_DES_PROD || 'Producto sin nombre',
    trademark: product.FS_MARCA || 'Sin marca',
    description: description,
    price: basePrice,
    discount_price: discountedPrice,
    stock: Number(product.total_stock) || 0,
    sale_type: RAPPI_CONFIG.saleType,
    image_url: RAPPI_CONFIG.defaultImageUrl
  };
}

/**
 * Generate CSV content
 */
function generateCSVContent(items: RappiInventoryItem[]): string {
  // CSV headers according to Rappi documentation
  const headers = [
    'id',
    'store_id', 
    'ean',
    'name',
    'trademark',
    'description',
    'price',
    'discount_price',
    'stock',
    'sale_type',
    'image_url'
  ];

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

  // Create CSV content
  const csvLines: string[] = [];
  
  // Add header row
  csvLines.push(headers.join(','));
  
  // Add data rows
  items.forEach(item => {
    const row = headers.map(header => {
      const value = item[header as keyof RappiInventoryItem];
      return escapeCSVValue(value);
    });
    csvLines.push(row.join(','));
  });

  return csvLines.join('\n');
}

/**
 * Generate filename with timestamp
 */
function generateFilename(): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\./g, '-')
    .replace('T', '_')
    .slice(0, 19);
  
  return `rappi_inventory_full_${RAPPI_CONFIG.machineCode}_${timestamp}.csv`;
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDirectory(): Promise<void> {
  const outputPath = path.resolve(RAPPI_CONFIG.outputDirectory);
  
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(`📁 Created output directory: ${outputPath}`);
  }
}

/**
 * Main test function
 */
async function testRappiInventoryGeneration() {
  console.log('🚀 Starting Rappi Inventory Test Script...\n');

  try {
    console.log('📊 Configuration:');
    console.log(`- Database: ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
    console.log(`- Store ID: ${RAPPI_CONFIG.storeId}`);
    console.log(`- Machine Code: ${RAPPI_CONFIG.machineCode}`);
    console.log(`- Output Directory: ${RAPPI_CONFIG.outputDirectory}/`);
    console.log(`- Sale Type: ${RAPPI_CONFIG.saleType}\n`);

    // Test database connection
    console.log('🔌 Testing database connection...');
    const testConnection = await mysql.createConnection(DB_CONFIG);
    await testConnection.ping();
    await testConnection.end();
    console.log('✅ Database connection successful\n');

    // Get inventory data
    console.log('📦 Fetching inventory data...');
    const products = await getCurrentInventory();
    console.log(`📊 Found ${products.length} products in database\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found in database. Make sure TA_PRODUCTO table has data.');
      return;
    }

    // Transform to Rappi format
    console.log('🔄 Transforming data to Rappi format...');
    const rappiItems = products.map(transformToRappiFormat);
    
    // Calculate statistics
    const totalStock = rappiItems.reduce((sum, item) => sum + item.stock, 0);
    const productsWithStock = rappiItems.filter(item => item.stock > 0).length;
    const productsOutOfStock = rappiItems.filter(item => item.stock === 0).length;

    console.log('📈 Statistics:');
    console.log(`- Total products: ${rappiItems.length}`);
    console.log(`- Total stock: ${totalStock}`);
    console.log(`- Products with stock: ${productsWithStock}`);
    console.log(`- Products out of stock: ${productsOutOfStock}\n`);

    // Generate CSV content
    console.log('📝 Generating CSV content...');
    const csvContent = generateCSVContent(rappiItems);

    // Ensure output directory exists
    await ensureOutputDirectory();

    // Write file
    const filename = generateFilename();
    const filePath = path.join(RAPPI_CONFIG.outputDirectory, filename);
    
    fs.writeFileSync(filePath, csvContent, 'utf-8');
    
    console.log('✅ Success! Inventory file generated:');
    console.log(`📁 File path: ${path.resolve(filePath)}`);
    
    // File statistics
    const fileStats = fs.statSync(filePath);
    console.log(`📏 File size: ${fileStats.size} bytes`);
    console.log(`🕒 Created: ${fileStats.birthtime.toISOString()}`);
    
    // Show sample content
    const lines = csvContent.split('\n');
    console.log('\n📋 Sample content (first 5 lines):');
    console.log('─'.repeat(100));
    lines.slice(0, 5).forEach((line, index) => {
      console.log(`${index + 1}: ${line}`);
    });
    console.log('─'.repeat(100));
    
    if (lines.length > 5) {
      console.log(`... and ${lines.length - 5} more lines`);
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 You can now:');
    console.log('1. Check the generated CSV file in the test-rappi-inventory/ directory');
    console.log('2. Upload it manually to Rappi servers via FileZilla');
    console.log('3. Verify the format matches Rappi\'s requirements');

  } catch (error) {
    console.error('❌ Error during test:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Database connection failed. Please check:');
        console.error('- MySQL server is running');
        console.error('- Database credentials are correct');
        console.error('- Database name exists');
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testRappiInventoryGeneration()
  .then(() => {
    console.log('\n✨ Test script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  }); 