/**
 * JOW - Componente Card
 * 
 * Card com efeito glassmorphism simulado (opacity + backgroundColor).
 * Border-radius de 24px conforme design system.
 * 
 * NOTA: BlurView nativo removido para compatibilidade.
 * Pode ser adicionado na Fase 2 se necessário.
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius, spacing, shadows } from '../theme';

interface CardProps {
    children: ReactNode;
    style?: ViewStyle;
    /** Intensidade do efeito (0-100) - afeta opacidade do background */
    intensity?: number;
}

export function Card({
    children,
    style,
    intensity = 80
}: CardProps) {
    const { theme, isDarkMode } = useTheme();

    // Simular glassmorphism com opacity no background
    const glassBackground = isDarkMode
        ? `rgba(30, 41, 59, ${intensity / 100})`    // slate-800 com opacity
        : `rgba(255, 255, 255, ${intensity / 100})`; // branco com opacity

    return (
        <View style={[styles.container, { borderColor: theme.colors.surfaceBorder }, style]}>
            <View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: glassBackground }
                ]}
            />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius['2xl'],
        borderWidth: 1,
        overflow: 'hidden',
        ...shadows.md,
    },
    content: {
        padding: spacing[4],
    },
});
