/**
 * JOW Design System - Espaçamento
 * 
 * Sistema de espaçamento baseado em múltiplos de 4px.
 * Garante consistência visual em todo o aplicativo.
 */

// Escala de espaçamento (múltiplos de 4)
export const spacing = {
    0: 0,
    0.5: 2,
    1: 4,
    1.5: 6,
    2: 8,
    2.5: 10,
    3: 12,
    3.5: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    20: 80,
    24: 96,
    28: 112,
    32: 128,
} as const;

// Border radius
export const borderRadius = {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,   // Padrão para cards
    '3xl': 32,
    full: 9999,
} as const;

import { Platform } from 'react-native';

const createShadow = (elevation: number, shadowOpacity: number, shadowRadius: number, height: number, boxShadow: string) => {
    return Platform.select({
        web: {
            boxShadow,
        },
        default: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height },
            shadowOpacity,
            shadowRadius,
            elevation,
        },
    });
};

// Shadows (box-shadow em formato React Native)
export const shadows = {
    sm: createShadow(1, 0.05, 2, 1, '0px 1px 2px rgba(0, 0, 0, 0.05)'),
    base: createShadow(2, 0.1, 4, 2, '0px 2px 4px rgba(0, 0, 0, 0.1)'),
    md: createShadow(4, 0.15, 8, 4, '0px 4px 8px rgba(0, 0, 0, 0.15)'),
    lg: createShadow(8, 0.2, 16, 8, '0px 8px 16px rgba(0, 0, 0, 0.2)'),
    xl: createShadow(12, 0.25, 24, 12, '0px 12px 24px rgba(0, 0, 0, 0.25)'),
} as const;

// Tamanhos de ícones
export const iconSizes = {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
