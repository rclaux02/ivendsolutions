import { createConnectionPool } from '../dbConnection';
import { getSmartDbConfig } from '../dbConfig';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';

export interface LicenseRecord extends RowDataPacket {
  FS_ID: number;
  FS_LICENCIA: string;
  FS_COD_MAQ: string;
  FN_NUM_LIC: number;
}

/**
 * Custom transaction function that uses smart database configuration
 */
async function withSmartTransaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const smartConfig = getSmartDbConfig();
  const pool = createConnectionPool(smartConfig);
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
    pool.end();
  }
}

/**
 * Valida una licencia y actualiza FN_NUM_LIC a 1 si es válida.
 * @param license Código de licencia a validar
 * @returns {Promise<{ success: boolean; code?: string; error?: string }>} 
 */
export async function validateAndActivateLicense(license: string): Promise<{ success: boolean; code?: string; error?: string }> {
  return withSmartTransaction(async (connection) => {
    // Buscar la licencia
    const [rows] = await connection.query<LicenseRecord[]>(
      'SELECT * FROM TA_LICENCIA WHERE FS_LICENCIA = ?',
      [license]
    );
    if (!rows || rows.length === 0) {
      return { success: false, error: 'Licencia no encontrada' };
    }
    const record = rows[0];
    // Si ya está activada, igual devolvemos el código
    if (record.FN_NUM_LIC === 1) {
      return { success: false, error: 'Esta licencia ya ha sido registrada y activada.' };
    }
    // Actualizar FN_NUM_LIC a 1
    const [result] = await connection.query(
      'UPDATE TA_LICENCIA SET FN_NUM_LIC = 1 WHERE FS_ID = ?',
      [record.FS_ID]
    );
    if ((result as any).affectedRows === 1) {
      return { success: true, code: record.FS_COD_MAQ };
    } else {
      return { success: false, error: 'No se pudo actualizar la licencia' };
    }
  });
} 