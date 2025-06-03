
import React from 'react';

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, children, className = '', disabled = false, title }) => {
  const baseStyle = "px-4 py-2 rounded font-semibold text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-50";
  const enabledStyle = "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500";
  const disabledStyle = "bg-gray-500 cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${disabled ? disabledStyle : enabledStyle} ${className}`}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
};

export default ActionButton;
