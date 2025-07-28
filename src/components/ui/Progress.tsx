import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as React from 'react';

import { cn } from '@/lib/utils/cn';

export interface ProgressProps 
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  value?: number;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ 
  className, 
  value = 0, 
  indicatorClassName, 
  ...props 
}, ref) => {
  // Ensure value is between 0 and 100
  const progressValue = Math.max(0, Math.min(100, value));
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1 bg-primary transition-all',
          indicatorClassName
        )}
        style={{ 
          transform: `translateX(-${100 - progressValue}%)`,
          transition: 'transform 660ms cubic-bezier(0.65, 0, 0.35, 1)'
        }}
      />
    </ProgressPrimitive.Root>
  );
});

Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

export default Progress;
