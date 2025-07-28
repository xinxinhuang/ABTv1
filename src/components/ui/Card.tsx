'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const cardVariants = cva(
  // Base card styles using theme variables
  'bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'shadow-[var(--shadow-sm)]',
        elevated: 'shadow-[var(--shadow-md)]',
        interactive: [
          'cursor-pointer shadow-[var(--shadow-sm)]',
          'hover:shadow-[var(--shadow-md)] hover:-translate-y-1',
          'active:translate-y-0 active:shadow-[var(--shadow-sm)]'
        ],
        flat: 'shadow-none',
      },
      size: {
        sm: 'rounded-[var(--radius-sm)]',
        default: 'rounded-[var(--radius-md)]',
        lg: 'rounded-[var(--radius-lg)]',
      },
      padding: {
        none: '',
        sm: 'p-[var(--spacing-sm)]',
        default: 'p-[var(--spacing-md)]',
        lg: 'p-[var(--spacing-lg)]',
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      padding: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, padding }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn('flex flex-col space-y-[var(--spacing-xs)] p-[var(--spacing-md)]', className)} 
      {...props} 
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 
      ref={ref} 
      className={cn(
        'text-[var(--font-size-xl)] font-[var(--font-weight-semibold)] leading-[var(--line-height-tight)] tracking-tight text-[var(--text-primary)]', 
        className
      )} 
      {...props} 
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p 
    ref={ref} 
    className={cn('text-[var(--font-size-sm)] text-[var(--text-secondary)]', className)} 
    {...props} 
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn('p-[var(--spacing-md)] pt-0', className)} 
      {...props} 
    />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn('flex items-center p-[var(--spacing-md)] pt-0', className)} 
      {...props} 
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
