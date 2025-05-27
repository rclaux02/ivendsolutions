import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScanFace, CheckCircle, XCircle, UserPlus } from 'lucide-react';
// Import face detection hook and MatchResult type
import { useFaceDetection, FaceBox, RecognitionMatch, RecognitionResult } from '../hooks/useFaceRecognition';
// Import the CircularProgress component
import CircularProgress from './ui/CircularProgress';
// Remove OpenCV declaration
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => (() => void);
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

// Use window.electron instead of direct require
// const { ipcRenderer } = require('electron')


// Increase similarity threshold for stricter matching
const SIMILARITY_THRESHOLD = 0.65;
// Lower detection threshold for better sensitivity
const FACE_DETECTION_THRESHOLD = 0.65;

// Add interface for Regula face detection result
interface RegulaFaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RegulaFace {
  rect?: RegulaFaceRect;
  [key: string]: any; // For any other properties
}

interface CameraModalProps {
  modalVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNewUserDetected?: (faceImageURL: string) => void;
  onCreateAccount?: () => void;
  onFeedbackSubmitted?: (feedback: 'happy' | 'neutral' | 'sad') => void;
  onResetToSplashScreen?: () => void;
}

// Mock user data - in a real app, this would come from your backend
const mockUser = {
  firstName: 'Juan',
  lastName: 'Pérez',
  id: 'user_123'
};

