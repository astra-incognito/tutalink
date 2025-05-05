import React from "react";

const AppLogo: React.FC<{ className?: string; size?: number }> = ({ 
  className = "", 
  size = 40 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      
      {/* Book base */}
      <rect x="15" y="20" width="70" height="60" rx="5" fill="url(#logoGradient)" />
      
      {/* Book pages */}
      <rect x="20" y="25" width="60" height="50" rx="2" fill="white" opacity="0.7" />
      
      {/* Book spine details */}
      <rect x="18" y="25" width="4" height="50" rx="1" fill="#3730A3" />
      
      {/* T letter */}
      <path d="M35 40H65M50 40V65" stroke="#3730A3" strokeWidth="6" strokeLinecap="round" />
      
      {/* Connection dots */}
      <circle cx="30" cy="60" r="5" fill="#3730A3" />
      <circle cx="70" cy="60" r="5" fill="#3730A3" />
      <path d="M30 60C30 60 40 70 50 70C60 70 70 60 70 60" stroke="#3730A3" strokeWidth="2" />
    </svg>
  );
};

export default AppLogo;