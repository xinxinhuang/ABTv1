'use client';

import * as React from 'react';
import { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from "framer-motion";


// Bronze/Silver/Gold color scheme
const RARITY_COLORS = {
  bronze: {
    bg: "#cd7f32",
    dark: "#8b4513",
    light: "#daa520",
    track: "#4a4a4a" // Much darker grey for better contrast
  },
  silver: {
    bg: "#c0c0c0",
    dark: "#696969",
    light: "#e5e5e5",
    track: "#2d2d2d" // Very dark grey for contrast against silver
  },
  gold: {
    bg: "#ffd700",
    dark: "#b8860b",
    light: "#fff8dc",
    track: "#5a5a5a" // Dark grey for contrast against gold
  }
};

// Helper function to interpolate between two hex colors
const interpolateColor = (color1: string, color2: string, ratio: number): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const HandDrawnSmileIcon = (props: any) => (
  <motion.svg
    width="100%"
    height="100%"
    viewBox="0 0 100 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <motion.path
      d="M10 30 Q50 70 90 30"
      strokeWidth="12"
      strokeLinecap="round"
    />
  </motion.svg>
);

export interface TimeFeedbackSliderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  onValueChange: (value: number) => void;
  packType: 'humanoid' | 'weapon';
  onColorChange?: (colors: { bg: string; dark: string; light: string; track: string }) => void;
}

