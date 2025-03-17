import React from "react";

const Button = ({
  children,
  onClick,
  color = "blue",
  disabled = false,
  type = "button",
  className = "",
}) => {
  const colorClasses = {
    blue: "bg-blue-500 hover:bg-blue-600 text-white",
    green: "bg-green-500 hover:bg-green-600 text-white",
    red: "bg-red-500 hover:bg-red-600 text-white",
    gray: "bg-gray-300 hover:bg-gray-400 text-gray-800",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        colorClasses[color]
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
