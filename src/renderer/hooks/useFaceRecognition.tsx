import { useEffect, useRef, useState } from 'react';
import { humanDetect } from '../lib/humanDetect';

export interface FaceBox {
  score: number;      // confidence 0-1
  box: { x: number; y: number; width: number; height: number };
  similarity: number | null;
}

// Define the structure of user data fetched via IPC
interface ClientEmbedding {
  FS_ID: number | string; // Use appropriate type from DB
  FS_NOM: string;
  FACE_EMBEDDING: string;
}

// Increase similarity threshold for stricter matching
const SIMILARITY_THRESHOLD = 0.65;
// Lower detection threshold for better sensitivity
const FACE_DETECTION_THRESHOLD = 0.65;

// Define the result type for recognition, extending ClientEmbedding
export interface RecognitionMatch extends ClientEmbedding {
  similarity: number;
}

// Re-introduce the structure for the onRecognition callback result
export interface RecognitionResult {
  match: RecognitionMatch | null;
  detectedButNotRecognized: boolean; // True if a face was detected but didn't match (or DB was empty)
  detectedFaceBox?: { x: number; y: number; width: number; height: number };
}

async function recognizeFace(detectedDescriptor: number[]): Promise<RecognitionMatch | null> {
  console.log('[RecognizeFace] Starting face recognition...');
  const { success, data: knownFaces, error } = await window.electron.ipcRenderer.invoke('users:get-all-embeddings');
  // console.log('knownFaces:', knownFaces) // Optional: Keep for debugging if needed
  if (!success || !knownFaces) {
    // console.error('[RecognizeFace] Failed to fetch known faces:', error);
    return null; // Cannot perform recognition without known faces
  }

  // *** Handle empty database case ***
  if (knownFaces.length === 0) {
    console.log('[RecognizeFace] No known faces in the database to compare against.');
    return null; // Treat as no match found
  }

  // console.log(`[RecognizeFace] Comparing against ${knownFaces.length} known faces.`);
  
  let bestMatchInternal: { FS_ID: any | null; FS_NOM: string | null; similarity: number | null } = { FS_ID: null, FS_NOM: null, similarity: null }; // Use internal tracking for best score/ID
  
  for (const face of knownFaces) {
    if (!face.FACE_EMBEDDING) continue;
    const storedDescriptor = JSON.parse(face.FACE_EMBEDDING);
    const score = humanDetect.match.similarity(storedDescriptor, detectedDescriptor);
    // console.log(`[RecognizeFace] Comparing with ${face.FS_NOM} (ID: ${face.FS_ID}) - Score: ${score.toFixed(4)}`); // Use FS_NOM and FS_ID
    
    if (!bestMatchInternal.similarity || score > bestMatchInternal.similarity) {
      bestMatchInternal = { FS_ID: face.FS_ID, FS_NOM: face.FS_NOM, similarity: score }; // Store ID, Name, Score
      // console.log(`[RecognizeFace] New best match candidate found: ${bestMatchInternal.FS_NOM} (Similarity: ${bestMatchInternal.similarity?.toFixed(4)})`);
    }
  }

  console.log(`[RecognizeFace] Final best match candidate before threshold: ${bestMatchInternal.FS_NOM} (Similarity: ${bestMatchInternal.similarity?.toFixed(4)})`);
  
  // Check threshold and find the full matching user object
  if (bestMatchInternal.similarity && bestMatchInternal.similarity > SIMILARITY_THRESHOLD && bestMatchInternal.FS_ID) {
    const matchedUser = knownFaces.find((f: ClientEmbedding) => f.FS_ID === bestMatchInternal.FS_ID);
    if (matchedUser) {
      const result: RecognitionMatch = {
        ...matchedUser,
        similarity: bestMatchInternal.similarity // Add the similarity score
      };
      console.log('[RecognizeFace] Match found above threshold. Returning full user object:', result);
      return result; // ✅ returning full user object + similarity
    } else {
      console.warn(`[RecognizeFace] Best match ID ${bestMatchInternal.FS_ID} not found in knownFaces array. This shouldn't happen.`);
      return null;
    }
  } else {
    console.log('[RecognizeFace] No match found above threshold or no faces to compare. Returning null (new user or low confidence).');
    return null; // 🆕 new user or low confidence
  }
}

