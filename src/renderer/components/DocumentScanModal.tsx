import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ScanLine, FileText, QrCode, Scan, ArrowRight, AlertTriangle } from 'lucide-react';
// Import Human library instance
import { humanDetect } from '../lib/humanDetect';

// Import the Vape Box logo
import vapeBoxLogo from '../assets/images/vapeBoxSquareLogo.png';

// Document field types (Text field types)
const PERSONAL_NUMBER = 7; // Personal number (FS_DNI)
const GIVEN_NAMES = 9; // Given names/First name (FS_NOM)
const SURNAME = 8; // Surname (FS_APE_PA)
const SECOND_SURNAME = 145; // Second surname (FS_APE_MA)
const AGE = 185; // Age (FS_EDAD)
const SEX = 12; // Sex (FS_SEXO)
const DOCUMENT_IMAGE = 8; // Document image (FS_FOTO)
const PORTRAIT_FIELD_TYPE = 201;
// const DATE_OF_BIRTH = 5; // Date of birth (FS_FEC_NAC)

// User data interface
interface UserData {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: number;
  sexo: string;
  photoBase64?: string;
  cameraPhotoBase64?: string;
}

// Declare global types for Regula functions
declare global {
  interface Window {
    initRegulaReader: (path: string) => void;
    Connect: (callback: () => void) => void;
    Disconnect: (callback: () => void) => void;
    CheckReaderResultFromList: (container: number, output: number, param: number, callback: (result: any) => void) => void;
    CheckReaderResultJSON: (type: number, index: number, output: number, callback: (result: any) => void) => void;
    GetTextFieldByType: (type: number, callback: (field: any) => void) => void;
    GetGraphicFieldByTypeAndSource: (type: number, source: number, callback: (field: any) => void) => void;
    AppendPortrait: (image: string, format: string, type: number, callback: (result: any) => void) => void;
    ComparePortraits: (callback: (result: any) => void) => void;
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => () => void;
        removeAllListeners: (channel: string) => void;
      };
    };
    $: any;
    OnNotificationOpticalCallback: ((code: any, value: any) => void) | null;
    OnImageReadyCallback: ((light: any, pageIndex: any) => void) | null;
    OnNotificationRFIDCallback: ((code: any, value: any) => void) | null;
    OnProcessingFinishedCallback: ((data: any) => void) | null;
    OnProcessingStartedCallback: (() => void) | null;
    OnResultReadyCallback: ((type: any) => void) | null;
    OnResultReadyXMLCallback: ((type: any, resultXML: any) => void) | null;
    OnRFIDRequestCallback: ((requestXML: any) => void) | null;
    OnSystemNotificationCallback: ((code: any, value: any) => void) | null;
    OnExtPortraitRequestCallback: (() => void) | null;
    GetReaderGraphicsFileImageByFieldType: (type: number, callback: (result: any) => void) => void;
  }
  var $: any;
  var setLang: (lang: string) => void;
}

export interface DocumentScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: (result: { success: boolean; age?: number; message?: string }) => void;
  firstName?: string; // Add firstName prop for the welcome message
  cameraFaceImage: string | null; // Accept the image URL (or null if not available)
}

