/**
 * JOW Design System - Paleta de Cores
 * 
 * Cores principais do aplicativo com suporte a dark/light mode.
 * Inspirado em uma estética moderna e premium para gestão financeira.
 */

// Cores primárias do brand
export const brandColors = {
    indigo: '#6366F1',      // Cor primária - Ação principal
    emerald: '#34D399',     // Sucesso/Positivo - Receitas, lucros
    amber: '#FBBF24',       // Alerta/Atenção - Avisos
    rose: '#F472B6',        // Destaque/Acento - Elementos especiais
} as const;

// Tons de cinza (Slate)
export const slateColors = {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
} as const;

// Tema Dark (padrão)
export const darkColors = {
    // Backgrounds
    background: slateColors[900],       // #0F172A
    backgroundSecondary: slateColors[800],
    backgroundTertiary: slateColors[700],

    // Surfaces (cards, modais)
    surface: 'rgba(30, 41, 59, 0.8)',   // slate-800 com transparência
    surfaceBorder: 'rgba(71, 85, 105, 0.5)',

    // Textos
    text: slateColors[50],              // #F8FAFC
    textSecondary: slateColors[400],
    textTertiary: slateColors[500],

    // Estados
    primary: brandColors.indigo,
    success: brandColors.emerald,
    warning: brandColors.amber,
    accent: brandColors.rose,
    error: '#EF4444',

    // Drawer
    drawerBackground: slateColors[900],
    drawerActiveItem: 'rgba(99, 102, 241, 0.15)',
    drawerInactiveItem: 'transparent',

    // Componentes
    switchTrackActive: brandColors.indigo,
    switchTrackInactive: slateColors[600],
    divider: slateColors[700],

    // Aliases amigáveis
    card: slateColors[800],
    border: slateColors[700],
} as const;

// Tema Light
export const lightColors = {
    // Backgrounds
    background: slateColors[50],        // #F8FAFC
    backgroundSecondary: slateColors[100],
    backgroundTertiary: slateColors[200],

    // Surfaces (cards, modais)
    surface: 'rgba(255, 255, 255, 0.9)',
    surfaceBorder: 'rgba(203, 213, 225, 0.5)',

    // Textos
    text: slateColors[900],             // #0F172A
    textSecondary: slateColors[600],
    textTertiary: slateColors[500],

    // Estados
    primary: brandColors.indigo,
    success: brandColors.emerald,
    warning: brandColors.amber,
    accent: brandColors.rose,
    error: '#DC2626',

    // Drawer
    drawerBackground: '#FFFFFF',
    drawerActiveItem: 'rgba(99, 102, 241, 0.1)',
    drawerInactiveItem: 'transparent',

    // Componentes
    switchTrackActive: brandColors.indigo,
    switchTrackInactive: slateColors[300],
    divider: slateColors[200],

    // Aliases amigáveis
    card: '#FFFFFF',
    border: slateColors[200],
} as const;

// Interface para cores do tema (permite diferentes valores entre dark/light)
export interface ThemeColors {
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    surface: string;
    surfaceBorder: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
    success: string;
    warning: string;
    accent: string;
    error: string;
    drawerBackground: string;
    drawerActiveItem: string;
    drawerInactiveItem: string;
    switchTrackActive: string;
    switchTrackInactive: string;
    divider: string;

    // Novos
    card: string;
    border: string;
}
