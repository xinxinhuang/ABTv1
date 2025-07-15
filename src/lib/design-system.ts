// Design System Configuration - Mantine UI Inspired
export const designSystem = {
  // Color palette - Mantine UI inspired yellow/grey/white
  colors: {
    primary: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#f4d03f',  // Mantine's signature yellow
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
      500: '#64748b',  // Mantine's grey
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    accent: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    // Mantine UI specific colors
    mantine: {
      yellow: '#f4d03f',
      yellowLight: '#fef9c3',
      yellowDark: '#d4b429',
      grey: '#64748b',
      greyLight: '#f1f5f9',
      greyDark: '#334155',
      white: '#ffffff',
      black: '#1e293b',
      border: '#e2e8f0',
      background: '#f8fafc',
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706',
    },
    danger: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626',
    },
    neutral: {
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
    }
  },

  // Typography scale - Mantine UI inspired
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
      extrabold: '800',  // Added for Mantine-style headers
    },
    lineHeight: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    }
  },

  // Spacing scale - Mantine UI inspired
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
    '5xl': '8rem',
    
    // Mantine specific spacings
    mantine: {
      xs: '0.625rem',    // 10px
      sm: '0.75rem',     // 12px
      md: '1rem',        // 16px
      lg: '1.25rem',     // 20px
      xl: '2rem',        // 32px
    }
  },

  // Border radius - Mantine UI style
  borderRadius: {
    none: '0px',
    xs: '0.125rem',    // 2px
    sm: '0.25rem',     // 4px
    md: '0.375rem',    // 6px - Mantine default
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px',
  },

  // Shadows - Mantine UI style
  boxShadow: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    
    // Mantine specific shadows
    mantine: {
      button: '0 1px 3px rgba(0, 0, 0, 0.05)',
      card: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      hover: '0 4px 12px rgba(0, 0, 0, 0.15)',
      focus: '0 0 0 2px rgba(244, 208, 63, 0.5)',
    },
    
    glow: '0 0 20px rgba(244, 208, 63, 0.3)',
  },

  // Layout breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index scale
  zIndex: {
    hide: '-1',
    auto: 'auto',
    base: '0',
    docked: '10',
    dropdown: '1000',
    sticky: '1100',
    banner: '1200',
    overlay: '1300',
    modal: '1400',
    popover: '1500',
    skipLink: '1600',
    toast: '1700',
    tooltip: '1800',
  },

  // Animation durations - Mantine UI style
  animation: {
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
    }
  }
} as const;

// Component-specific design tokens - Mantine UI inspired
export const components = {
  // Navigation - Mantine style
  navigation: {
    height: '3.5rem',
    background: 'rgba(255, 255, 255, 0.95)',
    backgroundDark: 'rgba(30, 41, 59, 0.95)',
    border: 'rgba(226, 232, 240, 0.8)',
    borderDark: 'rgba(148, 163, 184, 0.2)',
    blur: 'blur(8px)',
    shadow: designSystem.boxShadow.mantine.card,
  },

  // Cards - Mantine style
  card: {
    background: 'white',
    backgroundDark: 'rgb(30, 41, 59)',
    border: 'rgb(226, 232, 240)',
    borderDark: 'rgb(71, 85, 105)',
    hover: 'rgb(248, 250, 252)',
    hoverDark: 'rgb(51, 65, 85)',
    shadow: designSystem.boxShadow.mantine.card,
    hoverShadow: designSystem.boxShadow.mantine.hover,
  },

  // Buttons - Mantine style
  button: {
    primary: {
      background: designSystem.colors.mantine.yellow,
      backgroundHover: designSystem.colors.mantine.yellowDark,
      text: designSystem.colors.mantine.black,
      shadow: designSystem.boxShadow.mantine.button,
    },
    secondary: {
      background: designSystem.colors.mantine.grey,
      backgroundHover: designSystem.colors.secondary[600],
      text: 'white',
      shadow: designSystem.boxShadow.mantine.button,
    },
    outline: {
      background: 'transparent',
      border: designSystem.colors.mantine.border,
      text: designSystem.colors.mantine.grey,
      backgroundHover: designSystem.colors.mantine.greyLight,
    },
    ghost: {
      background: 'transparent',
      backgroundHover: designSystem.colors.mantine.greyLight,
      text: designSystem.colors.mantine.grey,
    },
  },

  // Game specific - Updated for Mantine style
  game: {
    cardRarity: {
      common: designSystem.colors.neutral[400],
      uncommon: designSystem.colors.secondary[500],
      rare: designSystem.colors.primary[500],
      epic: designSystem.colors.accent[500],
      legendary: designSystem.colors.primary[400],
    },
    battle: {
      player: designSystem.colors.primary[500],
      opponent: designSystem.colors.accent[500],
      neutral: designSystem.colors.neutral[500],
    }
  }
} as const;

// Utility functions
export const getColorValue = (colorPath: string) => {
  const paths = colorPath.split('.');
  let value: any = designSystem.colors;
  
  for (const path of paths) {
    value = value[path];
  }
  
  return value;
};

export const getSpacingValue = (spacing: keyof typeof designSystem.spacing) => {
  return designSystem.spacing[spacing];
};

export const getFontSize = (size: keyof typeof designSystem.typography.fontSize) => {
  return designSystem.typography.fontSize[size];
};

// Mantine-specific utility functions
export const getMantineColor = (color: keyof typeof designSystem.colors.mantine) => {
  return designSystem.colors.mantine[color];
};

export const getMantineSpacing = (spacing: keyof typeof designSystem.spacing.mantine) => {
  return designSystem.spacing.mantine[spacing];
};

export const getMantineShadow = (shadow: keyof typeof designSystem.boxShadow.mantine) => {
  return designSystem.boxShadow.mantine[shadow];
}; 