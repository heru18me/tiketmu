import { useId, type InputHTMLAttributes } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  name?: string
  error?: string
  /** Hasil `register('field')` dari React Hook Form */
  register?: UseFormRegisterReturn
}

export default function Input({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  register,
  className = '',
  id,
  ...rest
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-500 ${
          error
            ? 'border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200'
        } ${className}`}
        {...register}
        {...rest}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
