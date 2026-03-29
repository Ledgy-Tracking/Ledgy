// Design Token System - Unified styling extracted from auth pages
// Ensures consistency between authentication flow and main application

export const designTokens = {
  // Background system matching auth pages
  backgrounds: {
    // Main app background - pure dark like auth
    primary: 'bg-zinc-950',
    // Panel backgrounds - glassmorphism effect
    panel: 'bg-zinc-900/50 backdrop-blur-xl',
    // Solid panel alternative
    solid: 'bg-zinc-900',
    // Background effects for ambiance
    gradient: {
      emerald: 'bg-emerald-500/10 rounded-full blur-[120px]',
      blue: 'bg-blue-500/10 rounded-full blur-[100px]',
    },
  },
  
  // Color system
  colors: {
    // Primary accent - emerald system from auth
    accent: {
      primary: 'emerald-500',
      light: 'emerald-400', 
      surface: 'emerald-500/20',
      ring: 'emerald-500/30',
      subtle: 'emerald-500/10',
    },
    // Text hierarchy
    text: {
      primary: 'text-white',
      secondary: 'text-zinc-400',
      tertiary: 'text-zinc-500',
      accent: 'text-emerald-400',
    },
    // Interactive states
    interactive: {
      hover: 'hover:bg-zinc-800/50',
      active: 'bg-zinc-800',
      focus: 'ring-emerald-500/50',
    },
  },
  
  // Border system matching auth
  borders: {
    subtle: 'border-white/5',
    secondary: 'border-white/10', 
    focus: 'border-emerald-500/50',
    accent: 'ring-1 ring-emerald-500/30',
  },
  
  // Effects from auth pages
  effects: {
    glass: 'backdrop-blur-xl',
    shadow: 'shadow-2xl',
    shadowInner: 'shadow-inner',
    blur: 'blur-[120px]',
  },
  
  // Spacing and layout
  layout: {
    panel: 'p-8 sm:p-12',
    content: 'max-w-2xl',
    radius: 'rounded-3xl',
    radiusLg: 'rounded-2xl',
    radiusMd: 'rounded-lg',
  },
  
  // Typography matching auth
  typography: {
    heading: 'text-3xl sm:text-4xl font-semibold tracking-tight',
    subheading: 'text-lg leading-relaxed',
    body: 'text-sm font-medium',
    caption: 'text-xs font-medium',
  },
  
  // Animation system
  animations: {
    fadeIn: 'animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out',
    transition: 'transition-all duration-300 ease-in-out',
  },
} as const;

// Helper functions for common patterns
export const glassPanel = `${designTokens.backgrounds.panel} ${designTokens.borders.subtle} ${designTokens.layout.radius} ${designTokens.effects.shadow}`;

export const modernButton = `${designTokens.colors.accent.surface} ${designTokens.colors.text.accent} ${designTokens.layout.radiusLg} ${designTokens.borders.accent}`;

export const sidebarButton = `${designTokens.colors.interactive.hover} ${designTokens.layout.radiusMd} ${designTokens.animations.transition}`;