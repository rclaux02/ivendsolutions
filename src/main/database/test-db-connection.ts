/**
 * Database connection test script
 * Displays all tables in the connected database
 */

import { displayAllTables } from './dbConnection';

console.log('Testing database connection...');
console.log('Attempting to retrieve and display all tables...');

displayAllTables()
  .then(tables => {
    console.log('Database connection test completed successfully!');
    console.log(`Found ${tables.length} tables in the database.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Database connection test failed:');
    console.error(error);
    process.exit(1);
  }); 