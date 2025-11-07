const mysql = require('mysql2/promise');

// Production database configuration
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

async function testProductionConnection() {
  console.log('🔍 Testing production database connection...');
  console.log('📋 Config:', {
    host: prodConfig.host,
    port: prodConfig.port,
    database: prodConfig.database,
    user: prodConfig.user,
    password: prodConfig.password ? '***' : 'NO PASSWORD'
  });
  
  try {
    const connection = await mysql.createConnection(prodConfig);
    console.log('✅ Production database connection successful');
    
    // Test the license table
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM TA_LICENCIA');
    console.log('📊 License table count:', rows[0].count);
    
    // Test a specific license (VENDIMEDIA3)
    const [licenseRows] = await connection.execute(
      'SELECT * FROM TA_LICENCIA WHERE FS_LICENCIA = ?',
      ['VENDIMEDIA3']
    );
    
    if (licenseRows.length > 0) {
      console.log('✅ License VENDIMEDIA3 found:', licenseRows[0]);
    } else {
      console.log('❌ License VENDIMEDIA3 not found');
    }
    
    await connection.end();
    console.log('✅ Production connection test completed successfully');
  } catch (error) {
    console.error('❌ Production connection test failed:', error.message);
  }
}

testProductionConnection(); 