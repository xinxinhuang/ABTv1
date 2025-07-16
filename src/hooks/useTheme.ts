// Re-export the hook from ThemeProvider for convenience
export { useTheme, useThemeValue } from '@/providers/ThemeProvider';
import { useTheme } from '@/providers/ThemeProvider';

// Additional theme utilities
export const useThemeClasses = () => {
  const { theme } = useTheme();
  
  return {
    // Background classes
    bg: {
      primary: `bg-[${theme.colors.primary[500]}]`,
      secondary: `bg-[${theme.colors.secondary[500]}]`,
      success: `bg-[${theme.colors.success}]`,
      warning: `bg-[${theme.colors.warning}]`,
      error: `bg-[${theme.colors.error}]`,
    },
    
    // Text classes
    text: {
      primary: `text-[${theme.colors.primary[500]}]`,
      secondary: `text-[${theme.colors.secondary[500]}]`,
      success: `text-[${theme.colors.success}]`,
      warning: `text-[${theme.colors.warning}]`,
      error: `text-[${theme.colors.error}]`,
    },
    
    // Border classes
    border: {
      primary: `border-[${theme.colors.primary[500]}]`,
      secondary: `border-[${theme.colors.secondary[500]}]`,
    },
    
    // Rarity classes
    rarity: {
      common: `text-[${theme.colors.rarity.common}]`,
      uncommon: `text-[${theme.colors.rarity.uncommon}]`,
      rare: `text-[${theme.colors.rarity.rare}]`,
      epic: `text-[${theme.colors.rarity.epic}]`,
      legendary: `text-[${theme.colors.rarity.legendary}]`,
    },
  };
};

// CSS-in-JS style objects for components that need them
export const useThemeStyles = () => {
  const { theme } = useTheme();
  
  return {
    // Card styles
    card: {
      base: {
        backgroundColor: theme.mode === 'dark' ? theme.colors.secondary[800] : '#ffffff',
        borderColor: theme.mode === 'dark' ? theme.colors.secondary[700] : theme.colors.secondary[200],
        color: theme.mode === 'dark' ? '#ffffff' : theme.colors.secondary[900],
        borderRadius: theme.radius.md,
        boxShadow: theme.shadows.sm,
        transition: `all ${theme.animations.duration.normal} ${theme.animations.easing.easeOut}`,
      },
      hover: {
        boxShadow: theme.shadows.md,
        transform: 'translateY(-2px)',
      },
    },
    
    // Button styles
    button: {
      primary: {
        backgroundColor: theme.colors.primary[500],
        color: theme.colors.secondary[900],
        borderRadius: theme.radius.md,
        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        transition: `all ${theme.animations.duration.normal} ${theme.animations.easing.easeOut}`,
      },
      secondary: {
        backgroundColor: theme.colors.secondary[600],
        color: '#ffffff',
        borderRadius: theme.radius.md,
        padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        transition: `all ${theme.animations.duration.normal} ${theme.animations.easing.easeOut}`,
      },
    },
    
    // Rarity styles for cards
    rarity: {
      common: {
        borderColor: theme.colors.rarity.common,
        boxShadow: `0 0 10px ${theme.colors.rarity.common}33`,
      },
      uncommon: {
        borderColor: theme.colors.rarity.uncommon,
        boxShadow: `0 0 10px ${theme.colors.rarity.uncommon}33`,
      },
      rare: {
        borderColor: theme.colors.rarity.rare,
        boxShadow: `0 0 15px ${theme.colors.rarity.rare}44`,
      },
      epic: {
        borderColor: theme.colors.rarity.epic,
        boxShadow: `0 0 20px ${theme.colors.rarity.epic}55`,
      },
      legendary: {
        borderColor: theme.colors.rarity.legendary,
        boxShadow: `0 0 25px ${theme.colors.rarity.legendary}66`,
      },
    },
  };
};