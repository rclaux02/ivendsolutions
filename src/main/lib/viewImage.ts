import { BrowserWindow } from 'electron';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

// Database connection configuration - uses environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'your_db_host',       // Fallback if not set
  user: process.env.DB_USER || 'your_db_user',       // Fallback if not set
  password: process.env.DB_PASSWORD || 'your_db_password', // Fallback if not set
  database: process.env.DB_NAME || 'your_db_name',     // Fallback if not set
};

interface VapeImageRecord {
  FX_FOTO: Buffer | null;
}

/**
 * Fetches an image BLOB from the TA_CLI_VAPES table by its ID and displays it in a new window.
 * @param recordId The ID of the record to fetch the image from.
 *                 This assumes you have an identifier column like 'id' in your table.
 *                 Adjust the query if your identifier column is named differently.
 */
export async function displayImageFromBlob(recordId: string | number): Promise<void> {
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Adjust the query if your primary key column is not named 'id'
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      'SELECT FX_FOTO FROM TA_CLI_VAPES WHERE id = ?', // Replace 'id' if your PK is different
      [recordId]
    );

    if (rows.length === 0) {
      console.error(`No record found with ID: ${recordId}`);
      return;
    }

    const record = rows[0] as VapeImageRecord;
    const imageBuffer = record.FX_FOTO;

    if (!imageBuffer) {
      console.error(`FX_FOTO is null or empty for ID: ${recordId}`);
      return;
    }

    const downloadsPath = 'C:\\Users\\stefa\\Downloads';
    // Assuming JPEG format. Change extension if your images are in a different format.
    const fileName = `vape_image_${recordId}.jpg`;
    const filePath = path.join(downloadsPath, fileName);

    try {
      await fs.mkdir(downloadsPath, { recursive: true }); // Ensure directory exists
      await fs.writeFile(filePath, imageBuffer);
      console.log(`Image for ID ${recordId} saved successfully to: ${filePath}`);
    } catch (saveError) {
      console.error(`Failed to save image for ID ${recordId} to ${filePath}:`, saveError);
      // Optionally, you could use Electron's dialog here if this function is always called from main process
      // import { dialog } from 'electron';
      // dialog.showErrorBox('Save Error', `Failed to save image. Check console for details: ${saveError.message}`);
      return; // Stop execution if saving failed
    }

  } catch (error) {
    console.error('Error displaying image from BLOB:', error);
    // Optionally, show an error message to the user
    // import { dialog } from 'electron'; // ensure dialog is imported if used here
    // dialog.showErrorBox('Database Error', 'Failed to retrieve or display image. Check console for details.');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Example of how you might call this function (e.g., for testing)
// You would typically call this based on some user action or event.
// (async () => {
//   // Make sure Electron app is ready before creating BrowserWindows
//   const { app } = require('electron'); // Use require for conditional import if needed
//   await app.whenReady();
//   await displayImageFromBlob(1); // Replace 1 with an actual ID from your database
// })(); 