import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={`
          w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-accent-500'
          }
          ${className}
        `}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export const Textarea = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  rows = 3,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 resize-none
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-accent-500'
          }
          ${className}
        `}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export const Select = forwardRef(({
  label,
  error,
  helperText,
  className = '',
  options = [],
  placeholder = 'Select an option',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full px-3 py-2 border rounded-lg text-gray-900
          focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-accent-500'
          }
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Input
