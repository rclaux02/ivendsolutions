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

async function testLicenseValidation() {
  console.log('🔍 Testing license validation...');
  console.log('📋 Using production database for license validation');
  
  try {
    const connection = await mysql.createConnection(prodConfig);
    console.log('✅ Database connection successful');
    
    // Test license validation logic
    const license = 'VENDIMEDIA3';
    console.log(`🔑 Testing license: ${license}`);
    
    // Step 1: Check if license exists
    const [rows] = await connection.execute(
      'SELECT * FROM TA_LICENCIA WHERE FS_LICENCIA = ?',
      [license]
    );
    
    if (rows.length === 0) {
      console.log('❌ License not found');
      await connection.end();
      return;
    }
    
    const record = rows[0];
    console.log('✅ License found:', {
      FS_ID: record.FS_ID,
      FS_LICENCIA: record.FS_LICENCIA,
      FS_COD_MAQ: record.FS_COD_MAQ,
      FN_NUM_LIC: record.FN_NUM_LIC
    });
    
    // Step 2: Check if already activated
    if (record.FN_NUM_LIC === 1) {
      console.log('❌ License already activated');
      await connection.end();
      return;
    }
    
    // Step 3: Activate the license
    console.log('🔄 Activating license...');
    const [result] = await connection.execute(
      'UPDATE TA_LICENCIA SET FN_NUM_LIC = 1 WHERE FS_ID = ?',
      [record.FS_ID]
    );
    
    if (result.affectedRows === 1) {
      console.log('✅ License activated successfully!');
      console.log(`📋 Machine code: ${record.FS_COD_MAQ}`);
    } else {
      console.log('❌ Failed to activate license');
    }
    
    await connection.end();
    console.log('✅ License validation test completed');
  } catch (error) {
    console.error('❌ License validation test failed:', error.message);
  }
}

testLicenseValidation(); 