const CameraModal: React.FC<CameraModalProps> = ({ 
  modalVisible, 
  onClose,
  onSuccess,
  onNewUserDetected,
  onCreateAccount,
  onFeedbackSubmitted,
  onResetToSplashScreen
}) => {
  // State for modal animation
  const [isVisible, setIsVisible] = useState(false);
  // State for facial recognition status
  const [recognitionStatus, setRecognitionStatus] = useState<'idle' | 'scanning' | 'success' | 'failed' | 'new-user' | 'inactive'>('idle');
  // State for recognition message
  const [statusMessage, setStatusMessage] = useState('Mira de frente a la cámara y no te muevas');
  // Remove OpenCV state
  // State to track camera errors - REMOVED: never used
  // Use a more specific type for recognizedUser based on MatchResult
  const [recognizedUser, setRecognizedUser] = useState<RecognitionMatch | null>(null);
  const [simulatePaymentFailure, setSimulatePaymentFailure] = useState(false);
  const [storedFaces, setStoredFaces] = useState<{id: string, data: string}[]>([]);
  // Add new state for inactivity timer
  const [lastMovementTime, setLastMovementTime] = useState<number>(Date.now());
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Add stability tracking state
  const [stableFaceCount, setStableFaceCount] = useState(0);
  const prevFacePositionRef = useRef<{x: number, y: number, width: number, height: number} | null>(null);
  // Add time-based stability tracking
  const stabilityStartTimeRef = useRef<number | null>(null);
  const stabilityProgressRef = useRef(0);
  const stabilityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for canvas elements
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  // *** Reinstate videoRef ***
  const videoRef = useRef<HTMLVideoElement>(null); 
  const processingStartedRef = useRef(false); // Add this ref
  // Add ref to track current stable count
  const currentStableCountRef = useRef(0);
  // Add recognition lock ref to prevent multiple recognitions
  const recognitionLockedRef = useRef(false);
  // Add ref to track recognition status for callbacks
  const recognitionStatusRef = useRef<'idle' | 'scanning' | 'success' | 'failed' | 'new-user' | 'inactive'>('idle');
  // Add ref to cache the best recognition result
  const bestRecognitionResultRef = useRef<RecognitionResult | null>(null);
  // Add atomic processing flag
  const isProcessingResultRef = useRef(false);
  
  // Functions for time-based stability tracking
  const startStabilityTimer = useCallback(() => {
    if (stabilityStartTimeRef.current) return; // Already started
    
    stabilityStartTimeRef.current = Date.now();
    stabilityProgressRef.current = 0;
    setStableFaceCount(0);
    currentStableCountRef.current = 0;
    
    // Update progress every 100ms for smooth animation
    stabilityIntervalRef.current = setInterval(() => {
      if (!stabilityStartTimeRef.current) return;
      
      const elapsed = Date.now() - stabilityStartTimeRef.current;
      const targetTime = 4000; // 4 seconds to complete for better accuracy
      const progress = Math.min(elapsed / targetTime, 1);
      const progressCount = Math.floor(progress * 5); // 5 steps for 20% increments
      
      stabilityProgressRef.current = progress * 100;
      currentStableCountRef.current = progressCount;
      setStableFaceCount(progressCount);
      
      if (progress >= 1) {
        // Stability complete
        clearInterval(stabilityIntervalRef.current!);
        stabilityIntervalRef.current = null;
        
        // Process any cached recognition result immediately when timer completes
        if (bestRecognitionResultRef.current && recognitionStatusRef.current === 'scanning' && !recognitionLockedRef.current) {
          console.log('[CameraModal] Stability timer completed, processing cached result immediately');
          // Trigger the recognition result processing by calling it with the cached result
          setTimeout(() => {
            if (bestRecognitionResultRef.current) {
              console.log('[CameraModal] 🎯 FINAL RESULT USED:', bestRecognitionResultRef.current.match ? `MATCH with ${bestRecognitionResultRef.current.match.FS_NOM} (similarity: ${bestRecognitionResultRef.current.match.similarity.toFixed(4)})` : 'NO MATCH - new user');
              handleRecognitionResult(bestRecognitionResultRef.current, true); // Pass isFromTimer=true
            }
          }, 100); // Small delay to ensure UI updates
        }
      }
    }, 100);
  }, []);
  
  const stopStabilityTimer = useCallback(() => {
    if (stabilityIntervalRef.current) {
      clearInterval(stabilityIntervalRef.current);
      stabilityIntervalRef.current = null;
    }
    stabilityStartTimeRef.current = null;
    stabilityProgressRef.current = 0;
    setStableFaceCount(0);
    currentStableCountRef.current = 0;
  }, []);
  
  // Handle successful face recognition
  // *** Re-add useCallback ***
  const handleSuccessfulRecognition = useCallback(() => {
    console.log('Handling successful recognition, closing camera modal');
    // First close the camera modal
    onClose();
    
    // Then after a short delay to allow for animation, call onSuccess
    setTimeout(() => {
      console.log('Calling onSuccess to show payment modal');
      onSuccess();
    }, 300);
  }, [onClose, onSuccess]); // Add dependencies
  
  // Use the face detection hook
  // *** Re-add useCallback ***
  const handleFaceDetection = useCallback((faces: FaceBox[]) => {
    // Only process if we're actively scanning and not locked - use ref to get current status
    if (recognitionStatusRef.current !== 'scanning' || recognitionLockedRef.current) {
      return;
    }
    
    // Reset inactivity timer on any detection event
    setLastMovementTime(Date.now());
    
    if (faces.length > 0) {
      // Found at least one face
      console.log(`Detected ${faces.length} faces with scores:`, faces.map(f => f.score));
      
      // Find the face with the highest confidence score
      const bestFace = faces.reduce((prev, current) => 
        (current.score > prev.score) ? current : prev
      );
      
      // Only process if the face detection confidence is high enough
      if (bestFace.score > 0.6) {
        // Check face stability
        const currentFace = bestFace.box;
        let isStable = false;
        
        if (prevFacePositionRef.current) {
          const prev = prevFacePositionRef.current;
          // Calculate total movement (Manhattan distance)
          const xMovement = Math.abs(prev.x - currentFace.x);
          const yMovement = Math.abs(prev.y - currentFace.y);
          const widthChange = Math.abs(prev.width - currentFace.width);
          const heightChange = Math.abs(prev.height - currentFace.height);
          
          // Total movement as a sum of position and size changes
          const totalMovement = xMovement + yMovement + widthChange + heightChange;
          
          // Consider stable if movement is below threshold (increased from 80 to 120 pixels total)
          isStable = totalMovement < 140;
          
          console.log(`Face movement: ${totalMovement.toFixed(1)}px, stable: ${isStable}`);
        }
        
        // Store current position for next frame comparison
        prevFacePositionRef.current = { ...currentFace };
        
        // Update stability counter
        if (isStable) {
          if (!stabilityStartTimeRef.current) {
            setTimeout(() => {
              if (recognitionStatusRef.current === 'scanning' && !recognitionLockedRef.current) {
                startStabilityTimer();
                setStatusMessage(`Mantén la posición para completar la verificación`);
              }
            }, 500);
          }
        } else {
          // Stop and reset timer if face becomes unstable
          stopStabilityTimer();
          setStatusMessage('Mira de frente a la cámara y no te muevas');
        }
        
        // We don't need to check stableFaceCount here, as recognition is handled separately
        // Just indicate processing has started
        if (!processingStartedRef.current) { 
          console.log(`Starting face processing with score ${bestFace.score}`);
          processingStartedRef.current = true;
        }
      }
    } else {
      // No face detected, clear canvas and reset stability
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      
      // Reset stability timer when no face is detected
      stopStabilityTimer();
      setStatusMessage('Mira de frente a la cámara y no te muevas');
      prevFacePositionRef.current = null;
    }
  }, [canvasRef, setLastMovementTime]); // Remove recognitionStatus from dependencies to prevent recreating callback
  
  // 🔥 Callback for face recognition results
  // *** Update signature to accept RecognitionResult ***
  const handleRecognitionResult = useCallback((result: RecognitionResult, isFromTimer = false) => {
    // ATOMIC CHECK-AND-SET - prevents race conditions
    if (isProcessingResultRef.current) {
      console.log('[CameraModal] ⚠️ Already processing a result, ignoring new one');
      return;
    }
    
    if (recognitionStatusRef.current !== 'scanning' || recognitionLockedRef.current) return;
    
    // Check for high-confidence match - complete progress and process
    // But if called from timer, skip the early return and process the result
    if (result.match && result.match.similarity > SIMILARITY_THRESHOLD && !isFromTimer) {
      console.log('[CameraModal] High-confidence match found, completing progress:', result.match.similarity);
      
      // Only cache if this is the best result we've seen so far
      if (!bestRecognitionResultRef.current || 
          !bestRecognitionResultRef.current.match || 
          result.match.similarity > bestRecognitionResultRef.current.match.similarity) {
        bestRecognitionResultRef.current = result;
        console.log('[CameraModal] Cached BETTER high-confidence match:', result.match.similarity);
      } else {
        console.log('[CameraModal] Keeping previous better match:', bestRecognitionResultRef.current.match.similarity, 'vs new:', result.match.similarity);
      }
      
      return;
    }  else {
      // Cache the best recognition result (prioritize matches over non-matches)
      if (result.match) {
        // If we have a match, only cache if it's better than what we have
        if (!bestRecognitionResultRef.current || 
            !bestRecognitionResultRef.current.match || 
            result.match.similarity > bestRecognitionResultRef.current.match.similarity) {
          bestRecognitionResultRef.current = result;
          console.log('[CameraModal] Cached BETTER match result:', result.match.similarity);
        }
      } else if (!bestRecognitionResultRef.current) {
        // If no match and no cache, store this non-match
        bestRecognitionResultRef.current = result;
        console.log('[CameraModal] Cached non-match result');
      }
    }
    
    // Only process recognition if face is stable enough (unless called from timer)
    if (currentStableCountRef.current < 5 && !isFromTimer) {
      console.log('Face recognition result cached but waiting for stability:', currentStableCountRef.current);
      return;
    }
    
    // Use the best cached result
    const resultToProcess = bestRecognitionResultRef.current;
    if (!resultToProcess) return;
    
    // Clear the cache since we're processing it
    bestRecognitionResultRef.current = null;
    
    if (resultToProcess.match) {
      // Lock recognition to prevent multiple matches
      recognitionLockedRef.current = true;
      
      // Recognized existing user
      const match = resultToProcess.match;
      console.log('Processing cached recognition - Recognized user:', match);
      setRecognizedUser(match);
      
      // Store the entire recognized user object in sessionStorage
      window.sessionStorage.setItem('currentUser', JSON.stringify(match));
      console.log(`[CameraModal] Stored recognized user in sessionStorage:`, match);
      
      setRecognitionStatus('success');
      // Show success state for 2 seconds, then proceed
      setTimeout(() => {
        handleSuccessfulRecognition();
      }, 2000);

    } else if (resultToProcess.detectedButNotRecognized && resultToProcess.detectedFaceBox) {
      // Lock recognition to prevent processing other results
      recognitionLockedRef.current = true;
      
      console.log('[CameraModal] Processing cached recognition - Face detected, no match. Applying professional crop for new user.');
      let croppedFaceImageURL: string | null = null;
      const originalFaceBox = resultToProcess.detectedFaceBox;
      
      // PROFESSIONAL FACE RECOGNITION CROP
      // Industry standards use a wider crop (60-70%) centered on eyes
      // Eyes are typically at 45-50% from the top of the head
      
      // Calculate center of the face (typically between eyes and nose)
      const faceCenter = {
        x: originalFaceBox.x + originalFaceBox.width * 0.5,
        y: originalFaceBox.y + originalFaceBox.height * 0.42 // Slightly above center - closer to eyes
      };
      
      // Professional crop size - 60% width, 70% height
      // Width needs to include eyes, nose, and mouth but trim sides
      // Height should include from forehead to chin but trim hair and neck
      const cropWidth = originalFaceBox.width * 0.6;
      const cropHeight = originalFaceBox.height * 0.7;
      
      // Center horizontally, position vertically to focus on facial features
      const cropX = faceCenter.x - (cropWidth / 2);
      const cropY = faceCenter.y - (cropHeight * 0.45); // Position to focus on eyes/nose/mouth
      
      console.log(`APPLYING PROFESSIONAL CROP IN CameraModal: ${cropWidth.toFixed(1)}x${cropHeight.toFixed(1)} at ${cropX.toFixed(1)},${cropY.toFixed(1)}`);

      if (videoRef.current) {
        const video = videoRef.current;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = 224; // Standard width for face recognition
        cropCanvas.height = 224; // Standard height for face recognition
        const cropCtx = cropCanvas.getContext('2d');

        if (cropCtx) {
          try {
            console.log(`[CameraModal] Original box: x:${originalFaceBox.x.toFixed(1)}, y:${originalFaceBox.y.toFixed(1)}, w:${originalFaceBox.width.toFixed(1)}, h:${originalFaceBox.height.toFixed(1)}`);
            console.log(`[CameraModal] Professional crop: x:${cropX.toFixed(1)}, y:${cropY.toFixed(1)}, w:${cropWidth.toFixed(1)}, h:${cropHeight.toFixed(1)}`);
            
            // Clean background (white is preferred for professional systems)
            cropCtx.fillStyle = 'white';
            cropCtx.fillRect(0, 0, 224, 224);
            
            cropCtx.drawImage(
              video,                // source image
              cropX,                // source x
              cropY,                // source y
              cropWidth,            // source width
              cropHeight,           // source height
              0,                    // destination x
              0,                    // destination y
              224,                  // destination width (scales to this)
              224                   // destination height (scales to this)
            );
            croppedFaceImageURL = cropCanvas.toDataURL('image/jpeg');
            console.log('[CameraModal] Professional crop face image captured successfully.');
          } catch (e) {
            console.error('[CameraModal] Error cropping/resizing face image:', e);
            croppedFaceImageURL = null;
          }
        } else {
          console.error('[CameraModal] Could not get context from crop canvas.');
        }
      } else {
        console.error('[CameraModal] Cannot crop face image: videoRef is not available.');
      }
      
      // Only proceed if image capture was successful and callback exists
      if (croppedFaceImageURL && typeof onNewUserDetected === 'function') {
          setRecognitionStatus('new-user'); 
          setStatusMessage('Usuario no reconocido');
          console.log('[CameraModal] New user detected, triggering document scan with cropped image.');
          
          onNewUserDetected(croppedFaceImageURL); // Pass the CROPPED image

          onClose(); 
      } else {
          console.error('[CameraModal] Failed to crop face image or onNewUserDetected is not a function.');
          setStatusMessage('Error procesando imagen facial');
          setRecognitionStatus('failed');
          setTimeout(onClose, 2000); 
      }

    } else if (resultToProcess.detectedButNotRecognized) {
      // Lock recognition to prevent processing other results
      recognitionLockedRef.current = true;
      
      // This case means detectedButNotRecognized is true, but detectedFaceBox was not provided.
      // This might happen if the detection score was too low in the hook for the box to be considered valid for recognition.
      console.warn('[CameraModal] Face detected but no match, and no valid face box provided by hook. Cannot capture new user image.');
      setStatusMessage('No se pudo aislar el rostro');
      setRecognitionStatus('failed');
      setTimeout(onClose, 2000);
    } else {
       // No match AND no detected face
       // console.log('Hook reported: No match and no detected face. Continuing scan.')
    }
  }, [handleSuccessfulRecognition, onClose, onNewUserDetected, videoRef, captureCanvasRef]); // Remove recognitionStatus from dependencies to prevent recreating callback
  
  // Debug log when modalVisible changes
  useEffect(() => {
    console.log(`CameraModal modalVisible changed to: ${modalVisible}`);
  }, [modalVisible]);
  
  // Initialize face detection with our hook when modal is visible
  // *** Correct the hook call ***
  useFaceDetection(
    handleFaceDetection,   // Face detection callback 
    modalVisible,          // Only active when modal is visible
    250,                   // Scan interval in ms
    handleRecognitionResult, // Recognition result callback
    videoRef               // *** Pass videoRef as 5th argument ***
  );  // Note: This hook handles camera initialization/shutdown based on modalVisible parameter

  // Handle modal open/close with animation
  useEffect(() => {
    if (modalVisible) {
      console.log('Camera modal becoming visible');
      // First make the backdrop visible immediately
      setIsVisible(true);
      // Reset recognition status
      setRecognitionStatus('idle');
      setStatusMessage('Mira de frente a la cámara y no te muevas');
      
      // Reset stability tracking
      setStableFaceCount(0);
      prevFacePositionRef.current = null;
      currentStableCountRef.current = 0; // Ensure ref is reset too
      
      // Reset recognition lock
      recognitionLockedRef.current = false;

      // Reset recognition cache
      bestRecognitionResultRef.current = null;
      
      // Reset stability timer
      stopStabilityTimer();
      
      // Start face scanning after a short delay to ensure UI is visible
      // Note: Camera initialization is handled by useFaceDetection hook via modalVisible parameter
      const timer = setTimeout(() => {
        console.log('Setting recognition status to scanning');
        setRecognitionStatus('scanning');
        processingStartedRef.current = false; // Reset the flag here
        // Reset recognized user state when modal opens
        setRecognizedUser(null);
      }, 500);
      
      // Reset atomic processing flag
      isProcessingResultRef.current = false;
      
      return () => clearTimeout(timer);
    } else {
      // When modal closes, handle cleanup of UI state only
      // (camera shutdown is handled by useFaceDetection hook via modalVisible parameter)
      console.log('Camera modal closing');
      
      // Reset all state values and refs when modal is closing
      setStableFaceCount(0);
      prevFacePositionRef.current = null;
      currentStableCountRef.current = 0;
      processingStartedRef.current = false;
      recognitionLockedRef.current = false;
      
      // Reset stability timer
      stopStabilityTimer();
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Reset recognition status when modal is fully closed
        setRecognitionStatus('idle');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalVisible]);

  // Additional cleanup effect when recognition status changes
  useEffect(() => {
    // Keep ref in sync with state for callbacks
    recognitionStatusRef.current = recognitionStatus;
    
    if (recognitionStatus === 'idle') {
      // Always ensure counters are reset when status is idle
      setStableFaceCount(0);
      currentStableCountRef.current = 0;
      prevFacePositionRef.current = null;
      recognitionLockedRef.current = false;
      
      // Reset stability timer when going to idle
      stopStabilityTimer();
    }
    
    // Lock recognition when status is no longer scanning
    if (recognitionStatus !== 'scanning') {
      recognitionLockedRef.current = true;
    }
  }, [recognitionStatus]);

  // Set up canvas sizes when video dimensions are available
  useEffect(() => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      if (canvasRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
      if (captureCanvasRef.current) {
        captureCanvasRef.current.width = videoRef.current.videoWidth;
        captureCanvasRef.current.height = videoRef.current.videoHeight;
      }
      console.log(`Set canvas dimensions to ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
    }
  }, [videoRef.current?.videoWidth, videoRef.current?.videoHeight]);

  // Function to handle timeout (no movement for 45 seconds)
  const checkInactivity = useCallback(() => {
    // Only check if we're in scanning mode
    if (recognitionStatus === 'scanning') {
      const now = Date.now();
      const elapsedSinceLastMovement = now - lastMovementTime;
      
      // If 45 seconds have passed without movement
      if (elapsedSinceLastMovement > 45000) {
        console.log('[CameraModal] No movement detected for 45 seconds, closing modal');
        // Change status to inactive
        setRecognitionStatus('inactive');
        setStatusMessage('No se detectó movimiento');
        
        // Show message briefly before closing
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }
  }, [lastMovementTime, recognitionStatus, onClose]);
  
  // Set up inactivity checker
  useEffect(() => {
    if (modalVisible && recognitionStatus === 'scanning') {
      // Clear any existing timeout
      if (inactivityTimeoutRef.current) {
        clearInterval(inactivityTimeoutRef.current);
      }
      
      // Reset last movement time when modal opens
      setLastMovementTime(Date.now());
      
      // Check every 5 seconds
      inactivityTimeoutRef.current = setInterval(checkInactivity, 5000);
      
      return () => {
        if (inactivityTimeoutRef.current) {
          clearInterval(inactivityTimeoutRef.current);
          inactivityTimeoutRef.current = null;
        }
      };
    }
  }, [modalVisible, recognitionStatus, checkInactivity]);

  // Add a debug function
  const debugInfo = () => {
    console.log('=== Camera Modal Debug Info ===');
    console.log('Modal visible:', isVisible);
    console.log('Recognition status:', recognitionStatus);
    console.log('Video element exists:', !!videoRef.current);
    
    if (videoRef.current) {
      console.log('Video ready state:', videoRef.current.readyState);
      console.log('Video paused:', videoRef.current.paused);
      console.log('Video srcObject:', !!videoRef.current.srcObject);
    }
    
    // Try to check if we can access the camera
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available video devices:', videoDevices.length);
        videoDevices.forEach((device, index) => {
          console.log(`Video device ${index + 1}:`, device.label || `Device ${index + 1}`);
        });
      })
      .catch(err => {
        console.error('Error enumerating devices:', err);
      });
  };


  // For development: Toggle payment failure simulation
  const togglePaymentFailure = () => {
    setSimulatePaymentFailure(prev => !prev);
    console.log(`Payment failure simulation ${!simulatePaymentFailure ? 'enabled' : 'disabled'}`);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      {/* Only render camera UI, no PaymentModal */}
      <div 
        className="relative flex flex-col items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <div 
          className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${recognitionStatus === 'success' ? 'bg-[#40AD53]' : ''}`}
          style={{ 
            width: '822px', 
            height: '880px',
            padding: '0px'
          }}
        >
          {/* Camera View - 80% of the modal height */}
          <div 
            className="bg-gray-200 flex items-center justify-center relative"
            style={{ 
              height: '80%',
              margin: '0px'
            }}
          >
            {/* Video element for camera feed - now managed by useFaceDetection hook */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
              style={{ display: 'block', transform: 'scaleX(-1)' }}
              id="camera-video-element"
            />
            
            {/* Canvas for drawing face detection */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Hidden canvas for capturing frames */}
            <canvas 
              ref={captureCanvasRef}
              className="hidden"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Facial recognition overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {recognitionStatus === 'scanning' && (
                <div className="w-[250px] h-[250px] border-2 border-white rounded-full animate-pulse opacity-50" />
              )}
              {recognitionStatus === 'success' && (
                <div className="w-[250px] h-[250px] border-2 border-white rounded-full animate-pulse opacity-70" />
              )}
              {recognitionStatus === 'failed' && (
                <div className="w-[250px] h-[250px] border-2 border-red-500 rounded-full animate-pulse opacity-70" />
              )}
              {recognitionStatus === 'new-user' && (
                <div className="w-[250px] h-[250px] border-2 border-blue-500 rounded-full animate-pulse opacity-70" />
              )}
            </div>
          </div>

          {/* Bottom section - 20% of the modal height */}
          <div 
            className={`flex flex-col items-center justify-center ${recognitionStatus === 'success' ? 'bg-green-500 text-white' : 'bg-white'}`}
            style={{ height: '20%', paddingTop: '10px' }}
          >
            <div className="flex items-center justify-center mb-6">
              {recognitionStatus === 'idle' && <ScanFace size={72} className="text-blue-600 animate-spin" />}
              {recognitionStatus === 'scanning' && (currentStableCountRef.current > 0
                ? <CircularProgress value={(currentStableCountRef.current / 5) * 100} />
                : <ScanFace size={72} className="text-blue-600 animate-pulse" />
              )}
              {recognitionStatus === 'success' && <CheckCircle size={72} className="text-white" />}
              {recognitionStatus === 'failed' && <XCircle size={72} className="text-red-600" />}
              {recognitionStatus === 'new-user' && <UserPlus size={72} className="text-blue-600" />}
              {recognitionStatus === 'inactive' && <XCircle size={72} className="text-yellow-500" />}
            </div>
            {/* Apply font styles: Akira Expanded Black, 800 weight, 48px size */}
            <p 
              className={`uppercase font-akira text-center text-black`}
              style={{ fontWeight: 800, fontSize: '24px', marginBottom: '20px' }}
            >
              {recognitionStatus === 'success'
                ? `Bienvenido de vuelta ${recognizedUser!.FS_NOM}` 
                : statusMessage
              }
            </p>
          </div>
        </div>
      </div>
      
      {/* Fix debug buttons */}
      {/* {process.env.NODE_ENV !== 'production' && (
        <div className="fixed bottom-4 left-4 flex space-x-2">
          <button
            onClick={() => onSuccess()} // Use onSuccess instead of setShowPaymentModal
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Show Payment
          </button>
          <button
            onClick={togglePaymentFailure}
            className={`${simulatePaymentFailure ? 'bg-red-500' : 'bg-gray-500'} text-white px-4 py-2 rounded`}
          >
            {simulatePaymentFailure ? 'Failure: ON' : 'Failure: OFF'}
          </button>
        </div>
      )} */}
    </div>
  );
};

export default CameraModal; 