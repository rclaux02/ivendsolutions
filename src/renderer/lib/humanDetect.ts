import Human from '@vladmandic/human';

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const modelPath = isDev
  ? '/assets/models' // served by dev server
  : '../../assets/models'; // bundled in release, relative to index.html

export const humanDetect = new Human({
  modelBasePath: modelPath,
  face: {
    enabled: true,
    detector: { 
      rotation: true, 
      return: true,
      minConfidence: 0.5,
      iouThreshold: 0.4,
      maxDetected: 10
    },
    description: { enabled: true },
    mesh: { enabled: false },
    emotion: { enabled: false },
    iris: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
  filter: { 
    enabled: true,
    equalization: true // Enable histogram equalization for better low-light performance
  },
  backend: 'webgl',
});