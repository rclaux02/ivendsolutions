# Age Verification Module

This module provides age verification functionality for the vape vending machine using Regula Document Reader SDK for document scanning and face comparison.

## Overview

The age verification process works as follows:

1. The user scans their ID document using the Regula Document Reader
2. The system extracts personal information from the document, including age
3. The system takes a photo of the user's face using a camera
4. The system compares the face on the ID with the live photo
5. If the user is over 18 and the face comparison passes, the verification is successful

## Components

### DocumentVerification.ts

The main class that handles the document verification process. It:

- Watches for document data files created by the Regula SDK
- Processes the document data and extracts personal information
- Executes the face comparison using Regula FaceSDK
- Uploads verification data to the database
- Uploads photos to the FTP server
- Notifies the application of verification success or failure

### FaceVerification.ts

A class that handles face verification using the Regula FaceSDK WebClient. It:

- Captures images from the webcam
- Compares faces using the Regula FaceSDK API
- Provides similarity scores for verification

### FaceVerificationDemo.tsx

A React component that demonstrates the face verification process with:

- Live webcam feed
- Capture and verification controls
- Real-time status updates
- Similarity score display

### AgeVerificationScreen.tsx

A React component that displays the age verification UI, including:

- A countdown timer
- Status messages
- Success/failure indicators

### documentVerificationHandler.ts

A main process module that handles IPC communications for:

- Database uploads
- FTP uploads

## Configuration

The module uses the following configuration:

- Minimum age: 18 years
- Minimum face similarity: 0.2 (20%)
- Document data path: `%APPDATA%\VapeVendingMachine\Text_Data.json`
- Document photo path: `%APPDATA%\VapeVendingMachine\Photo.jpg`
- Camera photo path: `%APPDATA%\VapeVendingMachine\FotoClienteCamara.jpg`
- Regula FaceSDK path: `%PROGRAMFILES%\Regula\FaceSDK\Regula.FaceSDK.NetCoreExample.exe`
- Regula FaceSDK WebClient API: `http://localhost:41101`

## Dependencies

- Regula Document Reader SDK
- Regula FaceSDK
- Regula FaceSDK WebClient (`@regulaforensics/facesdk-webclient`)
- MySQL database
- FTP server

## Usage

### Document Verification

```typescript
import AgeVerificationScreen from './ageVerification/AgeVerificationScreen';

// In your React component
const handleVerificationSuccess = (userData) => {
  console.log('Verification successful:', userData);
  // Proceed with vending process
};

const handleVerificationFailure = (reason) => {
  console.log('Verification failed:', reason);
  // Show error message
};

const handleCancel = () => {
  console.log('Verification cancelled');
  // Return to main screen
};

// Render the age verification screen
return (
  <AgeVerificationScreen
    onSuccess={handleVerificationSuccess}
    onFailure={handleVerificationFailure}
    onCancel={handleCancel}
  />
);
```

### Face Verification

```typescript
import { FaceVerification } from './ageVerification/FaceVerification';
import FaceVerificationDemo from './ageVerification/FaceVerificationDemo';

// Using the FaceVerification class directly
const faceVerification = new FaceVerification();
const result = await faceVerification.verifyFace();
console.log(`Verification ${result.success ? 'successful' : 'failed'}`);
console.log(`Similarity score: ${result.similarity}`);

// Or using the FaceVerificationDemo component
return (
  <FaceVerificationDemo
    onSuccess={() => console.log('Verification successful')}
    onFailure={(reason) => console.log(`Verification failed: ${reason}`)}
  />
);
```

## Example

See `FaceVerificationExample.tsx` for a complete example of how to integrate the face verification component into your application. 