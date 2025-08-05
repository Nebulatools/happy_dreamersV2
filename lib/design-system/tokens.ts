/**
 * Sistema de Design Tokens para Happy Dreamers
 * Centraliza todos los valores de diseño para mantener consistencia
 */

// ============================================
// COLORES
// ============================================

export const colors = {
  // Colores Base
  white: '#FFFFFF',
  black: '#000000',
  
  // Grises (escala)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Azules (marca principal)
  blue: {
    50: '#F5F9FF',   // bg-input
    100: '#EDE9FE',  // secondary
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',  // primary
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  
  // Colores de marca específicos
  brand: {
    primary: '#3B82F6',      // --primary
    secondary: '#4A90E2',    // Azul secundario Figma
    darkBlue: '#2553A1',     // Azul oscuro Figma
    lightBlue: '#67C5FF',    // Para gradientes
    mediumBlue: '#628BE6',   // Para gradientes
    purple: '#EAE8FE',       // Sidebar gradient start
    skyBlue: '#6AAAFA',      // Sidebar gradient end
  },
  
  // Colores para eventos de sueño
  sleep: {
    bedtime: '#7DBFE2',      // Dormir/Acostarse
    nap: '#F5A623',          // Siesta
    morningWake: '#FFD700',  // Despertar matutino
    nightWake: '#FF9194',    // Despertar nocturno
  },
  
  // Colores para gráficos
  chart: {
    primary: '#8884d8',
    secondary: '#82ca9d',
    tertiary: '#ffc658',
    quaternary: '#ff7300',
    quinary: '#0088FE',
    senary: '#00C49F',
    danger: '#ff6b6b',
  },
  
  // Colores para estados de ánimo
  mood: {
    happy: '#FFBB28',
    calm: '#00C49F',
    tired: '#0088FE',
    irritable: '#FF8042',
  },
  
  // Estados
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

// ============================================
// ESPACIADO
// ============================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================
// TIPOGRAFÍA
// ============================================

export const typography = {
  // Familias de fuente
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
    mono: ['Fira Code', 'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', 'monospace'],
  },
  
  // Tamaños de fuente
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],// 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    '5xl': ['3rem', { lineHeight: '1' }],         // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
    '7xl': ['4.5rem', { lineHeight: '1' }],       // 72px
    '8xl': ['6rem', { lineHeight: '1' }],         // 96px
    '9xl': ['8rem', { lineHeight: '1' }],         // 128px
  },
  
  // Pesos de fuente
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  // Alturas de línea
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  // Espaciado entre letras
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================
// BORDES Y SOMBRAS
// ============================================

export const borders = {
  // Radio de borde
  radius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px - estándar Happy Dreamers
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  // Ancho de borde
  width: {
    0: '0',
    1: '1px',
    2: '2px',
    4: '4px',
    8: '8px',
  },
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  auto: 'auto',
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================
// ANIMACIONES
// ============================================

export const animations = {
  // Duraciones
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  
  // Funciones de transición
  timing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================
// TOKENS ESPECÍFICOS DE HAPPY DREAMERS
// ============================================

export const happyDreamersTokens = {
  // Gradientes oficiales
  gradients: {
    sidebar: `linear-gradient(180deg, ${colors.brand.purple} 0%, ${colors.brand.skyBlue} 100%)`,
    button: `linear-gradient(90deg, ${colors.brand.mediumBlue} 0%, ${colors.brand.lightBlue} 100%)`,
    primary: `linear-gradient(90deg, ${colors.brand.primary} 0%, ${colors.brand.lightBlue} 100%)`,
  },
  
  // Recomendaciones de sueño por edad
  sleepRecommendations: {
    infant: { min: 14, max: 17 },     // 0-1 año
    toddler: { min: 11, max: 14 },    // 1-3 años
    preschool: { min: 10, max: 13 },  // 3-5 años
    school: { min: 9, max: 11 },      // 6-13 años
  },
  
  // Dimensiones estándar para gráficos
  chartDimensions: {
    small: { width: 250, height: 200 },
    medium: { width: 350, height: 300 },
    large: { width: 500, height: 400 },
    full: { width: '100%', height: 400 },
  },
  
  // Configuración de componentes
  components: {
    card: {
      padding: spacing[6],
      borderRadius: borders.radius.xl,
      shadow: shadows.md,
    },
    button: {
      paddingX: spacing[4],
      paddingY: spacing[2],
      borderRadius: borders.radius.lg,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
    },
    input: {
      paddingX: spacing[3],
      paddingY: spacing[2],
      borderRadius: borders.radius.lg,
      borderColor: colors.gray[300],
      focusBorderColor: colors.brand.primary,
      backgroundColor: colors.blue[50],
    },
  },
} as const;

// ============================================
// HELPERS
// ============================================

// Helper para obtener colores de eventos
export const getEventColor = (eventType: string): string => {
  const eventColors = {
    sleep: colors.sleep.bedtime,
    nap: colors.sleep.nap,
    wake: colors.sleep.morningWake,
    nightWake: colors.sleep.nightWake,
    bedtime: colors.sleep.bedtime,
    activity: colors.chart.tertiary,
    meal: colors.chart.quinary,
    play: colors.chart.quaternary,
  };
  
  return eventColors[eventType] || colors.gray[400];
};

// Helper para obtener color de estado de ánimo
export const getMoodColor = (mood: string): string => {
  const moodColors = {
    feliz: colors.mood.happy,
    tranquilo: colors.mood.calm,
    cansado: colors.mood.tired,
    irritable: colors.mood.irritable,
  };
  
  return moodColors[mood] || colors.gray[400];
};

// Helper para obtener color de gráfico por índice
export const getChartColor = (index: number): string => {
  const chartColors = [
    colors.chart.primary,
    colors.chart.secondary,
    colors.chart.tertiary,
    colors.chart.quaternary,
    colors.chart.quinary,
    colors.chart.senary,
  ];
  
  return chartColors[index % chartColors.length];
};

// Type exports para TypeScript
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
export type Borders = typeof borders;
export type Shadows = typeof shadows;
export type Breakpoints = typeof breakpoints;
export type ZIndex = typeof zIndex;
export type Animations = typeof animations;
export type HappyDreamersTokens = typeof happyDreamersTokens;