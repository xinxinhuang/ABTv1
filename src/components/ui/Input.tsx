'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  // Base input styles using theme variables
  'flex w-full border bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-secondary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: [
          'border-[var(--border-primary)]',
          'focus-visible:border-[var(--color-primary-500)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-opacity-20'
        ],
        error: [
          'border-[var(--color-error)]',
          'focus-visible:border-[var(--color-error)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-opacity-20'
        ],
        success: [
          'border-[var(--color-success)]',
          'focus-visible:border-[var(--color-success)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-success)] focus-visible:ring-opacity-20'
        ],
      },
      size: {
        sm: 'h-8 px-3 py-1 text-xs rounded-[var(--radius-sm)]',
        default: 'h-10 px-3 py-2 text-sm rounded-[var(--radius-md)]',
        lg: 'h-12 px-4 py-3 text-base rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
  VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    type,
    label,
    error,
    success,
    leftIcon,
    rightIcon,
    id,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;

    // Determine variant based on error/success state
    const inputVariant = error ? 'error' : success ? 'success' : variant;

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-primary)] block"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            type={inputType}
            className={cn(
              inputVariants({ variant: inputVariant, size }),
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}

          {rightIcon && !isPassword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-[var(--color-error)] flex items-center gap-1">
            <span className="text-xs">⚠</span>
            {error}
          </p>
        )}

        {success && !error && (
          <p className="text-sm text-[var(--color-success)] flex items-center gap-1">
            <span className="text-xs">✓</span>
            {success}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Textarea component
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant,
    size,
    label,
    error,
    success,
    id,
    ...props
  }, ref) => {
    const generatedTextareaId = React.useId();
    const textareaId = id || generatedTextareaId;
    const inputVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[var(--text-primary)] block"
          >
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          className={cn(
            inputVariants({ variant: inputVariant, size }),
            'min-h-[80px] resize-y',
            className
          )}
          ref={ref}
          {...props}
        />

        {error && (
          <p className="text-sm text-[var(--color-error)] flex items-center gap-1">
            <span className="text-xs">⚠</span>
            {error}
          </p>
        )}

        {success && !error && (
          <p className="text-sm text-[var(--color-success)] flex items-center gap-1">
            <span className="text-xs">✓</span>
            {success}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Input, Textarea, inputVariants };