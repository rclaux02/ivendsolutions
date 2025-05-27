// components/ViewportScaler.tsx
import React from 'react';

interface ViewportScalerProps {
  children: React.ReactNode;
}

const isProd = process.env.NODE_ENV !== 'development';

const ViewportScaler: React.FC<ViewportScalerProps> = ({ children }) => {
  if (!isProd) {
    return <>{children}</>;
  }

  // Scale based on fitting the Figma design (2260x3840) into the window
  const scale = Math.min(window.innerWidth / 2260, window.innerHeight / 3840);

  return (
    <div
      style={{
        width: '2260px',        // Base size is the Figma design
        height: '3840px',       // Base size is the Figma design
        transform: `scale(${scale})`, // Apply the calculated scaling!
        transformOrigin: 'top left',  // Scale from the top-left corner
        backgroundColor: 'red', // <-- TEMPORARY DEBUG BACKGROUND
      }}
    >
      {/* All your app content goes here */}
      {children}
    </div>
  );
};

export default ViewportScaler;