const DocumentScanModal: React.FC<DocumentScanModalProps> = ({
  isOpen,
  onClose,
  onVerificationComplete,
  firstName = '', // Default name if not provided
  cameraFaceImage 
}) => {
  // --- Helper Function to Get Embedding from Base64 --- 
  const getEmbeddingFromBase64 = async (base64Data: string, source: string): Promise<number[] | null> => {
    console.log('[getEmbeddingFromBase64] Starting embedding extraction from:', source, 'base64Data:', base64Data);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          console.log('[getEmbeddingFromBase64] Image loaded, detecting face...');
          const result = await humanDetect.detect(img);
          if (result.face && result.face.length > 0 && result.face[0].embedding) {
            console.log('[getEmbeddingFromBase64] Embedding extracted successfully.');
            resolve(Array.from(result.face[0].embedding));
          } else {
            console.warn('[getEmbeddingFromBase64] No face or embedding found in the image.');
            resolve(null);
          }
        } catch (error) {
          console.error('[getEmbeddingFromBase64] Error during face detection:', error);
          resolve(null);
        }
      };
      img.onerror = (error) => {
        console.error('[getEmbeddingFromBase64] Error loading image from base64:', error);
        resolve(null);
      };
      // Ensure the base64 string has the data URI prefix
      img.src = base64Data.startsWith('data:image') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
    });
  };
  // --- End Helper Function ---

  // State for modal animation
  const [modalVisible, setModalVisible] = useState(false);
  // State for current step
  const [currentStep, setCurrentStep] = useState<'scanning' | 'failure' | 'success'>('scanning');
  // State for countdown timer
  const [timeLeft, setTimeLeft] = useState(59);
  const [regulaInitialized, setRegulaInitialized] = useState(false);
  // State for scanning status message
  const [scanningStatus, setScanningStatus] = useState('ESCANEA TU DOCUMENTO\nEN EL LECTOR');
  // State to store the scanned first name for the success message
  const [scannedFirstName, setScannedFirstName] = useState('');
  
  // Use refs to prevent unnecessary rerenders
  const modalVisibleRef = useRef(modalVisible);
  modalVisibleRef.current = modalVisible;
  
  // Use ref to store the onVerificationComplete callback to avoid dependency issues
  const onVerificationCompleteRef = useRef(onVerificationComplete);
  onVerificationCompleteRef.current = onVerificationComplete;
  
  // Use ref to track if event listeners have been set up
  const eventListenersSetupRef = useRef(false);
  // State to prevent duplicate processing calls
  const [isProcessingUserCreation, setIsProcessingUserCreation] = useState(false);
  // Add ref for atomic processing check
  const processingLockRef = useRef(false);

  // Log modal visibility changes in a useEffect, not in render function
  useEffect(() => {
    console.log('[DOCUMENT SCAN MODAL] Modal visible:', modalVisible);
  }, [modalVisible]);

  // Log regula initialization changes
  useEffect(() => {
    console.log('[DOCUMENT SCAN MODAL] Regula initialized:', regulaInitialized);
  }, [regulaInitialized]);

  // Initialize Regula Reader when component mounts AND when modal becomes visible
  useEffect(() => {
    // Only initialize when the modal is open
    if (!isOpen) return;
    
    // Initialize Regula Reader if not already initialized
    if (!regulaInitialized) {
      try {
        console.log('[DOCUMENT SCAN MODAL] Initializing Regula document reader...');
        // The initRegulaReader function is already available globally from the scripts loaded in index.html
        window.initRegulaReader('https://localhost/Regula.SDK.Api');
        
        // Set language to English using jQuery which is also loaded in index.html
        $(function () {
          setLang("Spanish");
        });
        
        console.log('[DOCUMENT SCAN MODAL] Regula document reader initialized successfully');
        
        // Connect to the Regula scanner using the Connect function from the SDK
        console.log('[DOCUMENT SCAN MODAL] Attempting to connect to Regula scanner...');
        window.Connect(() => {
          console.log('[DOCUMENT SCAN MODAL] Successfully connected to Regula scanner');
          
          // After successful connection, show the scanner UI
          if (window.$ && window.$.Show) {
            window.$.Show(() => {
              console.log('[DOCUMENT SCAN MODAL] Successfully showed Regula scanner UI');
            });
          }
        });
      
        setRegulaInitialized(true);
      } catch (error) {
        console.error('[DOCUMENT SCAN MODAL] Failed to initialize Regula document reader:', error);
      }
    }
  }, [isOpen, regulaInitialized]);

  // Cleanup event listeners when component unmounts OR when modal closes
  useEffect(() => {
    // Cleanup function
    const cleanup = () => {
      if (regulaInitialized) {
        window.Disconnect(() => {
          console.log('[DOCUMENT SCAN MODAL] Successfully disconnected from Regula scanner');
        });
      }
      
      // Clean up event listeners
      window.OnNotificationOpticalCallback = null;
      window.OnImageReadyCallback = null;
      window.OnNotificationRFIDCallback = null;
      window.OnProcessingFinishedCallback = null;
      window.OnProcessingStartedCallback = null;
      window.OnResultReadyCallback = null;
      window.OnResultReadyXMLCallback = null;
      window.OnRFIDRequestCallback = null;
      window.OnSystemNotificationCallback = null;
      window.OnExtPortraitRequestCallback = null;
      eventListenersSetupRef.current = false;
      processingLockRef.current = false; // Reset processing lock
    };

    // Clean up when modal closes
    if (!isOpen) {
      cleanup();
    }

    // Always clean up on unmount
    return cleanup;
  }, [isOpen, regulaInitialized]);

  // Setup modal and document scanning when open state changes
  useEffect(() => {
    if (isOpen) {
      // Make the backdrop visible immediately
      setModalVisible(true);
      // Reset to scanning step when modal opens
      setCurrentStep('scanning');
      // Reset timer
      setTimeLeft(59);
      // Reset scanning status message
      setScanningStatus('ESCANEA TU DOCUMENTO\nEN EL LECTOR');
      
      // Set up Regula SDK event listeners
      if (regulaInitialized && !eventListenersSetupRef.current) {
        console.log('[DOCUMENT SCAN MODAL] Setting up Regula event listeners');
        eventListenersSetupRef.current = true;
        
        // Notification for optical operations (scanner events)
        window.OnNotificationOpticalCallback = (code: any, value: any) => {
          console.log('[DOCUMENT SCAN MODAL] Optical notification:', code, value);
          // You can map codes to user-friendly messages if needed
          // Example: code 101 might mean "Document detected"
        };
        
        // Notification when an image is ready from scanner
        window.OnImageReadyCallback = (light: any, pageIndex: any) => {
          console.log('[DOCUMENT SCAN MODAL] Image ready:', light, 'Page index:', pageIndex);
        };
        
        // Notification for RFID operations
        window.OnNotificationRFIDCallback = (code: any, value: any) => {
          console.log('[DOCUMENT SCAN MODAL] RFID notification:', code, value);
        };
        
        // Called when document processing has started
        window.OnProcessingStartedCallback = () => {
          console.log('[DOCUMENT SCAN MODAL] Document processing started');
          setCurrentStep('scanning');
          setScanningStatus('ESCANEANDO');
        };
        
        // Called when document processing is complete
        window.OnProcessingFinishedCallback = async () => {
          console.log('[DOCUMENT SCAN MODAL] Document processing finished');

          // --- Check if processing is already in progress ---
          if (processingLockRef.current) {
            console.warn('[DOCUMENT SCAN MODAL] Processing already in progress. Ignoring duplicate callback.');
            return; // Exit if already processing
          }
          // --- Set processing flag ---
          console.log('[DOCUMENT SCAN MODAL] Setting processing flag.');
          processingLockRef.current = true;
          
          // --- Start Refactored Data Gathering and Verification --- 
          let userData: Partial<UserData> = {}; // Use partial as fields are optional initially
          let errorOccurred = false;

          try {
            // 1. Get all required text fields using Promises for cleaner flow
            const getField = (fieldType: number): Promise<string | null> => 
              new Promise((resolve) => window.GetTextFieldByType(fieldType, resolve));
            
            const [dni, nombres, apellidoPaterno, apellidoMaterno, sexo, edadStr] = await Promise.all([
              getField(PERSONAL_NUMBER),
              getField(GIVEN_NAMES),
              getField(SURNAME),
              getField(SECOND_SURNAME),
              getField(SEX),
              getField(AGE)
            ]);

            userData.dni = dni || '';
            userData.nombres = nombres || '';
            setScannedFirstName(userData.nombres); // Update state with scanned name
            userData.apellidoPaterno = apellidoPaterno || '';
            userData.apellidoMaterno = apellidoMaterno || '';
            userData.sexo = sexo || '';

            console.log('[DOCUMENT SCAN MODAL] Text Fields: DNI:', userData.dni, 'Nombre:', userData.nombres, 'Edad Str:', edadStr);

            // 2. Parse Age
            if (edadStr !== null) {
              const age = parseInt(edadStr, 10);
              if (!isNaN(age)) {
                userData.edad = age;
              } else {
                throw new Error('Invalid age format from document');
              }
            } else {
              throw new Error('Age not found in document');
            }

            // 3. Get Document Photo using GetReaderGraphicsFileImageByFieldType
            userData.photoBase64 = await new Promise<string | undefined>((resolve, reject) => {
              console.log(`[DOCUMENT SCAN MODAL] Attempting to get portrait using GetReaderGraphicsFileImageByFieldType(${PORTRAIT_FIELD_TYPE})...`);
              
              window.GetReaderGraphicsFileImageByFieldType(PORTRAIT_FIELD_TYPE, (result: any) => {
                  // Log the raw result 
                  console.log(`[DOCUMENT SCAN MODAL] Raw result from GetReaderGraphicsFileImageByFieldType:`, result ? `(Type: ${typeof result}, Length: ${result.length})` : result);

                  // Check if the result is a non-empty string (likely already base64)
                  if (typeof result === 'string' && result.length > 0) {
                    console.log(`[DOCUMENT SCAN MODAL] Document portrait appears to be a valid string. Assigning directly.`);
                    resolve(result); // Resolve with the string result directly
                  } else {
                    console.warn(`[DOCUMENT SCAN MODAL] Document portrait field is not a valid string or is empty.`);
                    resolve(undefined); // Resolve with undefined if not found
                  }
              });
            });
            console.log('aqui')
            console.log('[DOCUMENT SCAN MODAL] Value of userData.photoBase64 before check:', userData.photoBase64 ? `(Length: ${userData.photoBase64.length})` : userData.photoBase64);
            // Check if we finally got the photo
            if (!userData.photoBase64) {
              // If still no photo after trying both sources, throw an error
              throw new Error('Failed to extract document portrait');
            }

            // 4. Get Camera Photo - *** Use prop instead of sessionStorage ***
            console.log('[DOCUMENT SCAN MODAL] Received cameraFaceImage prop:', cameraFaceImage ? '(exists)' : '(null)'); 

            if (cameraFaceImage) {
                userData.cameraPhotoBase64 = cameraFaceImage; 
                console.log('[DOCUMENT SCAN MODAL] Using camera face image from prop.');
            } else {
              console.warn('[DOCUMENT SCAN MODAL] No camera face image passed via prop.');
              throw new Error('Camera face image not provided'); 
            }
            console.log('[DOCUMENT SCAN MODAL] User data after getting camera image:', userData);

            // 5. Perform Face Comparison (REMOVED - Not needed for new user creation flow)
            // let faceMatchSuccess = false; 
            // const SIMILARITY_THRESHOLD = 0.7;
            // if (userData.photoBase64 && userData.cameraPhotoBase64) { ... comparison logic removed ... } 
            // else { throw new Error('Face comparison skipped due to missing images'); }

            // 6. Final Verification Check (Age ONLY)
            // We proceed if document photo and camera photo were successfully retrieved and age is sufficient.
            if (userData.photoBase64 && userData.cameraPhotoBase64 && userData.edad && userData.edad >= 18) {
                console.log('[DOCUMENT SCAN MODAL] User is MAJOR and images are present. Proceeding to account creation.');
                // --- Create User Account --- 
                try {
                  // Get embedding ONLY from the camera photo for storage
                  const embeddingArray = await getEmbeddingFromBase64(userData.cameraPhotoBase64!, 'fromCameraForCreate');
                  const embeddingString = embeddingArray ? JSON.stringify(embeddingArray) : undefined;
                  
                  if (!embeddingString) {
                    // Throw error if embedding failed, as it's needed for the user record
                    throw new Error('Failed to generate face embedding for storage');
                  }

                  const createUserData = {
                    firstName: userData.nombres || '',
                    lastName: userData.apellidoPaterno || '',
                    maternalLastName: userData.apellidoMaterno || '',
                    dni: userData.dni || '',
                    age: userData.edad,
                    sexo: userData.sexo || '',
                    photoBase64: userData.cameraPhotoBase64, // Save the camera photo 
                    photo2Base64: userData.photoBase64, // Use document photo as the second photo
                    faceEmbedding: embeddingString
                  };

                  console.log('[DOCUMENT SCAN MODAL] Invoking create-user with data:', createUserData);
                  const createResult = await window.electron.ipcRenderer.invoke('create-user', createUserData);
                  console.log('[DOCUMENT SCAN MODAL] User account created:', createResult);

                  if (createResult.success) {
                    const userForSession = {
                      FS_ID: createResult.clientId,
                      FS_NOM: userData.nombres || '',
                    };
                    window.sessionStorage.setItem('currentUser', JSON.stringify(userForSession));
                    console.log('[DOCUMENT SCAN MODAL] Stored new user in sessionStorage:', userForSession);
                    
                    setCurrentStep('success');
                    setTimeout(() => {
                      onVerificationCompleteRef.current({ success: true, age: userData.edad, message: 'Document verified successfully' });
                    }, 3000); 
                  } else {
                    throw new Error(createResult.error || 'Failed to create user account');
                  }
                } catch (createUserError) {
                  console.error('[DOCUMENT SCAN MODAL] Error creating user account via IPC:', createUserError);
                  throw new Error('Error creating user account');
                }
                // --- End Create User Account --- 

            } else {
                // Determine specific failure reason
                let failureMessage = 'Verification failed';
                // Check if images were missing (should have been caught earlier, but good failsafe)
                if (!userData.photoBase64) failureMessage = 'Failed to read document photo';
                else if (!userData.cameraPhotoBase64) failureMessage = 'Missing camera photo data'; 
                // Check age 
                else if (!userData.edad) failureMessage = 'Failed to read age from document';
                else if (userData.edad < 18) failureMessage = 'User is underage';
                
                console.log(`[DOCUMENT SCAN MODAL] Verification failed: ${failureMessage}`);
                throw new Error(failureMessage);
            }

          } catch (error: any) {
            console.error('[DOCUMENT SCAN MODAL] Verification process failed:', error);
            errorOccurred = true;
            setCurrentStep('failure');
            onVerificationCompleteRef.current({
              success: false,
              age: userData.edad, // Include age if available
              message: error.message || 'Verification failed'
            });
          } finally {
            // Always reset the processing flag when done, whether successful or not
            console.log('[DOCUMENT SCAN MODAL] Resetting processing flag.');
            processingLockRef.current = false;
          }
          // --- End Refactored Data Gathering and Verification --- 
        };
        
        // Called when a result is ready
        window.OnResultReadyCallback = (type: any) => {
          console.log('[DOCUMENT SCAN MODAL] Result ready of type:', type);
        };
        
        // Called when a result with XML is ready
        window.OnResultReadyXMLCallback = (type: any, resultXML: any) => {
          console.log('[DOCUMENT SCAN MODAL] Result XML ready of type:', type);
          console.log('[DOCUMENT SCAN MODAL] Result XML:', resultXML);
        };
        
        // Called when the device is requesting RFID processing
        window.OnRFIDRequestCallback = (requestXML: any) => {
          console.log('[DOCUMENT SCAN MODAL] RFID request:', requestXML);
          // Notify the SDK that RFID request has been handled
          if (window.$ && window.$.NotifyRfidRequestHandled) {
            window.$.NotifyRfidRequestHandled(() => {
              console.log('[DOCUMENT SCAN MODAL] RFID request handled');
            });
          }
        };
        
        // Called for system notifications
        window.OnSystemNotificationCallback = (code: any, value: any) => {
          console.log('[DOCUMENT SCAN MODAL] System notification:', code, value);
        };
        
        // Called when external portrait (photo) is requested
        window.OnExtPortraitRequestCallback = () => {
          console.log('[DOCUMENT SCAN MODAL] External portrait requested');
          // Notify the SDK that portrait request has been handled
          if (window.$ && window.$.NotifyPortraitRequestHandled) {
            window.$.NotifyPortraitRequestHandled(() => {
              console.log('[DOCUMENT SCAN MODAL] Portrait request handled');
            });
          }
        };
        
        // After setting up all callbacks, now we're ready to scan the document
        console.log('[DOCUMENT SCAN MODAL] Ready to scan document - please insert ID card');
        
        // Set active lights for the scanner
        if (window.$ && window.$.SetActiveLights) {
          // Enable all scanner lights (exact values depend on your hardware)
          window.$.SetActiveLights(15, () => {
            console.log('[DOCUMENT SCAN MODAL] Active lights configured');
          });
        }
        
        // Note: We've already connected to the scanner using a direct API request
        // after initializing the Regula reader, so we don't need to call Connect again here.
      }
    } else {
      // Disconnect from the scanner when the modal is closed
      if (regulaInitialized) {
        window.Disconnect(() => {
          console.log('[DOCUMENT SCAN MODAL] Successfully disconnected from Regula scanner');
          // Reset initialization state after successful disconnect to allow reconnection on next open
          setRegulaInitialized(false);
          eventListenersSetupRef.current = false;
        });
      }
      
      // Delay hiding the modal to allow for animation
      const timer = setTimeout(() => {
        setModalVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, regulaInitialized, cameraFaceImage]);

  

  // Countdown timer
  useEffect(() => {
    // Only run countdown when modal is open and in scanning state
    if (!isOpen || currentStep !== 'scanning') return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose(); // Close modal when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Clean up interval
    return () => clearInterval(interval);
  }, [isOpen, currentStep, onClose]);

  // Handle retry button click
  const handleRetry = () => {
    setCurrentStep('scanning');
    setTimeLeft(59); // Reset timer
    setScanningStatus('ESCANEA TU DOCUMENTO\nEN EL LECTOR'); // Reset scanning status
  };

  // Add simulation function
  const simulateSuccessfulScan = () => {
    // Start with scanning status
    setScanningStatus('ESCANEANDO');
    
    // Mock data that matches the expected structure
    const mockUserData = {
      dni: '12345678',
      nombres: 'Juan Test',
      apellidoPaterno: 'Perez',
      apellidoMaterno: 'Garcia',
      edad: 25,
      sexo: 'M',
      photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', // Minimal valid base64 image
      cameraPhotoBase64: cameraFaceImage || 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' // Use provided camera image or mock
    };

    // Mock the GetTextFieldByType function
    window.GetTextFieldByType = (type: number, callback: (result: string | null) => void) => {
      switch(type) {
        case PERSONAL_NUMBER: callback(mockUserData.dni); break;
        case GIVEN_NAMES: callback(mockUserData.nombres); break;
        case SURNAME: callback(mockUserData.apellidoPaterno); break;
        case SECOND_SURNAME: callback(mockUserData.apellidoMaterno); break;
        case SEX: callback(mockUserData.sexo); break;
        case AGE: callback(mockUserData.edad.toString()); break;
        default: callback(null);
      }
    };

    // Mock the GetReaderGraphicsFileImageByFieldType function
    window.GetReaderGraphicsFileImageByFieldType = (type: number, callback: (result: any) => void) => {
      if (type === PORTRAIT_FIELD_TYPE) {
        callback(mockUserData.photoBase64);
      } else {
        callback(null);
      }
    };

    // Simulate processing with a delay to show scanning animation
    // This prevents the immediate transition that could cause modal overlap
    setTimeout(() => {
      // Only trigger if callback exists and modal is still visible
      if (window.OnProcessingFinishedCallback && modalVisibleRef.current) {
        window.OnProcessingFinishedCallback({});
      }
    }, 1000); // Add 1s delay to simulate actual scanning
  };

  if (!modalVisible) {
    return null;
  }
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70 transition-opacity duration-300"
      style={{ opacity: isOpen ? 1 : 0 }}
    >
      <div className="relative">
        {currentStep === 'scanning' ? (
          <div 
            className={`rounded-[6px] overflow-hidden relative transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
            style={{ 
              width: '521px',
              backgroundColor: 'white',
              paddingTop: '45px',
              paddingLeft: '10px',
              paddingRight: '10px',
              paddingBottom: '10px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Add simulation button */}
            {/* <button
              onClick={simulateSuccessfulScan}
              className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm"
            >
              Simulate Scan
            </button> */}

            {/* Document scan icon - larger and more prominent */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 flex items-center justify-center relative">
                <ScanLine size={100} strokeWidth={1.5} className="text-black" />
                <FileText size={50} className="text-black absolute" />
              </div>
            </div>

            {/* Title - now in one line with Akira Expanded at 48px */}
            <div className="text-center mb-4">
              <h2 
                className="text-black uppercase"
                style={{ 
                  fontSize: '24px',
                  fontFamily: 'Akira Expanded, sans-serif',
                  fontWeight: 800,
                  lineHeight: '1.2'
                }}
              >
                {scanningStatus.includes('\n') 
                  ? scanningStatus.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < scanningStatus.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))
                  : scanningStatus
                }
              </h2>
            </div>
          </div>
        ) : currentStep === 'failure' ? (
          <div 
            className={`rounded-[6px] overflow-hidden relative transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
            style={{ 
              width: '541px',
              backgroundColor: '#FF5252', // Red background for failure
              paddingTop: '45px',
              paddingLeft: '10px',
              paddingRight: '10px',
              paddingBottom: '10px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Use the same icon as the scanning modal */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 flex items-center justify-center relative">
                <ScanLine size={100} strokeWidth={1.5} className="text-white" />
                <FileText size={50} className="text-white absolute" />
              </div>
            </div>

            {/* Failure message */}
            <div className="text-center mb-[45px]">
              <h2 
                className="text-white uppercase"
                style={{ 
                  fontSize: '24px',
                  fontFamily: 'Akira Expanded, sans-serif',
                  fontWeight: 800,
                  lineHeight: '1.2'
                }}
              >
                LO SENTIMOS, DEBES SER<br />MAYOR DE EDAD
              </h2>
            </div>

            {/* Retry button - with proper case */}
            <button
              onClick={handleRetry}
              className="w-full bg-[#6B0000] text-white py-2 rounded-[6px] transition-transform hover:scale-105"
              style={{
                fontSize: '18px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                padding: '10px'
              }}
            >
              Reintentar
            </button>
          </div>
        ) : (
          // Success step with black background
          <div 
            className={`rounded-[6px] overflow-hidden relative transition-transform duration-300 ease-in-out ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
            style={{ 
              width: '541px',
              backgroundColor: 'black', // Black background for success
              paddingTop: '40px',
              paddingBottom: '40px',
              paddingLeft: '10px',
              paddingRight: '10px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Vape Box Logo - larger size */}
            <div className="flex justify-center mb-12">
              <div className="w-48 h-48 flex items-center justify-center">
                <img 
                  src={vapeBoxLogo} 
                  alt="Vape Box" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Welcome message */}
            <div className="text-center">
              <h2 
                className="text-white uppercase"
                style={{ 
                  fontSize: '24px',
                  fontFamily: 'Akira Expanded, sans-serif',
                  fontWeight: 800,
                  lineHeight: '1.2'
                }}
              >
                BIENVENIDO A LA FAMILIA<br />VAPE BOX {scannedFirstName.toUpperCase()}!
              </h2>
            </div>
          </div>
        )}
        
        {/* Big animated arrow pointing right - only show during scanning */}
        {currentStep === 'scanning' && (
          <>
            <div 
              className="absolute right-[-100px] top-1/2 transform -translate-y-1/2 arrow-animation"
            >
              <ArrowRight size={110} strokeWidth={3} className="text-white" />
            </div>
            
            {/* Move the animation to a global style to prevent rerenders */}
            <style>{`
              .arrow-animation {
                animation: moveHorizontal 1.5s infinite ease-in-out;
              }
              @keyframes moveHorizontal {
                0%, 100% {
                  transform: translateX(0) translateY(-50%);
                }
                50% {
                  transform: translateX(30px) translateY(-50%);
                }
              }
            `}</style>
          </>
        )}
        
        {/* Floating close button below the modal - styled like other modals - only show during scanning */}
        {currentStep === 'scanning' && (
          <button 
            className="absolute left-1/2 transform -translate-x-1/2 top-full mt-[30px] bg-white rounded-full h-[60px] w-[60px] flex items-center justify-center transition-transform hover:scale-110"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={30} className="text-black" />
          </button>
        )}
      </div>
      
      {/* Timer at the bottom of the screen - only show during failure step */}
      {currentStep === 'failure' && (
        <div className="fixed bottom-8 left-0 right-0 text-center">
          <div className="inline-block bg-white px-4 py-2 rounded-lg">
            <span 
              className="text-black"
              style={{ 
                fontFamily: '"Akira Expanded", sans-serif',
                fontWeight: 800,
                fontSize: '18px'
              }}
            >
              00:00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentScanModal; 