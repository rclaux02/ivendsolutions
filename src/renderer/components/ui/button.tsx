import React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "cart" | "buy"
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = "default", 
  children, 
  className = "",
  ...props 
}) => {
  const baseStyles = "px-4 rounded-[15px] font-medium transition-colors text-center flex items-center justify-center"
  
  const variantStyles = {
    default: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    cart: "bg-white border border-gray-300 hover:bg-gray-100 text-black",
    buy: "bg-blue-600 hover:bg-blue-700 text-white"
  }
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
} 