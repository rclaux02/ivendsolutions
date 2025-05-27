import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import { 
  getRappiOrderEventUuid, 
  getRappiOrderCourierEventUuid,
  updateRappiOrderStatus 
} from '../database/operations/rappiOrderOperations';

/**
 * Rappi API environment types
 */
export enum RappiEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production'
}

/**
 * Rappi API base URLs
 */
const RAPPI_API_URLS = {
  [RappiEnvironment.DEVELOPMENT]: 'https://services.rappi.pe/api/open-api',
  [RappiEnvironment.PRODUCTION]: 'https://services.rappi.pe/api/open-api'
};

// Set environment variables explicitly

// Tests Chile
// const RAPPI_STORE_ID_TEST = 9953; // store id test de Rappi Chile
// const RAPPI_CLIENT_ID = 'ssyqmv1PkgnqARhJNbTHb8tUEy0zpEpa';
// const RAPPI_CLIENT_SECRET = 'VAhRLYlaikXjjsG0MqmUbYcUgvGZ7LcY5jjfbx8KSM03zYW-pdMcAOEtYxih3Suz';
// const RAPPI_BASE_URL = 'https://services.rappi.cl/api/open-api';

// Tests Peru
const RAPPI_CLIENT_ID = 'ugRKsfn27Au5jEmkcaIDrbDFHlkderHv';
const RAPPI_CLIENT_SECRET = 'cgAC7VMO6--j6qj-WLxPO9a1MGVVEQcwYiniPDnwoLP-3WOEnzfM0NKB0b-BD-cP';
const RAPPI_BASE_URL = 'https://services.rappi.pe/api/open-api';
const RAPPI_STORE_ID_TEST = 59434; // store id real de Vapebox Rappi Peru



// const RAPPI_API_KEY = '1d54fd91d5282798eba6a8b4cd8e0ecd8c07fb50eb43137ab27a99f32ae198c8';
// const RAPPI_STORE_ID = 59434; // store id real de Vapebox Rappi Peru
// const RAPPI_STORE_ID_TEST = 9953; // store id test de Rappi Chile
// const RAPPI_CLIENT_ID = 'ssyqmv1PkgnqARhJNbTHb8tUEy0zpEpa';
// const RAPPI_CLIENT_SECRET = 'VAhRLYlaikXjjsG0MqmUbYcUgvGZ7LcY5jjfbx8KSM03zYW-pdMcAOEtYxih3Suz';
// const RAPPI_BASE_URL = 'https://services.rappi.cl/api/open-api';

/**
 * Rappi authentication response
 */
export interface RappiAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Rappi handshake response
 */
export interface RappiHandshakeResponse {
  codes: string[];
  expires_at: string;
}

/**
 * Rappi handshake verification request
 */
export interface RappiHandshakeVerificationRequest {
  order_id: string;
  handshake_code: string;
}

/**
 * Rappi handshake verification response
 */
export interface RappiHandshakeVerificationResponse {
  success: boolean;
  order_id: string;
  product_id?: string;
  slot_id?: string;
  message?: string;
  details?: {
    codes?: string[];
    expires_at?: string;
    retries_left?: number;
  };
}

/**
 * Rappi service configuration
 */
export interface RappiServiceConfig {
  clientId: string;
  clientSecret: string;
  storeId: string;
  retailerId: string;
  environment: RappiEnvironment;
}

/**
 * Rappi service events
 */
export enum RappiServiceEvent {
  AUTH_SUCCESS = 'auth-success',
  AUTH_FAILURE = 'auth-failure',
  HANDSHAKE_INITIATED = 'handshake-initiated',
  HANDSHAKE_VERIFIED = 'handshake-verified',
  HANDSHAKE_FAILED = 'handshake-failed',
  ERROR = 'error'
}

/**
 * Rappi service for integrating with Rappi's API
 */
export class RappiService extends EventEmitter {
  private config: RappiServiceConfig;
  private client: AxiosInstance;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;
  private refreshToken: string | null = null;

