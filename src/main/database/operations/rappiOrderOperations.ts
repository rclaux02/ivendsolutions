import { withTransaction } from '../dbConnection';
import { RowDataPacket } from 'mysql2/promise';

/**
 * Interface representing a Rappi order in the database
 */
export interface RappiOrderRecord extends RowDataPacket {
  id: number;
  order_id: string;
  event_uuid: string;
  status: string;
  client_id: number;
  total_price: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create a new Rappi order record
 * @param orderId The Rappi order ID
 * @param eventUuid The event UUID from the webhook
 * @param orderData The order data from the webhook
 * @returns The created order record
 */
export async function createRappiOrder(
  orderId: string,
  eventUuid: string,
  orderData: {
    total: number;
    total_price?: number;
    client?: {
      first_name: string;
      last_name: string;
      email?: string;
    };
  }
): Promise<RappiOrderRecord> {
  return withTransaction(async (connection) => {
    // First, create a client in TA_CLI_VAPES with minimum information
    const [clientResult] = await connection.execute(
      `INSERT INTO TA_CLI_VAPES (
        FS_NOM,
        FS_APE_PA,
        FS_DNI,
        FS_TEL,
        FS_EMAIL,
        FD_FEC_CRE,
        FX_FOTO,
        FX_FOTO2
      ) VALUES (?, ?, ?, ?, ?, NOW(), UNHEX(''), UNHEX(''))`,
      [
        orderData.client?.first_name || '',
        orderData.client?.last_name || '',
        '',
        '',
        orderData.client?.email || ''
      ]
    );
    
    // Get the client ID (FS_ID from TA_CLI_VAPES)
    const clientId = (clientResult as any).insertId;

    // Then create the Rappi order with the client ID
    const [result] = await connection.execute(
      `INSERT INTO TA_RAPPI_ORDER (
        order_id,
        order_created_event_uuid,
        status,
        client_id,
        total_price,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        orderId,
        eventUuid,
        'PENDING',
        clientId,
        orderData.total_price || orderData.total || 0
      ]
    );

    const [order] = await connection.execute<RappiOrderRecord[]>(
      'SELECT * FROM TA_RAPPI_ORDER WHERE order_id = ?',
      [orderId]
    );

    return order[0];
  });
}

/**
 * Get a Rappi order by its ID
 * @param orderId The Rappi order ID
 * @returns The order record if found, null otherwise
 */
export async function getRappiOrder(orderId: string): Promise<RappiOrderRecord | null> {
  return withTransaction(async (connection) => {
    const [orders] = await connection.execute<RappiOrderRecord[]>(
      'SELECT * FROM TA_RAPPI_ORDER WHERE order_id = ?',
      [orderId]
    );

    return orders[0] || null;
  });
}

/**
 * Get a Rappi order's event UUID
 * @param orderId The Rappi order ID
 * @returns The event UUID if found, null otherwise
 */
export async function getRappiOrderEventUuid(orderId: string): Promise<string | null> {
  return withTransaction(async (connection) => {
    const [orders] = await connection.execute<RappiOrderRecord[]>(
      'SELECT order_created_event_uuid FROM TA_RAPPI_ORDER WHERE order_id = ?',
      [orderId]
    );

    return orders[0]?.order_created_event_uuid || null;
  });
}

/**
 * Update a Rappi order's status
 * @param orderId The Rappi order ID
 * @param status The new status to set
 * @param eventUuid The event UUID from the webhook (optional)
 * @param deliveredAt The timestamp when the order was delivered (only for DELIVERED status)
 * @returns True if successful, false otherwise
 */
export async function updateRappiOrderStatus(
  orderId: string,
  status: string,
  eventUuid?: string,
  deliveredAt?: string
): Promise<boolean> {
  return withTransaction(async (connection) => {
    // Special case for CANCELLED status
    if (status === 'CANCELLED' && eventUuid) {
      const [result] = await connection.execute(
        `UPDATE TA_RAPPI_ORDER 
         SET status = ?, updated_at = NOW(), order_cancelled_event_uuid = ?
         WHERE order_id = ?`,
        [status, eventUuid, orderId]
      );
      
      return (result as any).affectedRows > 0;
    }
    
    // Special case for DELIVERED status (removing delivered_at)
    if (status === 'DELIVERED') {
      // const timestamp = deliveredAt || new Date().toISOString(); // Removed timestamp usage
      const query = `UPDATE TA_RAPPI_ORDER 
           SET status = ?, updated_at = NOW(), order_delivered_event_uuid = ?
           WHERE order_id = ?`; // Removed delivered_at = ?

      // Removed timestamp from params array
      const params = eventUuid 
        ? [status, eventUuid, orderId] // Params: status, eventUuid, orderId
        : [status, null, orderId]; // Params: status, NULL for eventUuid, orderId (Assuming eventUuid might be optional but column exists)
        // If order_delivered_event_uuid cannot be null, adjust the fallback case.

      // Ensure the query matches the params structure. If eventUuid is missing, we might need a different query or handle it.
      // Assuming for DELIVERED, eventUuid should ideally be present.
      // If eventUuid can truly be optional for DELIVERED, we need clarification on how to handle the SQL.
      // For now, proceed assuming eventUuid might be null if not provided.

      const [result] = await connection.execute(query, params); 
      return (result as any).affectedRows > 0;
    }
    
    // Standard update for other statuses
    // This part seems to incorrectly try setting event_uuid again, 
    // let's assume a specific event_uuid column exists for general updates if needed
    // If not, this should only update status and updated_at
    const query = eventUuid 
      ? `UPDATE TA_RAPPI_ORDER 
         SET status = ?, updated_at = NOW() -- Assuming event_uuid is not a general column
         WHERE order_id = ?`
      : `UPDATE TA_RAPPI_ORDER 
         SET status = ?, updated_at = NOW()
         WHERE order_id = ?`;
    
    // Params adjusted, removing eventUuid unless it's meant for a different specific column
    const params = eventUuid 
      ? [status, /* eventUuid, */ orderId] // Commented out potentially incorrect eventUuid param
      : [status, orderId];
    
    // Need to select correct query based on params
    const finalQuery = eventUuid ? query : query; // Simplify if eventUuid isn't used here
    const finalParams = eventUuid ? [status, orderId] : [status, orderId]; // Use adjusted params

    const [result] = await connection.execute(finalQuery, finalParams);
    
    return (result as any).affectedRows > 0;
  });
}

/**
 * Get all Rappi orders for a specific client
 * @param clientId The client ID to get orders for
 * @returns Array of RappiOrderRecord objects
 */
export async function getRappiOrdersByClientId(clientId: number | string): Promise<RappiOrderRecord[]> {
  return withTransaction(async (connection) => {
    const [orders] = await connection.execute<RappiOrderRecord[]>(
      `SELECT * FROM TA_RAPPI_ORDER 
       WHERE client_id = ? 
       ORDER BY created_at DESC`,
      [clientId]
    );

    return orders;
  });
}

/**
 * Get order statistics for a specific client
 * @param clientId The client ID to get stats for
 * @returns Object with counts for different order statuses
 */
export async function getClientOrderStats(clientId: number | string): Promise<{
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
}> {
  return withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status IN ('DELIVERED', 'READY') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
       FROM TA_RAPPI_ORDER 
       WHERE client_id = ?`,
      [clientId]
    );

    const stats = (rows as any)[0];
    
    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      completed: stats.completed || 0,
      cancelled: stats.cancelled || 0
    };
  });
}

