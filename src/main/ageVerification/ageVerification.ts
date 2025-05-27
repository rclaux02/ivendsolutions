/**
 * Result of an age verification process
 */
export interface AgeVerificationResult {
  /**
   * Whether the verification was successful
   */
  success: boolean;
  
  /**
   * Message describing the result
   */
  message: string;
  
  /**
   * User data if verification was successful
   */
  userData?: {
    /**
     * User's ID/DNI number
     */
    dni?: string;
    
    /**
     * User's first name
     */
    nombres?: string;
    
    /**
     * User's paternal surname
     */
    apellidoPaterno?: string;
    
    /**
     * User's maternal surname
     */
    apellidoMaterno?: string;
    
    /**
     * User's age
     */
    edad?: number;
    
    /**
     * Path to the user's ID photo
     */
    photoPath?: string;
    
    /**
     * Path to the user's camera photo
     */
    cameraPhotoPath?: string;
    
    /**
     * Face similarity score (0-1)
     */
    similarity?: number;
  };
  
  /**
   * Timestamp of the verification
   */
  timestamp: number;
}

/**
 * Age verification service interface
 */
export interface AgeVerificationService {
  /**
   * Start the age verification process
   */
  startVerification(): Promise<void>;
  
  /**
   * Cancel the current verification process
   */
  cancelVerification(): Promise<void>;
  
  /**
   * Get the result of the verification process
   */
  getVerificationResult(): Promise<AgeVerificationResult>;
}

/**
 * Age verification events
 */
export enum AgeVerificationEvent {
  STARTED = 'age-verification-started',
  COMPLETED = 'age-verification-completed',
  FAILED = 'age-verification-failed',
  CANCELLED = 'age-verification-cancelled'
} 