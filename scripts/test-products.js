const mysql = require('mysql2/promise');

// Production database configuration (same as smart config)
const prodConfig = {
  host: 'entity.pe',
  port: 3306,
  database: 'entitype_RFEnterprises',
  user: 'entitype_Gerencia77',
  password: 'Elbillon123$',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
};

async function testProducts() {
  console.log('🔍 Testing product loading...');
  console.log('📋 Using production database for product queries');
  
  try {
    const connection = await mysql.createConnection(prodConfig);
    console.log('✅ Database connection successful');
    
    // Test 1: Check if products table exists
    console.log('\n📊 Test 1: Checking products table...');
    const [tables] = await connection.execute('SHOW TABLES LIKE "TA_PRODUCTO"');
    if (tables.length === 0) {
      console.log('❌ TA_PRODUCTO table not found');
      await connection.end();
      return;
    }
    console.log('✅ TA_PRODUCTO table exists');
    
    // Test 2: Check total products
    console.log('\n📊 Test 2: Counting total products...');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM TA_PRODUCTO');
    console.log(`✅ Total products in database: ${countResult[0].total}`);
    
    // Test 3: Check slot mappings table
    console.log('\n📊 Test 3: Checking slot mappings...');
    const [slotTables] = await connection.execute('SHOW TABLES LIKE "TA_PRODUCT_SLOT_MAPPING"');
    if (slotTables.length === 0) {
      console.log('❌ TA_PRODUCT_SLOT_MAPPING table not found');
      await connection.end();
      return;
    }
    console.log('✅ TA_PRODUCT_SLOT_MAPPING table exists');
    
    // Test 4: Check products for machine 000003
    console.log('\n📊 Test 4: Getting products for machine 000003...');
    const [products] = await connection.execute(`
      SELECT 
        p.*,
        SUM(sm.QUANTITY) as total_quantity
      FROM TA_PRODUCTO p
      INNER JOIN TA_PRODUCT_SLOT_MAPPING sm
        ON p.FS_ID = sm.PRODUCT_ID
      WHERE sm.MACHINE_CODE = ?
      GROUP BY p.FS_ID
    `, ['000003']);
    
    console.log(`✅ Found ${products.length} products for machine 000003`);
    
    if (products.length > 0) {
      console.log('\n📋 Sample products:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.FS_DES_PROD} (SKU: ${product.FS_SKU}) - Price: $${product.FN_PREC_VTA} - Stock: ${product.total_quantity}`);
      });
    }
    
    // Test 5: Check slot mappings for machine 000003
    console.log('\n📊 Test 5: Checking slot mappings for machine 000003...');
    const [slotMappings] = await connection.execute(`
      SELECT DISTINCT slot_id, COUNT(*) as product_count, SUM(quantity) as total_quantity
      FROM TA_PRODUCT_SLOT_MAPPING 
      WHERE MACHINE_CODE = ?
      GROUP BY slot_id
    `, ['000003']);
    
    console.log(`✅ Found ${slotMappings.length} slots with products for machine 000003`);
    
    if (slotMappings.length > 0) {
      console.log('\n📋 Slot summary:');
      slotMappings.forEach((slot, index) => {
        console.log(`Slot ${slot.slot_id}: ${slot.product_count} products, ${slot.total_quantity} total units`);
      });
    }
    
    await connection.end();
    console.log('\n✅ Product testing completed successfully');
  } catch (error) {
    console.error('❌ Product testing failed:', error.message);
  }
}

testProducts(); 