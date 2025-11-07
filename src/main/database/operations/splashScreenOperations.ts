import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { withTransaction } from '../dbConnection';

export interface SplashScreenData extends RowDataPacket {
  FS_ID: number;
  FS_RUTA: string;
  FD_FEC_INICIO: Date;
  FD_FEC_FINAL: Date;
  FS_TIPO: 'image' | 'video';
  FS_FORMATO: string;
  FS_COD_MAQ: string;
  FS_SEDE: string;
  FS_LOCAL: string;
  FS_EMP: string;
  FS_ESTADO: 'activo' | 'inactivo';
  FS_NOMBRE: string;
  FS_ORDEN: number;
  FD_FEC_CRE: Date;
  FD_FEC_MOD: Date;
}

export interface NewSplashScreenData {
  FS_RUTA: string;
  FD_FEC_INICIO: Date;
  FD_FEC_FINAL: Date;
  FS_TIPO: 'image' | 'video';
  FS_FORMATO: string;
  FS_COD_MAQ: string;
  FS_SEDE: string;
  FS_LOCAL: string;
  FS_EMP: string;
  FS_ESTADO?: 'activo' | 'inactivo';
  FS_NOMBRE: string;
  FS_ORDEN?: number;
}

/**
 * Get active splash screens for a specific machine
 */
export async function getActiveSplashScreens(
  machineCode: string,
  sede: string,
  local: string
): Promise<SplashScreenData[]> {
  return withTransaction(async (connection) => {
    console.log('[SplashScreenOperations] Querying splash screens for:', { machineCode, sede, local });
    
    const query = `
      SELECT * FROM TA_SPLASH_SCREENS 
      WHERE FS_COD_MAQ = ? 
        AND FS_SEDE = ? 
        AND FS_LOCAL = ? 
        AND FS_ESTADO = 'activo'
      ORDER BY FS_ORDEN ASC, FD_FEC_CRE ASC
    `;
    
    const [rows] = await connection.execute(query, [
      machineCode,
      sede,
      local
    ]) as [SplashScreenData[], any];
    
    console.log('[SplashScreenOperations] Query returned:', rows.length, 'rows');
    console.log('[SplashScreenOperations] Rows data:', rows);
    
    return rows;
  });
}

/**
 * Create a new splash screen record
 */
export async function createSplashScreen(
  data: NewSplashScreenData
): Promise<number | null> {
  return withTransaction(async (connection) => {
    const query = `
      INSERT INTO TA_SPLASH_SCREENS (
        FS_RUTA, FD_FEC_INICIO, FD_FEC_FINAL, FS_TIPO, FS_FORMATO,
        FS_COD_MAQ, FS_SEDE, FS_LOCAL, FS_EMP, FS_ESTADO, FS_NOMBRE, FS_ORDEN
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.FS_RUTA,
      data.FD_FEC_INICIO,
      data.FD_FEC_FINAL,
      data.FS_TIPO,
      data.FS_FORMATO,
      data.FS_COD_MAQ,
      data.FS_SEDE,
      data.FS_LOCAL,
      data.FS_EMP,
      data.FS_ESTADO || 'activo',
      data.FS_NOMBRE,
      data.FS_ORDEN || 0
    ];
    
    const [result] = await connection.execute(query, params);
    
    if ((result as any).insertId) {
      return (result as any).insertId;
    }
    return null;
  });
}

/**
 * Update splash screen status
 */
export async function updateSplashScreenStatus(
  id: number,
  status: 'activo' | 'inactivo'
): Promise<boolean> {
  return withTransaction(async (connection) => {
    const query = `
      UPDATE TA_SPLASH_SCREENS 
      SET FS_ESTADO = ?, FD_FEC_MOD = NOW() 
      WHERE FS_ID = ?
    `;
    
    const [result] = await connection.execute(query, [status, id]);
    return (result as any).affectedRows > 0;
  });
}

/**
 * Get splash screens newer than a specific date
 */
export async function getNewSplashScreens(
  machineCode: string,
  sede: string,
  local: string,
  lastSyncDate?: Date
): Promise<SplashScreenData[]> {
  return withTransaction(async (connection) => {
    console.log('[SplashScreenOperations] Querying NEW splash screens for:', { machineCode, sede, local, lastSyncDate });
    
    let query: string;
    let params: any[];
    
    if (lastSyncDate) {
      query = `
        SELECT * FROM TA_SPLASH_SCREENS 
        WHERE FS_COD_MAQ = ? 
          AND FS_SEDE = ? 
          AND FS_LOCAL = ? 
          AND FS_ESTADO = 'activo'
          AND FD_FEC_CRE > ?
        ORDER BY FS_ORDEN ASC, FD_FEC_CRE ASC
      `;
      params = [machineCode, sede, local, lastSyncDate];
    } else {
      // If no lastSyncDate, get all active splash screens (first time)
      query = `
        SELECT * FROM TA_SPLASH_SCREENS 
        WHERE FS_COD_MAQ = ? 
          AND FS_SEDE = ? 
          AND FS_LOCAL = ? 
          AND FS_ESTADO = 'activo'
        ORDER BY FS_ORDEN ASC, FD_FEC_CRE ASC
      `;
      params = [machineCode, sede, local];
    }
    
    const [rows] = await connection.execute(query, params) as [SplashScreenData[], any];
    
    console.log('[SplashScreenOperations] Query returned:', rows.length, 'NEW rows');
    if (rows.length > 0) {
      console.log('[SplashScreenOperations] New rows data:', rows.map(r => ({ 
        id: r.FS_ID, 
        name: r.FS_NOMBRE, 
        fechaCreacion: r.FD_FEC_CRE,
        tipo: r.FS_TIPO 
      })));
    }
    
    return rows;
  });
}

/**
 * Get all splash screens for management
 */
export async function getAllSplashScreens(): Promise<SplashScreenData[]> {
  return withTransaction(async (connection) => {
    const query = `
      SELECT * FROM TA_SPLASH_SCREENS 
      ORDER BY FS_COD_MAQ, FS_SEDE, FS_LOCAL, FS_ORDEN, FD_FEC_CRE DESC
    `;
    
    const [rows] = await connection.execute(query) as [SplashScreenData[], any];
    return rows;
  });
} 