  constructor(config: RappiServiceConfig) {
    super();
    this.config = config;
    
    // Create axios client with base URL
    this.client = axios.create({
      baseURL: RAPPI_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Set up request interceptor to add auth token
    this.client.interceptors.request.use(async (config) => {
      // Check if token is expired and refresh if needed
      if (this.authToken && Date.now() >= this.tokenExpiry) {
        console.log('[RAPPI] Auth token expired, refreshing...');
        await this.authenticate();
      }
      
      // Add auth token if available
      if (this.authToken && config.headers) {
        config.headers['X-Auth-Token'] = this.authToken;
        config.headers['x-application-id'] = this.config.clientId;
      }
      
      return config;
    });
  }

  /**
   * Authenticate with Rappi API
   * @returns Promise that resolves when authenticated
   */
  public async authenticate(): Promise<boolean> {
    try {
      console.log('[RAPPI] Authenticating with Rappi API...');
      console.log('[RAPPI] Using credentials:', { 
        clientId: RAPPI_CLIENT_ID, 
        clientSecretLength: RAPPI_CLIENT_SECRET.length
      });
      
      let apiUrl = RAPPI_BASE_URL;
      console.log('[RAPPI] Using API URL:', apiUrl);
      
      try {
        // Log the exact request being made
        console.log('[RAPPI] Making authentication request with:', {
          url: `${apiUrl}/login`,
          data: {
            client_id: RAPPI_CLIENT_ID,
            client_secret: RAPPI_CLIENT_SECRET
          }
        });
        
        const response = await axios.post(
          `${apiUrl}/login`,
          {
            client_id: RAPPI_CLIENT_ID,
            client_secret: RAPPI_CLIENT_SECRET
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
        
        // Log full response
        console.log('RAPPI LOGIN RESPONSE:');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        
        const authData = response.data as RappiAuthResponse;
        
        if (!authData.access_token) {
          throw new Error('No access token received from Rappi API');
        }
        
        this.authToken = authData.access_token;
        this.refreshToken = authData.refresh_token || null;
        
        // Set token expiry (subtract 60 seconds as buffer)
        this.tokenExpiry = Date.now() + (authData.expires_in * 1000) - 60000;
        
        console.log('[RAPPI] Successfully authenticated with Rappi API');
        console.log(`[RAPPI] Token will expire at: ${new Date(this.tokenExpiry).toISOString()}`);
        
        this.emit(RappiServiceEvent.AUTH_SUCCESS, {
          timestamp: Date.now(),
          expiresAt: this.tokenExpiry
        });
        
        return true;
      } catch (originalError) {
        console.error('[RAPPI] Authentication failed with current environment:', originalError);
        
        // If we're using development environment and it failed, try production as fallback
        if (this.config.environment === RappiEnvironment.DEVELOPMENT) {
          console.log('[RAPPI] Retrying authentication with production URL as fallback...');
          
          try {
            // Try with production URL
            const fallbackUrl = RAPPI_API_URLS[RappiEnvironment.PRODUCTION];
            console.log('[RAPPI] Using fallback API URL:', fallbackUrl);
            
            // Log the fallback request being made
            console.log('[RAPPI] Making fallback authentication request with:', {
              url: `${fallbackUrl}/login`,
              data: {
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
              }
            });
            
            const fallbackResponse = await axios.post(
              `${fallbackUrl}/login`,
              {
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              }
            );
            
            // Log full fallback response
            console.log('RAPPI LOGIN FALLBACK RESPONSE:');
            console.log('Status:', fallbackResponse.status);
            console.log('Headers:', fallbackResponse.headers);
            console.log('Data:', fallbackResponse.data);
            
            const authData = fallbackResponse.data as RappiAuthResponse;
            
            if (!authData.access_token) {
              throw new Error('No access token received from Rappi API fallback');
            }
            
            this.authToken = authData.access_token;
            this.refreshToken = authData.refresh_token || null;
            
            // Set token expiry (subtract 60 seconds as buffer)
            this.tokenExpiry = Date.now() + (authData.expires_in * 1000) - 60000;
            
            console.log('[RAPPI] Successfully authenticated with Rappi API using fallback URL');
            console.log(`[RAPPI] Token will expire at: ${new Date(this.tokenExpiry).toISOString()}`);
            
            // Update the environment to production since it worked
            console.log('[RAPPI] Switching to production environment for future requests');
            this.config.environment = RappiEnvironment.PRODUCTION;
            
            this.emit(RappiServiceEvent.AUTH_SUCCESS, {
              timestamp: Date.now(),
              expiresAt: this.tokenExpiry
            });
            
            return true;
          } catch (fallbackError) {
            console.error('[RAPPI] Authentication failed with fallback URL as well:', fallbackError);
            throw fallbackError;
          }
        } else {
          // If we're already using production, just throw the original error
          throw originalError;
        }
      }
    } catch (error) {
      console.error('[RAPPI] Authentication failed:', error);
      
      this.authToken = null;
      this.refreshToken = null;
      this.tokenExpiry = 0;
      
      this.emit(RappiServiceEvent.AUTH_FAILURE, {
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }

  /**
   * Initiate handshake for order
   * @param orderId The Rappi order ID
   * @returns Promise that resolves with handshake response
   */
  public async initiateHandshake(orderId: string): Promise<RappiHandshakeResponse | null> {
    try {
      // Ensure we're authenticated
      if (!this.authToken || Date.now() >= this.tokenExpiry) {
        await this.authenticate();
      }
      
      console.log(`[RAPPI] Initiating handshake for order: ${orderId}`);
      
      // Get the courier assigned event UUID from the database with specific error handling
      let eventUuid: string | null;
      try {
        eventUuid = await getRappiOrderCourierEventUuid(orderId);
        if (!eventUuid) {
          console.warn(`[RAPPI] No courier assigned event UUID found for order ${orderId}, falling back to order creation event UUID`);
          eventUuid = await getRappiOrderEventUuid(orderId);
          if (!eventUuid) {
            throw new Error(`No event UUID found for order ${orderId}`);
          }
        }
      } catch (dbError) {
        console.error(`[RAPPI] Database error retrieving event UUID for order ${orderId}:`, dbError);
        throw new Error(`Failed to retrieve event UUID from database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
      
      const apiUrl = RAPPI_BASE_URL;
      console.log(`[RAPPI] Using API URL for handshake: ${apiUrl}`);
      
      // Log the exact request being made
      console.log('[RAPPI] Making handshake request with:', {
        url: `${apiUrl}/v1/orders/${orderId}/handshake`,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'event_uuid': eventUuid
        }
      });
      
      const response = await axios.post(
        `${apiUrl}/v1/orders/${orderId}/handshake`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.authToken}`,
            'event_uuid': eventUuid
          }
        }
      );
      
      // Log full response
      console.log('RAPPI HANDSHAKE RESPONSE:');
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      
      // According to Rappi documentation, the response contains codes and expiration
      // We need to extract the codes and format them for our use
      if (response.data && response.data.codes && Array.isArray(response.data.codes)) {
        const codes = response.data.codes;
        const expiresAt = response.data.expires_at;
        
        const handshakeData: RappiHandshakeResponse = {
          codes: codes,
          expires_at: expiresAt
        };
        
        console.log(`[RAPPI] Handshake initiated successfully. Codes received: ${codes.length}`);
        console.log(`[RAPPI] Codes: ${codes.join(', ')}`);
        console.log(`[RAPPI] Handshake expires at: ${expiresAt}`);
        
        this.emit(RappiServiceEvent.HANDSHAKE_INITIATED, {
          orderId,
          codes: codes,
          expiresAt,
          timestamp: Date.now()
        });
        
        return handshakeData;
      } else {
        console.error(`[RAPPI] Unexpected response format for handshake initiation:`, response.data);
        throw new Error('Unexpected response format from Rappi API');
      }
    } catch (error) {
      console.error(`[RAPPI] Failed to initiate handshake for order ${orderId}:`, error);
      
      this.emit(RappiServiceEvent.ERROR, {
        component: 'handshake',
        operation: 'initiate',
        orderId,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
      
      return null;
    }
  }

  /**
   * Verify handshake code
   * @param request The handshake verification request
   * @returns Promise that resolves with verification result
   */
  public async verifyHandshake(request: RappiHandshakeVerificationRequest): Promise<RappiHandshakeVerificationResponse> {
    try {
      // Ensure we're authenticated
      if (!this.authToken || Date.now() >= this.tokenExpiry) {
        await this.authenticate();
      }
      
      console.log(`[RAPPI] Verifying handshake for order: ${request.order_id} with code: ${request.handshake_code}`);
      
      // Get the courier assigned event UUID instead of the regular event UUID
      let eventUuid: string | null;
      try {
        eventUuid = await getRappiOrderCourierEventUuid(request.order_id);
        if (!eventUuid) {
          console.warn(`[RAPPI] No courier assigned event UUID found for order ${request.order_id}, falling back to order creation event UUID`);
          eventUuid = await getRappiOrderEventUuid(request.order_id);
          if (!eventUuid) {
            throw new Error(`No event UUID found for order ${request.order_id}`);
          }
        }
      } catch (dbError) {
        console.error(`[RAPPI] Database error retrieving event UUID for order ${request.order_id}:`, dbError);
        throw new Error(`Failed to retrieve event UUID from database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }

      const apiUrl = RAPPI_API_URLS[this.config.environment];
      console.log(`[RAPPI] Using API URL for handshake verification: ${apiUrl}`);
      
      try {
        // Log the exact request being made
        const _eventUuid = await getRappiOrderCourierEventUuid(request.order_id);
        console.log('[RAPPI] Making handshake verification request with:', {
          url: `${apiUrl}/v1/orders/${request.order_id}/handshake/validate`,
          data: {
            code: request.handshake_code
          },
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'event_uuid': _eventUuid
          }
        });
        
        // Make API call to verify the handshake code
        const response = await axios.post(
          `${apiUrl}/v1/orders/${request.order_id}/handshake/validate`,
          {
            code: request.handshake_code
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${this.authToken}`,
              'event_uuid': _eventUuid
            }
          }
        );
        
        // Log full response
        console.log('RAPPI HANDSHAKE VERIFICATION RESPONSE:');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        
        // According to Rappi documentation, a 204 status code means success
        // but no body is returned. We'll need to handle this case.
        const success = response.status === 204;
        
        // Parse response
        const verificationResult: RappiHandshakeVerificationResponse = {
          success,
          order_id: request.order_id,
          product_id: response.data?.product_id,
          slot_id: response.data?.slot_id || this.mapProductToSlot(response.data?.product_id),
          message: success ? 'Handshake verified successfully' : (response.data?.message || 'Handshake verification failed'),
          details: response.data?.codes ? {
            codes: response.data.codes,
            expires_at: response.data.expires_at,
            retries_left: response.data.retries_left
          } : undefined
        };
        
        if (verificationResult.success) {
          console.log(`[RAPPI] Handshake verified successfully for order: ${request.order_id}`);
          
          this.emit(RappiServiceEvent.HANDSHAKE_VERIFIED, {
            ...verificationResult,
            timestamp: Date.now()
          });
        } else {
          console.warn(`[RAPPI] Handshake verification failed for order: ${request.order_id}`);
          
          this.emit(RappiServiceEvent.HANDSHAKE_FAILED, {
            ...verificationResult,
            timestamp: Date.now()
          });
        }
        
        return verificationResult;
      } catch (apiError: any) {
        // Log the error response for debugging
        console.error('[RAPPI] Handshake verification API error:');
        if (apiError.response) {
          console.error('Status:', apiError.response.status);
          console.error('Data:', apiError.response.data);
          
          // If the response contains new codes (for retry), we should include them in the result
          if (apiError.response.data && apiError.response.data.codes && Array.isArray(apiError.response.data.codes)) {
            const errorResult: RappiHandshakeVerificationResponse = {
              success: false,
              order_id: request.order_id,
              message: apiError.response.data.message || 'Invalid handshake code',
              details: {
                codes: apiError.response.data.codes,
                expires_at: apiError.response.data.expires_at,
                retries_left: apiError.response.data.retries_left
              }
            };
            
            console.log('[RAPPI] New codes received after failed verification:', errorResult.details?.codes);
            console.log('[RAPPI] Retries left:', errorResult.details?.retries_left);
            
            this.emit(RappiServiceEvent.HANDSHAKE_FAILED, {
              ...errorResult,
              timestamp: Date.now()
            });
            
            return errorResult;
          }
        } else {
          console.error('Error without response:', apiError);
        }
        
        // Generic error case
        const genericErrorResult: RappiHandshakeVerificationResponse = {
          success: false,
          order_id: request.order_id,
          message: apiError instanceof Error ? apiError.message : 'Unknown error verifying handshake',
        };
        
        this.emit(RappiServiceEvent.HANDSHAKE_FAILED, {
          ...genericErrorResult,
          timestamp: Date.now()
        });
        
        return genericErrorResult;
      }
    } catch (error) {
      console.error(`[RAPPI] Error verifying handshake for order ${request.order_id}:`, error);
      
      const errorResponse: RappiHandshakeVerificationResponse = {
        success: false,
        order_id: request.order_id,
        message: `Error verifying handshake: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: undefined
      };
      
      this.emit(RappiServiceEvent.HANDSHAKE_FAILED, {
        ...errorResponse,
        timestamp: Date.now()
      });
      
      return errorResponse;
    }
  }

  /**
   * Map product ID to slot ID in the vending machine
   * This is a placeholder implementation - you should implement proper product-to-slot mapping
   * @param productId The product ID from Rappi
   * @returns The corresponding slot ID in the vending machine
   */
  private mapProductToSlot(productId: string | undefined): string {
    if (!productId) {
      return 'A1'; // Default slot if product ID is not available
    }
    
    // This should be replaced with actual product-to-slot mapping logic
    // For now, we'll use a simple hash function to map product IDs to slots
    const hash = Array.from(productId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const row = String.fromCharCode(65 + (hash % 5)); // A-E
    const col = (hash % 10) + 1; // 1-10
    
    return `${row}${col}`;
  }

  /**
   * Check if the service is authenticated
   * @returns True if authenticated with a valid token
   */
  public isAuthenticated(): boolean {
    return this.authToken !== null && Date.now() < this.tokenExpiry;
  }

  /**
   * Get the status of the Rappi service
   * @returns The current status
   */
  public getStatus(): any {
    return {
      authenticated: this.isAuthenticated(),
      tokenExpiry: this.tokenExpiry > 0 ? new Date(this.tokenExpiry).toISOString() : null,
      environment: this.config.environment,
      storeId: this.config.storeId,
      retailerId: this.config.retailerId
    };
  }

  /**
   * Mark an order as delivered in the Rappi system
   * @param orderId The Rappi order ID
   * @returns Promise that resolves with success status
   */
  public async markOrderDelivered(orderId: string): Promise<{success: boolean, message: string}> {
    try {
      // Ensure we're authenticated
      if (!this.authToken || Date.now() >= this.tokenExpiry) {
        await this.authenticate();
      }
      
      console.log(`[RAPPI] Marking order as delivered: ${orderId}`);
      
      // Get the event UUID from the database with specific error handling
      let eventUuid: string | null;
      try {
        eventUuid = await getRappiOrderEventUuid(orderId);
        if (!eventUuid) {
          throw new Error(`No event UUID found for order ${orderId}`);
        }
      } catch (dbError) {
        console.error(`[RAPPI] Database error retrieving event UUID for order ${orderId}:`, dbError);
        throw new Error(`Failed to retrieve event UUID from database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
      
      const apiUrl = RAPPI_API_URLS[this.config.environment];
      console.log(`[RAPPI] Using API URL for order delivery: ${apiUrl}`);
      
      // Log the exact request being made
      console.log('[RAPPI] Making order delivery request with:', {
        url: `${apiUrl}/v1/orders/${orderId}/delivery`,
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'event_uuid': eventUuid
        },
        data: {
          delivered_at: new Date().toISOString()
        }
      });
      
      const response = await axios.post(
        `${apiUrl}/v1/orders/${orderId}/delivery`,
        {
          delivered_at: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.authToken}`,
            'event_uuid': eventUuid
          }
        }
      );
      
      // Log full response
      console.log('RAPPI ORDER DELIVERY RESPONSE:');
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      
      // Update the order status in our database
      try {
        const deliveredAt = new Date().toISOString();
        await updateRappiOrderStatus(orderId, 'DELIVERED', eventUuid, deliveredAt);
        console.log(`[RAPPI] Successfully updated order ${orderId} status to DELIVERED in database`);
      } catch (dbError) {
        console.error(`[RAPPI] Error updating order status in database: ${dbError}`);
        // Continue with the success response even if database update fails
      }
      
      return {
        success: true,
        message: 'Order marked as delivered successfully'
      };
    } catch (error) {
      console.error(`[RAPPI] Failed to mark order ${orderId} as delivered:`, error);
      
      return {
        success: false,
        message: `Failed to mark order as delivered: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Default configuration with actual client credentials
const defaultConfig: RappiServiceConfig = {
  clientId: 'ugRKsfn27Au5jEmkcaIDrbDFHlkderHv',
  clientSecret: 'cgAC7VMO6--j6qj-WLxPO9a1MGVVEQcwYiniPDnwoLP-3WOEnzfM0NKB0b-BD-cP',
  storeId: '59434',
  retailerId: '4386',
  environment: RappiEnvironment.PRODUCTION
};

// Create and export singleton instance
export const rappiService = new RappiService(defaultConfig); 