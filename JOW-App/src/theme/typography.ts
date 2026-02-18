/**
 * JOW Design System - Tipografia
 * 
 * Sistema de fontes com três famílias:
 * - Space Grotesk: Títulos e headings
 * - Inter: Corpo de texto
 * - JetBrains Mono: Números e valores monetários
 */

// Famílias de fontes
export const fontFamilies = {
    heading: 'SpaceGrotesk',
    body: 'Inter',
    mono: 'JetBrainsMono',
} as const;

// Pesos das fontes
export const fontWeights = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
} as const;

// Tamanhos de fonte (em pixels)
export const fontSizes = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
} as const;

// Altura de linha
export const lineHeights = {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
} as const;

// Estilos de texto pré-definidos
export const textStyles = {
    // Headings (Space Grotesk)
    h1: {
        fontFamily: fontFamilies.heading,
        fontSize: fontSizes['4xl'],
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes['4xl'] * lineHeights.tight,
    },
    h2: {
        fontFamily: fontFamilies.heading,
        fontSize: fontSizes['3xl'],
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes['3xl'] * lineHeights.tight,
    },
    h3: {
        fontFamily: fontFamilies.heading,
        fontSize: fontSizes['2xl'],
        fontWeight: fontWeights.semibold,
        lineHeight: fontSizes['2xl'] * lineHeights.tight,
    },
    h4: {
        fontFamily: fontFamilies.heading,
        fontSize: fontSizes.xl,
        fontWeight: fontWeights.semibold,
        lineHeight: fontSizes.xl * lineHeights.tight,
    },

    // Body text (Inter)
    body: {
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.base,
        fontWeight: fontWeights.regular,
        lineHeight: fontSizes.base * lineHeights.normal,
    },
    bodyMedium: {
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.base,
        fontWeight: fontWeights.medium,
        lineHeight: fontSizes.base * lineHeights.normal,
    },
    bodySmall: {
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.regular,
        lineHeight: fontSizes.sm * lineHeights.normal,
    },
    caption: {
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.regular,
        lineHeight: fontSizes.xs * lineHeights.normal,
    },
    label: {
        fontFamily: fontFamilies.body,
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
        lineHeight: fontSizes.sm * lineHeights.tight,
    },

    // Mono text (JetBrains Mono) - Para valores e números
    mono: {
        fontFamily: fontFamilies.mono,
        fontSize: fontSizes.base,
        fontWeight: fontWeights.regular,
    },
    monoLarge: {
        fontFamily: fontFamilies.mono,
        fontSize: fontSizes['2xl'],
        fontWeight: fontWeights.semibold,
    },
    monoSmall: {
        fontFamily: fontFamilies.mono,
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.regular,
    },
} as const;

export type TextStyleKey = keyof typeof textStyles;
