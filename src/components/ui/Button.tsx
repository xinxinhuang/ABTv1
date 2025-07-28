'use client';

import { Loader2 } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles using CSS custom properties
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary: [
          'text-[var(--color-secondary-900)] bg-[var(--color-primary-500)]',
          'hover:bg-[var(--color-primary-600)] hover:shadow-md hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-sm',
          'focus-visible:ring-[var(--color-primary-500)]'
        ],
        secondary: [
          'text-white bg-[var(--color-secondary-600)]',
          'hover:bg-[var(--color-secondary-700)] hover:shadow-md hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-sm',
          'focus-visible:ring-[var(--color-secondary-500)]'
        ],
        outline: [
          'border border-[var(--border-primary)] bg-transparent',
          'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
          'hover:shadow-sm focus-visible:ring-[var(--color-primary-500)]'
        ],
        ghost: [
          'bg-transparent text-[var(--text-primary)]',
          'hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
          'focus-visible:ring-[var(--color-primary-500)]'
        ],
        destructive: [
          'text-white bg-[var(--color-error)]',
          'hover:opacity-90 hover:shadow-md hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-sm',
          'focus-visible:ring-[var(--color-error)]'
        ],
        link: [
          'text-[var(--color-primary-500)] underline-offset-4',
          'hover:underline focus-visible:ring-[var(--color-primary-500)]'
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[var(--radius-sm)]',
        default: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
        lg: 'h-12 px-6 text-base rounded-[var(--radius-md)]',
        xl: 'h-14 px-8 text-lg rounded-[var(--radius-lg)]',
        icon: 'h-10 w-10 rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