const TimeFeedbackSlider = React.forwardRef<HTMLDivElement, TimeFeedbackSliderProps>(
  ({ className, value, onValueChange, packType, onColorChange, ...props }, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    const transition = { type: "spring" as const, stiffness: 300, damping: 30 };

    const packEmoji = packType === 'humanoid' ? '🤖' : '⚔️';
    
    // Calculate gold chance based on actual value (linear interpolation from 1% to 20%)
    const getGoldChance = (hours: number) => {
      const percentage = Math.round(1 + ((hours - 4) / (24 - 4)) * 19);
      return `${percentage}%`;
    };

    // Interpolate between bronze, silver, and gold colors
    const getColorForHours = (hours: number) => {
      const normalizedHours = (hours - 4) / (24 - 4); // 0 to 1
      
      if (normalizedHours <= 0.5) {
        // Bronze to Silver (0 to 0.5)
        const ratio = normalizedHours * 2;
        return {
          bg: interpolateColor(RARITY_COLORS.bronze.bg, RARITY_COLORS.silver.bg, ratio),
          dark: interpolateColor(RARITY_COLORS.bronze.dark, RARITY_COLORS.silver.dark, ratio),
          light: interpolateColor(RARITY_COLORS.bronze.light, RARITY_COLORS.silver.light, ratio),
          track: interpolateColor(RARITY_COLORS.bronze.track, RARITY_COLORS.silver.track, ratio)
        };
      } else {
        // Silver to Gold (0.5 to 1)
        const ratio = (normalizedHours - 0.5) * 2;
        return {
          bg: interpolateColor(RARITY_COLORS.silver.bg, RARITY_COLORS.gold.bg, ratio),
          dark: interpolateColor(RARITY_COLORS.silver.dark, RARITY_COLORS.gold.dark, ratio),
          light: interpolateColor(RARITY_COLORS.silver.light, RARITY_COLORS.gold.light, ratio),
          track: interpolateColor(RARITY_COLORS.silver.track, RARITY_COLORS.gold.track, ratio)
        };
      }
    };

    // Get current colors based on value (memoized to prevent infinite re-renders)
    const currentColors = useMemo(() => getColorForHours(value), [value]);
    
    // Notify parent component of color changes
    React.useEffect(() => {
      if (onColorChange) {
        onColorChange(currentColors);
      }
    }, [value, onColorChange, currentColors]);

    // Calculate eye properties based on hours
    const getEyeProperties = (hours: number) => {
      const normalizedHours = (hours - 4) / (24 - 4); // 0 to 1
      
      if (normalizedHours <= 0.5) {
        // Bronze to Silver transition
        const ratio = normalizedHours * 2;
        return {
          width: 20 + (30 - 20) * ratio,
          height: 20 - (20 - 8) * ratio,
          borderRadius: normalizedHours < 0.25 ? "100%" : "12px"
        };
      } else {
        // Silver to Gold transition
        const ratio = (normalizedHours - 0.5) * 2;
        return {
          width: 30 + (40 - 30) * ratio,
          height: 8 + (40 - 8) * ratio,
          borderRadius: ratio > 0.5 ? "100%" : "12px"
        };
      }
    };

    const eyeProps = getEyeProperties(value);

    // Calculate smile rotation (frown to smile)
    const smileRotation = 180 - (value - 4) / (24 - 4) * 180;

    // Calculate slider position (0% to 100%)
    const sliderPosition = ((value - 4) / (24 - 4)) * 100;

    const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
      if (!sliderRef.current) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newValue = Math.round(4 + percentage * (24 - 4));
      onValueChange(newValue);
    }, [onValueChange]);

    // Handle mouse/touch events for dragging
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      setIsDragging(true);
      handlePointerMove(e);
    }, [handlePointerMove]);

    const handlePointerUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    // Add global event listeners for drag
    React.useEffect(() => {
      if (isDragging) {
        const handleGlobalPointerMove = (e: PointerEvent) => handlePointerMove(e);
        const handleGlobalPointerUp = () => handlePointerUp();
        
        document.addEventListener('pointermove', handleGlobalPointerMove);
        document.addEventListener('pointerup', handleGlobalPointerUp);
        
        return () => {
          document.removeEventListener('pointermove', handleGlobalPointerMove);
          document.removeEventListener('pointerup', handleGlobalPointerUp);
        };
      }
    }, [isDragging, handlePointerMove, handlePointerUp]);

    // Get rarity text based on hours
    const getRarityText = (hours: number) => {
      const normalizedHours = (hours - 4) / (24 - 4);
      if (normalizedHours <= 0.33) return "BRONZE";
      if (normalizedHours <= 0.66) return "SILVER";
      return "GOLD";
    };

    return (
      <motion.div
        ref={ref}
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-lg ${className}`}
        style={{ minHeight: '120px' }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg text-gray-700">
              {packEmoji}
            </div>
            <span className="text-sm font-medium text-gray-700">
              {value} hours ({getGoldChance(value)} gold chance)
            </span>
          </div>
          
          <div className="flex h-[40px] flex-col items-center justify-center mb-2">
            <div className="flex items-center justify-center gap-2">
              <motion.div
                animate={{
                  width: eyeProps.width,
                  height: eyeProps.height,
                  borderRadius: eyeProps.borderRadius,
                  backgroundColor: "#374151", // gray-700
                }}
                transition={transition}
              />
              <motion.div
                animate={{
                  width: eyeProps.width,
                  height: eyeProps.height,
                  borderRadius: eyeProps.borderRadius,
                  backgroundColor: "#374151", // gray-700
                }}
                transition={transition}
              />
            </div>
            <motion.div
              className="flex h-4 w-4 items-center justify-center"
              animate={{ rotate: smileRotation }}
              transition={transition}
            >
              <HandDrawnSmileIcon
                animate={{ stroke: "#374151" }} // gray-700
                transition={transition}
              />
            </motion.div>
          </div>
          
          <div className="flex w-full items-center justify-center pb-2">
            <h1 className="text-lg font-black text-gray-700">
              {getRarityText(value)}
            </h1>
          </div>
          
          <div className="w-full max-w-[160px]">
            <div 
              ref={sliderRef}
              className="relative flex w-full items-center justify-center h-6 cursor-pointer"
              onPointerDown={handlePointerDown}
            >
              <motion.div
                className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full"
                animate={{ backgroundColor: currentColors.track }}
                transition={transition}
              />
                              <motion.div
                  className="absolute z-[3] flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full p-1 cursor-grab active:cursor-grabbing"
                  animate={{
                    left: `${sliderPosition}%`,
                    backgroundColor: "#374151", // gray-700
                    scale: isDragging ? 1.2 : 1
                  }}
                  transition={transition}
                >
                  <HandDrawnSmileIcon
                    animate={{ stroke: currentColors.light }}
                    transition={transition}
                  />
                </motion.div>
            </div>
                         <div className="flex w-full items-center justify-between pt-2">
               <span className="text-xs font-medium text-gray-700">4h</span>
               <span className="text-xs font-medium text-gray-700">14h</span>
               <span className="text-xs font-medium text-gray-700">24h</span>
             </div>
          </div>
        </div>
      </motion.div>
    );
  }
);

TimeFeedbackSlider.displayName = "TimeFeedbackSlider";

export default TimeFeedbackSlider; 