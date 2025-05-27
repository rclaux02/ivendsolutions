import axios from 'axios';

// Common interfaces
interface LoginResponse {
  resultado: string;  // Varchar(2) - "00" for approved, other values for rejected
  message: string;    // Varchar(50) - Result message
  token: string;      // Varchar(155) - JWT token, present only in approved logins, using HS256
}

interface IzipayCredentials {
  ecr_usuario: string;   // Varchar(20)
  ecr_password: string;  // Varchar(50)
}

export interface IzipayTransaction {
  ecr_aplicacion: string;
  ecr_transaccion: string;
  ecr_amount: string;
  ecr_currency_code: string;
}

/**
 * Core Izipay API service that centralizes all API calls
 */
export class IzipayService {
  private baseUrl: string;
  private token: string | null = null;
  private verbose: boolean;

  constructor(baseUrl: string = 'http://localhost:9090/API_PPAD') {
    this.baseUrl = baseUrl;
    this.verbose = process.env.IZIPAY_VERBOSE_LOGS === 'true';
    
    if (this.verbose) {
      console.log('[IZIPAY] Service initialized with base URL:', baseUrl);
    }
  }

  /**
   * Gets the current API base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Authenticates with the IziPay service
   * @param username - IziPay username (izipay)
   * @param password - IziPay password (izipay)
   * @returns Promise<boolean> - true if authentication was successful
   */
  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('[IZIPAY] Attempting login with username:', username);
      
      const credentials: IzipayCredentials = {
        ecr_usuario: username,
        ecr_password: password
      };

      const response = await axios.post<LoginResponse>(
        `${this.baseUrl}/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Log the full response for debugging
      console.log('[IZIPAY] Login response:', {
        resultado: response.data.resultado,
        message: response.data.message,
        token: response.data.token // Show the full token for debugging
      });

      // Check if login was successful (resultado === "00")
      if (response.data.resultado === "00") {
        this.token = response.data.token;
        console.log('[IZIPAY] Login successful, token stored');
        return true;
      } else {
        console.error('[IZIPAY] Login failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('[IZIPAY] Login error:', error);
      return false;
    }
  }

  /**
   * Process a transaction with the IziPay API
   * @param transaction The transaction data to process
   * @returns Promise with the API response
   */
  async processTransaction(transaction: IzipayTransaction): Promise<any> {
    try {
      console.log('[IZIPAY] Processing transaction with data:', transaction);
      
      // Check if we have a token
      if (!this.token) {
        throw new Error('No authentication token available');
      }

      console.log('[IZIPAY] Using token for transaction:');
      console.log('[IZIPAY] Full token:', this.token);
      
      console.log('[IZIPAY] IMPORTANT: The API needs direct access to the PINPAD device.');
      console.log('[IZIPAY] If any application (including this one) has the COM port open,');
      console.log('[IZIPAY] the API will not be able to communicate with the PINPAD.');
      
      console.log('[IZIPAY] Sending request to:', `${this.baseUrl}/procesarTransaccion`);
      const response = await axios.post(
        `${this.baseUrl}/procesarTransaccion`,
        transaction,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      console.log('[IZIPAY] Transaction processed successfully');
      console.log('[IZIPAY] Response:', response);
      
      // Check for PINPAD connection error
      if (response.data.response_code === '99' && 
          response.data.message?.includes('NO HAY CONEXIÓN CON EL PINPAD')) {
        console.error('[IZIPAY] PINPAD CONNECTION ERROR: The API could not connect to the PINPAD device.');
        console.error('[IZIPAY] This is likely because another application has the COM port open.');
        console.error('[IZIPAY] Please ensure all other applications are closed and the port is available.');
      }
      
      return response.data;
    } catch (error) {
      console.error('[IZIPAY] Transaction processing error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('[IZIPAY] API error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
      }
      
      // Clear token on error in case it's expired
      this.clearToken();
      throw error;
    }
  }

  /**
   * Gets the current authentication token
   * @returns string | null - The current token or null if not authenticated
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Checks if the service is currently authenticated
   * @returns boolean - true if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Clears the authentication token
   */
  clearToken(): void {
    this.token = null;
    if (this.verbose) {
      console.log('[IZIPAY] Token cleared');
    }
  }
} 