/**
 * Update a Rappi order with courier assignment details
 * @param orderId The Rappi order ID
 * @param eventUuid The courier assignment event UUID
 * @param courierData Optional courier information
 * @returns True if successful, false otherwise
 */
export async function updateRappiOrderCourierAssignment(
  orderId: string,
  eventUuid: string,
  courierData?: {
    first_name?: string;
    last_name?: string;
  }
): Promise<boolean> {
  return withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `UPDATE TA_RAPPI_ORDER 
       SET courier_assigned_event_uuid = ?, 
           courier_name = ?, 
           updated_at = NOW()
       WHERE order_id = ?`,
      [
        eventUuid,
        courierData ? `${courierData.first_name || ''} ${courierData.last_name || ''}`.trim() : '',
        orderId
      ]
    );
    
    return (result as any).affectedRows > 0;
  });
}

/**
 * Get a Rappi order's courier assigned event UUID
 * @param orderId The Rappi order ID
 * @returns The courier assigned event UUID if found, null otherwise
 */
export async function getRappiOrderCourierEventUuid(orderId: string): Promise<string | null> {
  return withTransaction(async (connection) => {
    const [orders] = await connection.execute<RappiOrderRecord[]>(
      'SELECT courier_assigned_event_uuid FROM TA_RAPPI_ORDER WHERE order_id = ?',
      [orderId]
    );

    console.log(`[RAPPI] Courier assigned event UUID for order ${orderId}: ${orders[0]?.courier_assigned_event_uuid}`);
    return orders[0]?.courier_assigned_event_uuid || null;
  });
} 