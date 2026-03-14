import React from 'react';
import './FloatingHelpIcon.css';

interface FloatingHelpIconProps {
  onClick: () => void;
}

export const FloatingHelpIcon: React.FC<FloatingHelpIconProps> = ({ onClick }) => {
  return (
    <button
      className="floating-help-icon"
      onClick={onClick}
      aria-label="Open help and support"
      title="Help & Support"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    </button>
  );
};

export default FloatingHelpIcon;
