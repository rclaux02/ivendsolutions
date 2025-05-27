import { withTransaction } from '../dbConnection';
import { RowDataPacket } from 'mysql2/promise';

/**
 * Interface representing a client record from TA_CLI_VAPES
 */
export interface ClientRecord extends RowDataPacket {
  FS_ID: number;
  FS_NOM: string;
  FS_APE_PA: string;
  FS_APE_MA: string;
  FS_DNI: string;
  FS_TEL: string;
  FS_EMAIL: string;
  FS_EDAD: number;
  FS_SEXO: string;
  FS_EMP: string;
  FS_SEDE: string;
  FS_LOCAL: string;
  FD_FEC_CRE: Date;
  FD_FEC_MOD: Date;
}

/**
 * Get a client by their ID
 * @param clientId The client ID
 * @returns The client record if found, null otherwise
 */
export async function getClientById(clientId: number | string): Promise<ClientRecord | null> {
  return withTransaction(async (connection) => {
    const [clients] = await connection.execute<ClientRecord[]>(
      'SELECT * FROM TA_CLI_VAPES WHERE FS_ID = ?',
      [clientId]
    );

    return clients[0] || null;
  });
}

/**
 * Get a client by their identification number (DNI)
 * @param dni The client's identification number
 * @returns The client record if found, null otherwise
 */
export async function getClientByDni(dni: string): Promise<ClientRecord | null> {
  return withTransaction(async (connection) => {
    const [clients] = await connection.execute<ClientRecord[]>(
      'SELECT * FROM TA_CLI_VAPES WHERE FS_DNI = ?',
      [dni]
    );

    return clients[0] || null;
  });
}

/**
 * Search for clients by name or phone
 * @param searchTerm The search term (name or phone)
 * @returns Array of matching client records
 */
export async function searchClients(searchTerm: string): Promise<ClientRecord[]> {
  return withTransaction(async (connection) => {
    const [clients] = await connection.execute<ClientRecord[]>(
      `SELECT * FROM TA_CLI_VAPES 
       WHERE FS_NOM LIKE ? 
          OR FS_APE_PA LIKE ? 
          OR FS_APE_MA LIKE ?
          OR FS_TEL LIKE ?
       LIMIT 50`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );

    return clients;
  });
}

/**
 * Update client information
 * @param clientId The client ID
 * @param clientData The data to update
 * @returns True if successful, false otherwise
 */
export async function updateClient(
  clientId: number | string,
  clientData: Partial<Omit<ClientRecord, 'FS_ID' | 'FD_FEC_CRE' | 'FD_FEC_MOD'>>
): Promise<boolean> {
  return withTransaction(async (connection) => {
    // Build SET clause and parameters dynamically
    const setClauses: string[] = [];
    const params: any[] = [];

    Object.entries(clientData).forEach(([key, value]) => {
      if (value !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    });

    // Add update timestamp and client ID
    setClauses.push('FD_FEC_MOD = NOW()');
    params.push(clientId);

    if (setClauses.length === 1) {
      return false; // No fields to update
    }

    const query = `
      UPDATE TA_CLI_VAPES 
      SET ${setClauses.join(', ')} 
      WHERE FS_ID = ?
    `;

    const [result] = await connection.execute(query, params);
    
    return (result as any).affectedRows > 0;
  });
}

/**
 * Interface for data needed to create a new client
 */
export interface NewClientData {
  FS_NOM: string;
  FS_APE_PA: string;
  FS_APE_MA: string;
  FS_DNI: string;
  FS_TEL: string;
  FS_EMAIL: string;
  FS_EDAD: number;
  FS_SEXO: string;
  FS_EMP: string;
  FS_SEDE: string;
  FS_LOCAL: string;
  FX_FOTO: string | null;
  FX_FOTO2: string | null;
  FACE_EMBEDDING?: any;
}

/**
 * Create a new client record in TA_CLI_VAPES
 * @param clientData The data for the new client
 * @returns The ID of the newly created client, or null if failed
 */
export async function createClient(clientData: NewClientData): Promise<number | null> {
  return withTransaction(async (connection) => {
    const query = `
      INSERT INTO TA_CLI_VAPES (
        FS_NOM,
        FS_APE_PA,
        FS_APE_MA,
        FS_DNI,
        FS_TEL,
        FS_EMAIL,
        FS_EDAD,
        FS_SEXO,
        FS_EMP,
        FS_SEDE,
        FS_LOCAL,
        FACE_EMBEDDING,
        FX_FOTO,
        FX_FOTO2,
        FD_FEC_CRE,
        FD_FEC_MOD
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
      clientData.FS_NOM,
      clientData.FS_APE_PA,
      clientData.FS_APE_MA || '',
      clientData.FS_DNI,
      clientData.FS_TEL || '',
      clientData.FS_EMAIL || '',
      clientData.FS_EDAD,
      clientData.FS_SEXO || '',
      clientData.FS_EMP || 'RFEnterprises',
      clientData.FS_SEDE || '001',
      clientData.FS_LOCAL || '001',
      clientData.FACE_EMBEDDING || null,
      clientData.FX_FOTO || null,
      clientData.FX_FOTO2 || null
    ];

    const [result] = await connection.execute(query, params);
    
    if ((result as any).insertId) {
      return (result as any).insertId;
    }
    return null;
  });
}

/**
 * Fetches clients that have an FX_FOTO but no FACE_EMBEDDING.
 * @returns Array of client records needing embedding processing.
 */
export async function getClientsNeedingEmbeddingProcessing(): Promise<ClientRecord[]> {
  return withTransaction(async (connection) => {
    const [clients] = await connection.execute<ClientRecord[]>(
      "SELECT * FROM TA_CLI_VAPES WHERE FX_FOTO IS NOT NULL AND (FACE_EMBEDDING IS NULL OR FACE_EMBEDDING = '')"
    );
    return clients;
  });
} 