import React from 'react';

interface AiAssistantIconProps {
  className?: string;
}

export const AiAssistantIcon: React.FC<AiAssistantIconProps> = ({ className = 'w-4 h-4' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Speech bubble with top-right cutout and bottom-right tail */}
      <path
        d="M13.5 4.25H6.5C4.567 4.25 3 5.817 3 7.75V14.75C3 16.683 4.567 18.25 6.5 18.25H12.2L15.4 21.1C15.72 21.38 16.25 21.15 16.25 20.72V18.25C18.08 18.12 19.5 16.6 19.5 14.75V10.75"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Letter A */}
      <path
        d="M7.05 14.3L9.05 8.8L11.05 14.3"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.75 12.65H10.35"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Letter I */}
      <path
        d="M13.65 8.8V14.3"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      {/* Upper-right 4-point sparkle star */}
      <path
        d="M19.5 1.4L20.38 3.92L22.9 4.8L20.38 5.68L19.5 8.2L18.62 5.68L16.1 4.8L18.62 3.92L19.5 1.4Z"
        fill="currentColor"
      />
    </svg>
  );
};
