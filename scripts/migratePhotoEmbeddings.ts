import { getClientsNeedingEmbeddingProcessing, updateClient } from '../src/main/database/operations/clientOperations';
import Human from '@vladmandic/human'; // Reverted to original import
import * as tf from '@tensorflow/tfjs'; // Use core tfjs
import '@tensorflow/tfjs-backend-wasm'; // Import WASM backend side effects
import { Buffer } from 'buffer';
import path from 'path';

// Configure Human instance for Node.js with WASM backend
const humanConfig = {
  modelBasePath: `file://${path.resolve('./public/models')}`,
  face: {
    detector: { enabled: true },
    description: { enabled: true }, // Needed for embeddings
  },
  filter: { enabled: true },
  backend: 'wasm' as const, // Use WASM backend
  debug: false,
  warmup: 'none' as const, // Consider 'none' for scripts and manage manually or let first detect do it.
};

const human = new Human(humanConfig);

/**
 * Generates a face embedding from a base64 encoded image string.
 * @param base64Image The base64 encoded image.
 * @returns A Promise that resolves to the embedding string (e.g., JSON) or null if an error occurs.
 */
async function generateFaceEmbeddingFromString(base64Image: string): Promise<string | null> {
  console.log(`Processing image starting with: ${base64Image.substring(0, 30)}...`);
  let imageTensor: tf.Tensor3D | null = null;
  try {
    const buffer = Buffer.from(base64Image, 'base64');
    
    // Decode image buffer to a TensorFlow.js tensor using human.tf.decodeImage
    // This uses the tfjs instance managed by the Human library
    imageTensor = human.tf.decodeImage(buffer, 3) as tf.Tensor3D;
    if (!imageTensor) {
      console.warn('Could not decode image buffer.');
      return null;
    }

    const result = await human.detect(imageTensor);

    if (result.face && result.face.length > 0 && result.face[0].embedding) {
      const embeddingArray = Array.from(result.face[0].embedding);
      console.log(`Embedding generated for image. Length: ${embeddingArray.length}`);
      return JSON.stringify(embeddingArray);
    } else {
      console.warn('No face found or no embedding generated for the image.');
      return null;
    }
  } catch (error) {
    console.error('Error during face embedding generation:', error);
    return null;
  } finally {
    if (imageTensor) {
      human.tf.dispose(imageTensor); // Use human.tf.dispose
    }
  }
}

async function migrateEmbeddings() {
  console.log('Starting migration of photo embeddings with WASM backend...');
  try {
    console.log('Setting TensorFlow.js backend to WASM...');
    // Ensure tf uses the same instance as human.tf if possible, or that human.tf is used consistently
    // For backend setup, using the imported tf is standard.
    await tf.setBackend('wasm'); 
    await tf.ready(); // Wait for the backend to be ready
    console.log('TensorFlow.js WASM backend is ready.');
    console.log('Current backend:', tf.getBackend()); // This should show 'wasm'
    // To be absolutely sure human uses this backend, Human typically initializes its tf instance upon construction based on config.
    // We can also log human.tf.getBackend() if needed, after human is initialized and tf is ready.
    // console.log('Human TF backend:', human.tf.getBackend());

    // No explicit human.load() or human.warmup() here, as Human might handle it differently with WASM
    // or the first call to human.detect() will trigger necessary model loading using the configured modelBasePath.
    // If models are not found at modelBasePath, Human will attempt to download them.

    let allClientsToProcess = await getClientsNeedingEmbeddingProcessing();
    console.log(`Found ${allClientsToProcess.length} total clients needing embedding processing.`);

    // Limit to 3 clients for testing
    const testLimit = 3;
    const clientsToProcess = allClientsToProcess.slice(0, testLimit);

    if (clientsToProcess.length === 0 && allClientsToProcess.length > 0) {
      console.log(`All ${allClientsToProcess.length} clients that need processing have already been processed in previous limited test runs, or the first ${testLimit} had issues and were skipped.`);
      // Or, if you want to pick the *next* 3 unrun clients, more complex logic would be needed
      // to track processed IDs, which is beyond a simple slice.
    } else if (clientsToProcess.length < allClientsToProcess.length && clientsToProcess.length > 0) {
        console.log(`Processing a test batch of ${clientsToProcess.length} clients (out of ${allClientsToProcess.length} total needing processing).`);
    } else if (clientsToProcess.length > 0) {
        console.log(`Processing all ${clientsToProcess.length} clients found (as it's less than or equal to the test limit of ${testLimit}).`);
    } // No special message if clientsToProcess.length is 0 and allClientsToProcess.length is 0

    let successCount = 0;
    let errorCount = 0;

    for (const client of clientsToProcess) {
      if (!client.FS_ID || !client.FX_FOTO) {
        console.warn(`Skipping client with missing FS_ID or FX_FOTO: ${JSON.stringify(client)}`);
        errorCount++;
        continue;
      }

      console.log(`Processing client ID: ${client.FS_ID}...`);
      try {
        const embedding = await generateFaceEmbeddingFromString(client.FX_FOTO);
        if (embedding) {
          const updated = await updateClient(client.FS_ID, { FACE_EMBEDDING: embedding });
          if (updated) {
            console.log(`Successfully updated client ID: ${client.FS_ID} with new embedding.`);
            successCount++;
          } else {
            console.error(`Failed to update client ID: ${client.FS_ID} in the database.`);
            errorCount++;
          }
        } else {
          console.warn(`Could not generate embedding for client ID: ${client.FS_ID}. FX_FOTO might be invalid or no face detected.`);
          errorCount++;
        }
      } catch (err) {
        console.error(`Error processing client ID: ${client.FS_ID}:`, err);
        errorCount++;
      }
    }

    console.log('--------------------------------------------------');
    console.log('Embedding Migration Summary:');
    console.log(`Successfully processed: ${successCount}`);
    console.log(`Failed/Skipped:       ${errorCount}`);
    console.log('--------------------------------------------------');

  } catch (error) {
    console.error('An unexpected error occurred during the migration process:', error);
  } finally {
    console.log('Migration script finished.');
  }
}

migrateEmbeddings(); 