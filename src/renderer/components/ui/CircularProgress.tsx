import React from 'react';

interface CircularProgressProps {
  value: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ value }) => {
  // Calculate the circumference of the circle
  const radius = 32; // Matches the size of the icon (72/2 - stroke width)
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the stroke-dashoffset based on the progress value (0-100)
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative w-[72px] h-[72px] flex items-center justify-center">
      {/* Background circle (gray) */}
      <svg className="absolute" width="72" height="72" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="6"
        />
      </svg>
      
      {/* Progress circle (blue) */}
      <svg className="absolute rotate-[-90deg]" width="72" height="72" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#2563EB"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-200 ease-out"
        />
      </svg>
      
      {/* Center content - current progress percentage */}
      <span className="text-blue-600 text-sm font-semibold z-10">{Math.round(value)}%</span>
    </div>
  );
};

export default CircularProgress; 