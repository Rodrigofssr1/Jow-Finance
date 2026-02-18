/**
 * JOW Design System - Tema Principal
 * 
 * Exporta tema completo combinando cores, tipografia e espaçamento.
 */

import { darkColors, lightColors, ThemeColors } from './colors';
import { textStyles, fontFamilies, fontSizes, fontWeights } from './typography';
import { spacing, borderRadius, shadows, iconSizes } from './spacing';

export interface Theme {
    colors: ThemeColors;
    typography: {
        styles: typeof textStyles;
        families: typeof fontFamilies;
        sizes: typeof fontSizes;
        weights: typeof fontWeights;
    };
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
    shadows: typeof shadows;
    iconSizes: typeof iconSizes;
}

export const darkTheme: Theme = {
    colors: darkColors,
    typography: {
        styles: textStyles,
        families: fontFamilies,
        sizes: fontSizes,
        weights: fontWeights,
    },
    spacing,
    borderRadius,
    shadows,
    iconSizes,
};

export const lightTheme: Theme = {
    colors: lightColors,
    typography: {
        styles: textStyles,
        families: fontFamilies,
        sizes: fontSizes,
        weights: fontWeights,
    },
    spacing,
    borderRadius,
    shadows,
    iconSizes,
};

// Re-exportar tudo para facilitar imports
export * from './colors';
export * from './typography';
export * from './spacing';
