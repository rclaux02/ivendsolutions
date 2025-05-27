import { PoolConnection } from 'mysql2/promise';
import { withTransaction } from '../dbConnection'; // Assuming this utility exists and handles transactions

const MACHINE_ID = '1'; // Define the machine ID constant

// Interface for data needed to create a purchase transaction header
interface PurchaseTransactionData {
  clientId: number | string;
  paymentTransactionId: string | null;
  totalAmount: number;
  // currency: string; // Removed
}

/**
 * Creates a new purchase transaction header record using the defined MACHINE_ID.
 * @param connection The database connection or pool connection.
 * @param data Data for the new transaction.
 * @returns The ID of the newly created transaction, or null if failed.
 */
export async function createPurchaseTransaction(
  connection: PoolConnection,
  data: PurchaseTransactionData
): Promise<number | null> {
  const query = `
    INSERT INTO TA_PURCHASE_TRANSACTION (
      FI_CLIENT_ID,
      FS_MACHINE_ID,
      FS_PAYMENT_TRANSACTION_ID,
      FC_TOTAL_AMOUNT,
      FD_TRANSACTION_TIMESTAMP
    ) VALUES (?, ?, ?, ?, NOW())
  `;

  const params = [
    data.clientId, // Now guaranteed to be non-null
    MACHINE_ID, // Use the constant
    data.paymentTransactionId,
    data.totalAmount
  ];

  try {
    const [result] = await connection.execute(query, params);
    if ((result as any).insertId) {
      console.log(`[PurchaseOperations] Created purchase transaction with ID: ${(result as any).insertId}`);
      return (result as any).insertId;
    } 
    console.error('[PurchaseOperations] Failed to create purchase transaction, insertId not found.');
    return null;
  } catch (error) {
    console.error('[PurchaseOperations] Error executing createPurchaseTransaction:', error);
    throw error; // Re-throw to be caught by transaction handler
  }
}

// Interface for data needed to create a purchase item record
interface PurchaseItemData {
  transactionId: number;
  productId: number | string;
  quantity: number;
  unitPriceAtPurchase: number;
  discountPercentApplied: number | null;
  discountedPrice?: number | null;
  slotIdDispensedFrom: string | null;
}

/**
 * Creates a new purchase item record.
 * @param connection The database connection or pool connection.
 * @param data Data for the new purchase item.
 * @returns The ID of the newly created item, or null if failed.
 */
export async function createPurchaseItem(
  connection: PoolConnection,
  data: PurchaseItemData
): Promise<number | null> {
  // Calculate discounted price if not provided but discount is available
  let discountedPrice = data.discountedPrice;
  if (discountedPrice === undefined && data.discountPercentApplied) {
    discountedPrice = data.unitPriceAtPurchase - (data.unitPriceAtPurchase * (data.discountPercentApplied / 100));
  }

  const query = `
    INSERT INTO TA_PURCHASE_ITEM (
      FI_TRANSACTION_ID, 
      FI_PRODUCT_ID, 
      FI_QUANTITY, 
      FC_UNIT_PRICE_AT_PURCHASE, 
      FC_DISCOUNT_PERCENT_APPLIED, 
      FC_DISCOUNTED_PRICE,
      FS_SLOT_ID_DISPENSED_FROM
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.transactionId,
    data.productId,
    data.quantity,
    data.unitPriceAtPurchase,
    data.discountPercentApplied ?? 0.00,
    discountedPrice ?? data.unitPriceAtPurchase,
    // data.itemStatus, // Removed
    data.slotIdDispensedFrom
  ];

  try {
    const [result] = await connection.execute(query, params);
    if ((result as any).insertId) {
      console.log(`[PurchaseOperations] Created purchase item with ID: ${(result as any).insertId} for transaction ${data.transactionId}`);
      return (result as any).insertId;
    } 
    console.error('[PurchaseOperations] Failed to create purchase item, insertId not found.');
    return null;
  } catch (error) {
    console.error('[PurchaseOperations] Error executing createPurchaseItem:', error);
    throw error; // Re-throw to be caught by transaction handler
  }
}

// Interface for feedback data
interface PurchaseFeedbackData {
  transactionId: number;
  feedbackValue: 'happy' | 'neutral' | 'sad';
  feedbackReason?: string | null;
}

/**
 * Updates an existing purchase transaction with customer feedback.
 * @param connection The database connection or pool connection.
 * @param data Feedback data including transaction ID, value, and optional reason.
 * @returns True if the update was successful, false otherwise.
 */
export async function updatePurchaseTransactionFeedback(
  connection: PoolConnection,
  data: PurchaseFeedbackData
): Promise<boolean> {
  const query = `
    UPDATE TA_PURCHASE_TRANSACTION
    SET 
      FS_FEEDBACK_VALUE = ?,
      FT_FEEDBACK_REASON = ?
    WHERE FI_TRANSACTION_ID = ?
  `;

  const params = [
    data.feedbackValue,
    data.feedbackReason ?? null, // Ensure null is sent if reason is undefined or null
    data.transactionId
  ];

  try {
    const [result] = await connection.execute(query, params);
    if ((result as any).affectedRows > 0) {
      console.log(`[PurchaseOperations] Updated feedback for transaction ID: ${data.transactionId}`);
      return true;
    } 
    console.warn(`[PurchaseOperations] No transaction found with ID: ${data.transactionId} to update feedback.`);
    return false;
  } catch (error) {
    console.error('[PurchaseOperations] Error executing updatePurchaseTransactionFeedback:', error);
    throw error; // Re-throw to be caught by transaction handler or pool error handling
  }
}