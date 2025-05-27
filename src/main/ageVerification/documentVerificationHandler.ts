import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { Client } from 'basic-ftp';
import mysql from 'mysql2/promise';

/**
 * Register all IPC handlers for document verification
 */
export function registerDocumentVerificationHandlers(): void {
  // Handler for database uploads
  ipcMain.handle('upload-to-database', async (event, data) => {
    try {
      await uploadToDatabase(data);
      return { success: true };
    } catch (error: unknown) {
      console.error('Error in upload-to-database handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });

  // Handler for FTP uploads
  ipcMain.handle('upload-to-ftp', async (event, data) => {
    try {
      const newFileName = await uploadToFtp(
        data.filePath,
        data.ftpServer,
        data.username,
        data.password
      );
      return { success: true, fileName: newFileName };
    } catch (error: unknown) {
      console.error('Error in upload-to-ftp handler:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
}

/**
 * Upload data to MySQL database
 */
async function uploadToDatabase(data: any): Promise<void> {
  // Database connection configuration
  const dbConfig = {
    host: process.env.DEV_DB_HOST || 'your-db-host',
    port: parseInt(process.env.DEV_DB_PORT || '3306', 10),
    database: process.env.DEV_DB_NAME || 'your-database',
    user: process.env.DEV_DB_USER || 'your-username',
    password: process.env.DEV_DB_PASSWORD || 'your-password'
  };

  // Create connection
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Read photo files as binary data
    const photoBytes = fs.readFileSync(data.photoPath);
    const cameraPhotoBytes = fs.readFileSync(data.cameraPhotoPath);
    // SQL query for inserting data
    const query = `
      INSERT INTO TA_CLI_VAPES (
        FS_EMP, FS_SEDE, FS_LOCAL, FN_COD_CLI, FS_DNI, FS_NOM, 
        FS_APE_PA, FS_APE_MA, FS_SEXO, FS_EDAD, FS_EMAIL, 
        FS_TEL, FD_FEC_ULT_USO, FS_NOM_PROD_FREC, FD_FEC_ULT_COMP, 
        FS_PROD_ULT_COMP, FS_NOM_USU_CRE, FD_FEC_CRE, FD_FEC_MOD, 
        FX_FOTO, FX_FOTO2
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, 
        ?, ?, ?, ?, 
        ?, ?
      )
    `;

    // Parameters for the query
    const params = [
      'RFEnterprises',  // FS_EMP
      '001',                 // FS_SEDE
      '001',                 // FS_LOCAL
      data.dni,              // FN_COD_CLI
      data.dni,              // FS_DNI
      data.nombres,          // FS_NOM
      data.apellidoPaterno,  // FS_APE_PA
      data.apellidoMaterno,  // FS_APE_MA
      'M',                   // FS_SEXO (default)
      data.edad,             // FS_EDAD
      'ejemplo@correo.com',  // FS_EMAIL (default)
      '123456789',           // FS_TEL (default)
      new Date(),            // FD_FEC_ULT_USO
      '000',                 // FS_NOM_PROD_FREC (default)
      new Date(),            // FD_FEC_ULT_COMP
      '000',                 // FS_PROD_ULT_COMP (default)
      'Admin',               // FS_NOM_USU_CRE (default)
      new Date(),            // FD_FEC_CRE
      new Date(),            // FD_FEC_MOD
      photoBytes,            // FX_FOTO
      cameraPhotoBytes       // FX_FOTO2
    ];

    // Execute the query
    await connection.execute(query, params);
  } finally {
    // Close the connection
    await connection.end();
  }
}

/**
 * Upload file to FTP server
 */
async function uploadToFtp(
  filePath: string,
  ftpServer: string,
  username: string,
  password: string
): Promise<string> {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const client = new Client();
  let newFileName = '';

  try {
    // Connect to FTP server
    await client.access({
      host: ftpServer.replace('ftp://', '').split('/')[0],
      user: username,
      password: password,
      secure: false
    });

    // Get directory path from FTP server URL
    const ftpPath = '/' + ftpServer.split('/').slice(3).join('/');
    await client.cd(ftpPath);

    // Get list of files to determine next file number
    const fileList = await client.list();
    let maxNumber = 0;

    for (const file of fileList) {
      const match = file.name.match(/photo(\d+)/);
      if (match && match[1]) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }

    // Generate new file name
    newFileName = `photo${maxNumber + 1}.jpg`;

    // Upload the file
    await client.uploadFrom(filePath, newFileName);

    return newFileName;
  } finally {
    client.close();
  }
} 