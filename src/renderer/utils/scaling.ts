// Base scale is calculated based on a 1920px width design
const BASE_SCREEN_WIDTH = 1920;

// Get current scale factor based on window width
export const getScaleFactor = () => {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.innerWidth / BASE_SCREEN_WIDTH, 1);
};

// Helper function to scale pixel values
export const scale = (pixels: number): number => {
  return Math.round(pixels * getScaleFactor());
}; 