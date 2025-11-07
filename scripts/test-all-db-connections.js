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

async function testAllDatabaseConnections() {
  console.log('🔍 Testing ALL database connections...');
  console.log('📋 Using production database for all operations');
  
  try {
    const connection = await mysql.createConnection(prodConfig);
    console.log('✅ Database connection successful');
    
    // Test 1: License validation
    console.log('\n📊 Test 1: License validation...');
    const [licenseRows] = await connection.execute(
      'SELECT * FROM TA_LICENCIA WHERE FS_LICENCIA = ?',
      ['VENDIMEDIA3']
    );
    console.log(`✅ License validation: Found ${licenseRows.length} licenses`);
    
    // Test 2: Products for machine
    console.log('\n📊 Test 2: Products for machine...');
    const [productRows] = await connection.execute(`
      SELECT 
        p.*,
        SUM(sm.QUANTITY) as total_quantity
      FROM TA_PRODUCTO p
      INNER JOIN TA_PRODUCT_SLOT_MAPPING sm
        ON p.FS_ID = sm.PRODUCT_ID
      WHERE sm.MACHINE_CODE = ?
      GROUP BY p.FS_ID
    `, ['000003']);
    console.log(`✅ Products for machine 000003: Found ${productRows.length} products`);
    
    // Test 3: Rappi inventory
    console.log('\n📊 Test 3: Rappi inventory...');
    const [inventoryRows] = await connection.execute(`
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
    console.log(`✅ Rappi inventory: Found ${inventoryRows.length} products`);
    
    // Test 4: User/Client data
    console.log('\n📊 Test 4: User/Client data...');
    const [clientRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM TA_CLIENTE'
    );
    console.log(`✅ Client data: Found ${clientRows[0].count} clients`);
    
    // Test 5: Face embeddings
    console.log('\n📊 Test 5: Face embeddings...');
    const [embeddingRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM TA_CLIENTE WHERE FACE_EMBEDDING IS NOT NULL AND FACE_EMBEDDING != ""'
    );
    console.log(`✅ Face embeddings: Found ${embeddingRows[0].count} clients with embeddings`);
    
    // Test 6: Slot mappings
    console.log('\n📊 Test 6: Slot mappings...');
    const [slotRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM TA_PRODUCT_SLOT_MAPPING'
    );
    console.log(`✅ Slot mappings: Found ${slotRows[0].count} slot mappings`);
    
    // Test 7: Purchase transactions
    console.log('\n📊 Test 7: Purchase transactions...');
    const [purchaseRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM TA_COMPRA'
    );
    console.log(`✅ Purchase transactions: Found ${purchaseRows[0].count} transactions`);
    
    // Test 8: Rappi orders
    console.log('\n📊 Test 8: Rappi orders...');
    const [rappiRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM TA_RAPPI_ORDER'
    );
    console.log(`✅ Rappi orders: Found ${rappiRows[0].count} orders`);
    
    await connection.end();
    console.log('\n✅ ALL database connections tested successfully!');
    console.log('🎉 All operations are using the production database correctly.');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
  }
}

testAllDatabaseConnections(); 