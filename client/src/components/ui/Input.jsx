import React from 'react';
import { motion } from 'framer-motion';

const Input = React.forwardRef(({ 
  className = '', 
  type = 'text', 
  error = false,
  label,
  helperText,
  ...props 
}, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <motion.input
        ref={ref}
        type={type}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900
          transition-all duration-200 ease-in-out
          placeholder-gray-400 dark:placeholder-gray-500
          disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400
          ${error 
            ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500 dark:border-red-600 dark:text-red-100' 
            : 'border-gray-300 text-gray-900 focus:border-indigo-500 dark:border-gray-600 dark:text-gray-100'
          }
          bg-white dark:bg-gray-800
          ${className}
        `}
        whileFocus={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        {...props}
      />
      {helperText && (
        <p className={`text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;