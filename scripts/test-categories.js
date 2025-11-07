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

async function testCategories() {
  console.log('🔍 Testing categories from FS_DES_PROD_CONT...');
  console.log('📋 Using production database for category queries');
  
  try {
    const connection = await mysql.createConnection(prodConfig);
    console.log('✅ Database connection successful');
    
    // Test 1: Check if TA_PRODUCTO table exists
    console.log('\n📊 Test 1: Checking TA_PRODUCTO table...');
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
    
    // Test 3: Check FS_DES_PROD_CONT field
    console.log('\n📊 Test 3: Checking FS_DES_PROD_CONT field...');
    const [fieldResult] = await connection.execute('SHOW COLUMNS FROM TA_PRODUCTO LIKE "FS_DES_PROD_CONT"');
    if (fieldResult.length === 0) {
      console.log('❌ FS_DES_PROD_CONT field not found');
      await connection.end();
      return;
    }
    console.log('✅ FS_DES_PROD_CONT field exists');
    console.log('📋 Field details:', fieldResult[0]);
    
    // Test 4: Check distinct values in FS_DES_PROD_CONT
    console.log('\n📊 Test 4: Getting distinct values from FS_DES_PROD_CONT...');
    const [categoriesResult] = await connection.execute(`
      SELECT DISTINCT FS_DES_PROD_CONT 
      FROM TA_PRODUCTO 
      WHERE FS_DES_PROD_CONT IS NOT NULL 
      AND FS_DES_PROD_CONT != "" 
      ORDER BY FS_DES_PROD_CONT
    `);
    
    console.log(`✅ Found ${categoriesResult.length} distinct categories`);
    
    if (categoriesResult.length > 0) {
      console.log('\n📋 All categories found:');
      categoriesResult.forEach((row, index) => {
        console.log(`${index + 1}. "${row.FS_DES_PROD_CONT}"`);
      });
    } else {
      console.log('⚠️ No categories found - field might be empty or null');
    }
    
    // Test 5: Check sample products with FS_DES_PROD_CONT
    console.log('\n📊 Test 5: Sample products with FS_DES_PROD_CONT...');
    const [sampleProducts] = await connection.execute(`
      SELECT FS_ID, FS_DES_PROD, FS_DES_PROD_CONT, FS_DES_PROD_DETA
      FROM TA_PRODUCTO 
      WHERE FS_DES_PROD_CONT IS NOT NULL 
      AND FS_DES_PROD_CONT != ""
      LIMIT 5
    `);
    
    console.log(`✅ Found ${sampleProducts.length} sample products with categories`);
    
    if (sampleProducts.length > 0) {
      console.log('\n📋 Sample products:');
      sampleProducts.forEach((product, index) => {
        console.log(`${index + 1}. ID: ${product.FS_ID}`);
        console.log(`   Name: ${product.FS_DES_PROD}`);
        console.log(`   Category: "${product.FS_DES_PROD_CONT}"`);
        console.log(`   Description: ${product.FS_DES_PROD_DETA || 'N/A'}`);
        console.log('');
      });
    }
    
    await connection.end();
    console.log('\n✅ Category testing completed successfully');
  } catch (error) {
    console.error('❌ Category testing failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCategories(); 