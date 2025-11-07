import { withConnection } from '../dbConnection';
import { dbConfig } from '../dbConfig';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📋 Config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password ? '***' : 'NO PASSWORD'
    });
    
    await withConnection(async (connection) => {
      const [rows] = await connection.execute('SELECT 1 as test');
      console.log('✅ Database connection successful');
      console.log('📊 Test query result:', rows);
    });
    
    console.log('✅ Connection test completed successfully');
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

// If this file is run directly
if (require.main === module) {
  testConnection()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
} 