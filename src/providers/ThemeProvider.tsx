'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Primary colors
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  // Secondary colors
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;
  // Card rarity colors
  rarity: {
    common: string;
    uncommon: string;
    rare: string;
    epic: string;
    legendary: string;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface ThemeTypography {
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
    '6xl': string;
  };
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
    extrabold: string;
  };
  lineHeight: {
    tight: string;
    snug: string;
    normal: string;
    relaxed: string;
    loose: string;
  };
}

export interface ThemeRadius {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface ThemeShadows {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  glow: string;
  focus: string;
}

export interface ThemeAnimations {
  duration: {
    fast: string;
    normal: string;
    slow: string;
    slower: string;
  };
  easing: {
    ease: string;
    easeOut: string;
    easeIn: string;
    easeInOut: string;
  };
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  radius: ThemeRadius;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
}

// Default theme configuration
const createTheme = (mode: 'light' | 'dark'): Theme => ({
  mode,
  colors: {
    primary: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#f4d03f',
      600: '#e3c832',
      700: '#d4b429',
      800: '#b8941f',
      900: '#997a18',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    rarity: {
      common: '#94a3b8',
      uncommon: '#64748b',
      rare: '#f4d03f',
      epic: '#ea580c',
      legendary: '#facc15',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
  },
  radius: {
    none: '0px',
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(244, 208, 63, 0.3)',
    focus: '0 0 0 2px rgba(244, 208, 63, 0.5)',
  },
  animations: {
    duration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      ease: 'ease',
      easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
});

// Theme context
interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'tcg-theme',
}: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as ThemeMode;
    if (stored) {
      setThemeModeState(stored);
    }
  }, [storageKey]);

  // Handle system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (themeMode === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    handleChange(); // Initial check

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // Resolve theme based on mode
  useEffect(() => {
    if (themeMode === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
    } else {
      setResolvedTheme(themeMode);
    }
  }, [themeMode]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const theme = createTheme(resolvedTheme);

    // Apply CSS custom properties
    root.style.setProperty('--theme-mode', resolvedTheme);
    
    // Primary colors
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });

    // Secondary colors
    Object.entries(theme.colors.secondary).forEach(([key, value]) => {
      root.style.setProperty(`--color-secondary-${key}`, value);
    });

    // Semantic colors
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);
    root.style.setProperty('--color-info', theme.colors.info);

    // Rarity colors
    Object.entries(theme.colors.rarity).forEach(([key, value]) => {
      root.style.setProperty(`--color-rarity-${key}`, value);
    });

    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    // Typography
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value);
    });

    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value);
    });

    // Border radius
    Object.entries(theme.radius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    // Shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Animations
    Object.entries(theme.animations.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, value);
    });

    Object.entries(theme.animations.easing).forEach(([key, value]) => {
      root.style.setProperty(`--easing-${key}`, value);
    });

    // Update data attribute for CSS selectors
    root.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(storageKey, mode);
  };

  const toggleTheme = () => {
    setThemeMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const theme = createTheme(resolvedTheme);

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Utility functions for accessing theme values
export const useThemeValue = () => {
  const { theme } = useTheme();
  return {
    color: (path: string) => {
      const keys = path.split('.');
      let value: any = theme.colors;
      for (const key of keys) {
        value = value[key];
      }
      return value;
    },
    spacing: (key: keyof ThemeSpacing) => theme.spacing[key],
    fontSize: (key: keyof ThemeTypography['fontSize']) => theme.typography.fontSize[key],
    fontWeight: (key: keyof ThemeTypography['fontWeight']) => theme.typography.fontWeight[key],
    radius: (key: keyof ThemeRadius) => theme.radius[key],
    shadow: (key: keyof ThemeShadows) => theme.shadows[key],
  };
};