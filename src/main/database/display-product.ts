/**
 * Display the first row from the TA_PRODUCTO table
 */

import { withConnection } from './dbConnection';
import { RowDataPacket } from 'mysql2/promise';

async function displayFirstProduct(): Promise<void> {
  try {
    console.log('Connecting to database and fetching first product...');
    console.log('========================================');
    
    const [rows] = await withConnection<[RowDataPacket[], any]>(async (connection) => {
      return connection.query('SELECT * FROM TA_PRODUCTO LIMIT 1');
    });
    
    if (rows.length === 0) {
      console.log('No products found in the TA_PRODUCTO table');
      return;
    }
    
    const product = rows[0];
    console.log('FIRST PRODUCT:');
    console.log('========================================');
    
    // Display each field in the product
    Object.entries(product).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    
    console.log('========================================');
    console.log('Query completed successfully');
    
  } catch (error) {
    console.error('Error fetching product data:');
    console.error(error);
  }
}

// Execute the function
displayFirstProduct().then(() => {
  console.log('Script execution complete');
  process.exit(0);
}).catch((error) => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 