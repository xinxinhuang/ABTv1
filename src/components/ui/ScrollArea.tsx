'use client';

import * as React from 'react';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  maxHeight?: string;
  orientation?: 'vertical' | 'horizontal';
}

// A simple ScrollArea component that uses native scrolling
export function ScrollArea({
  children,
  className = '',
  maxHeight = '400px',
  orientation = 'vertical',
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        overflowY: orientation === 'vertical' ? 'auto' : 'hidden',
        overflowX: orientation === 'horizontal' ? 'auto' : 'hidden',
        maxHeight: orientation === 'vertical' ? maxHeight : 'auto',
        maxWidth: orientation === 'horizontal' ? maxHeight : 'auto',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