export function useFaceDetection(
  onDetection: (faces: FaceBox[]) => void,
  isActive = false,            // only activate when true
  scanInterval = 400,           // ms between detections
  onRecognition: ((result: RecognitionResult) => void) | undefined, // Use RecognitionResult again
  videoRef: React.RefObject<HTMLVideoElement> // Accept videoRef from parent
) {
  // const videoRef = useRef<HTMLVideoElement>(null); // Remove internal ref creation
  const lastScan = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isDetecting = useRef(false);
  const isRecognizing = useRef(false);
  const isCameraStartingOrActive = useRef(false);
  // New ref to lock the entire processing cycle within the loop
  const isProcessingCycleRef = useRef(false);
  const lastCameraStartAttempt = useRef<number>(0);

	useEffect(() => {
		const loop = async (ts: number) => {
			const v = videoRef.current;
      // 1. Check if video is ready. If not, schedule next frame and exit.
      if (!v || v.readyState < 3) {
        if (isActive) animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      // 2. Check interval and if a cycle is NOT already processing
      if (!isProcessingCycleRef.current && ts - lastScan.current >= scanInterval) {
        isProcessingCycleRef.current = true;
        lastScan.current = ts;

        try {
          // Step 1: Detect face in the raw video to get bounding box
          const initialDetectionResult = await humanDetect.detect(v);
          const detectedFaceInitial = initialDetectionResult.face[0];
          const facesForUiBox: FaceBox[] = initialDetectionResult.face.map((f) => ({
            score: f.score,
            box: { x: f.box[0], y: f.box[1], width: f.box[2], height: f.box[3] },
            similarity: null
          }));
          
          // Always call onDetection for UI boxes, regardless of recognition state
          onDetection(facesForUiBox);

          // Step 2: If a face is confidently detected, crop and resize it for embedding extraction
          if (detectedFaceInitial && detectedFaceInitial.score > FACE_DETECTION_THRESHOLD && detectedFaceInitial.box) {
            const [fx, fy, fw, fh] = detectedFaceInitial.box;
            
            // PROFESSIONAL FACE RECOGNITION CROP
            // Industry standards use a wider crop (60-70%) centered on eyes
            // Eyes are typically at 45-50% from the top of the head
            
            // Calculate center of the face (typically between eyes and nose)
            const faceCenter = {
              x: fx + fw * 0.5,
              y: fy + fh * 0.42 // Slightly above center - closer to eyes
            };
            
            // Professional crop size - 60% width, 70% height
            // Width needs to include eyes, nose, and mouth but trim sides
            // Height should include from forehead to chin but trim hair and neck
            const cropWidth = fw * 0.6;
            const cropHeight = fh * 0.7;
            
            // Center horizontally, position vertically to focus on facial features
            const cropX = faceCenter.x - (cropWidth / 2);
            const cropY = faceCenter.y - (cropHeight * 0.45); // Position to focus on eyes/nose/mouth
            
            // console.log(`APPLYING PROFESSIONAL CROP: ${cropWidth.toFixed(1)}x${cropHeight.toFixed(1)} at ${cropX.toFixed(1)},${cropY.toFixed(1)}`);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 224; // Standard width for face recognition
            tempCanvas.height = 224; // Standard height for face recognition
            const tempCtx = tempCanvas.getContext('2d');

            if (tempCtx) {
              // console.log(`[useFaceRecognition] Original box: x:${fx.toFixed(1)}, y:${fy.toFixed(1)}, w:${fw.toFixed(1)}, h:${fh.toFixed(1)}`);
              // console.log(`[useFaceRecognition] Professional crop: x:${cropX.toFixed(1)}, y:${cropY.toFixed(1)}, w:${cropWidth.toFixed(1)}, h:${cropHeight.toFixed(1)}`);
              
              // Clean background (white is preferred for professional systems)
              tempCtx.fillStyle = 'white';
              tempCtx.fillRect(0, 0, 224, 224);
              
              // Draw the professionally cropped face
              tempCtx.drawImage(
                v, 
                cropX, cropY, cropWidth, cropHeight, 
                0, 0, 224, 224
              );
              
              const embeddingDetectionResult = await humanDetect.detect(tempCanvas);
              const detectedForEmbedding = embeddingDetectionResult.face[0];

              if (detectedForEmbedding && detectedForEmbedding.embedding && onRecognition) {
                const descriptor = Array.from(detectedForEmbedding.embedding);
                try {
                  // Perform the recognition and call callback
                  // The callback (handleRecognitionResult in CameraModal) will determine 
                  // if the face is stable enough to process the result
                  const bestMatchResult = await recognizeFace(descriptor);
                  if (bestMatchResult) {
                    onRecognition({ match: bestMatchResult, detectedButNotRecognized: false });
                  } else {
                    onRecognition({ match: null, detectedButNotRecognized: true, detectedFaceBox: { x: fx, y: fy, width: fw, height: fh } });
                  }
                } catch (recognitionError) {
                  console.error('Error during face recognition:', recognitionError);
                  if (onRecognition) onRecognition({ match: null, detectedButNotRecognized: false }); 
                }
              } else if (onRecognition) {
                 // Failed to get embedding from cropped image or no callback
                 onRecognition({ match: null, detectedButNotRecognized: true, detectedFaceBox: { x: fx, y: fy, width: fw, height: fh } });
              }
            } else if (onRecognition) {
              // Could not get context for tempCanvas
              onRecognition({ match: null, detectedButNotRecognized: false });
            }
          } else if (onRecognition) {
            // No face detected in initial scan, or low score
            onRecognition({ match: null, detectedButNotRecognized: false });
          }
        } catch (detectionError) {
          console.error('Error during face detection:', detectionError);
          // Notify failure if applicable
          if (onRecognition) onRecognition({ match: null, detectedButNotRecognized: false });
        } finally {
          // *** Unlock the cycle processing lock ***
          isProcessingCycleRef.current = false;
        }
      } // End of interval and lock check

      // 4. Schedule the next frame if the hook is still active.
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
		};
	
		const startCamera = async () => {
      // Check the lock first
      if (isCameraStartingOrActive.current) {
        console.log('[useFaceDetection] Camera start already in progress or camera is active, skipping.');
        return;
      }
      
      // Add debounce protection - ignore start requests within 500ms of last one
      const now = Date.now();
      if (now - lastCameraStartAttempt.current < 500) {
        console.log('[useFaceDetection] Camera start attempted too quickly after previous attempt, debouncing.');
        return;
      }
      lastCameraStartAttempt.current = now;
      
      try {
        isCameraStartingOrActive.current = true; // Set lock BEFORE async operations
        console.log('Starting camera and face detection...');
        
        // Secondary check (optional redundancy)
        if (streamRef.current && videoRef.current && videoRef.current.srcObject) {
          console.log('Camera already running (redundant check), not starting again');
          // Flag is already true
          return;
        }
        
        // Load and warm up models if not already done
        if (!humanDetect.tf.ready) {
          console.log('Loading Human detection models...');
          await humanDetect.load();
          await humanDetect.warmup();
          console.log('Human detection models loaded and warmed up');
        }
        
        // Request camera access with standardized constraints
        console.log('Requesting camera access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            // Improve camera sensitivity with standardized constraints
            frameRate: { ideal: 30 }  // Prefer 30fps for better face detection
          }
        });
        console.log('Camera access granted');
        
        // Store stream for cleanup
        streamRef.current = stream;
        
        // Set video source and start playing
        if (videoRef.current) {
          // Clean up any existing stream first
          if (videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
          }
          
          // Set new stream
          videoRef.current.srcObject = stream;
          
          // Create a play promise to handle potential errors
          try {
            await videoRef.current.play();
            console.log('Video playing, starting detection loop');
            animationFrameRef.current = requestAnimationFrame(loop);
          } catch (playError) {
            console.error('Error playing video:', playError);
            // If there's a play error, try to recover by stopping and restarting
            if (playError instanceof DOMException && playError.message.includes('play() request was interrupted')) {
              console.log('Play request interrupted, will try again later');
              // Don't throw, just let it fail gracefully
            } else {
              throw playError; // Rethrow other errors
            }
          }
        }
      } catch (error) {
        console.error('Error starting camera:', error);
      }
      streamRef.current = null;
      isCameraStartingOrActive.current = false; // Reset flag on error
    };
    
    const stopCamera = () => {
      console.log('Stopping camera and face detection...');
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop camera tracks
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (trackError) {
              console.error('Error stopping camera track:', trackError);
            }
          });
        } catch (streamError) {
          console.error('Error accessing camera tracks:', streamError);
        }
        streamRef.current = null;
      }
      
      // Clear video source
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.srcObject = null;
        } catch (videoError) {
          console.error('Error clearing video source:', videoError);
        }
      }
      
      // Reset locks and flags
      isRecognizing.current = false;
      isCameraStartingOrActive.current = false; // Reset camera lock
      isProcessingCycleRef.current = false; // Reset cycle lock
    };
    
    // --- Start/Stop Camera and Loop Logic ---
    if (isActive) {
      // Use the ref value without modifying it directly here to avoid triggering double initialization
      if (!isCameraStartingOrActive.current) {
        startCamera(); // Request camera access and set video srcObject
        // Start the actual processing loop *after* attempting to start camera
        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(loop);
        }
      }
    } else {
      stopCamera(); // Stops camera tracks AND cancels animation frame
    }
    
    // Cleanup on unmount or when dependencies change that require stopping
    return () => {
      stopCamera(); // Ensure everything stops
    };
	}, [isActive, onDetection, scanInterval, onRecognition, videoRef]); // Dependencies

  // return { videoRef }; // Don't return the ref, it's passed in
}
