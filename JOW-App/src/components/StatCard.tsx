/**
 * JOW - StatCard
 * 
 * Card de estatística para exibir métricas financeiras.
 * Combina ícone, título e valor animado com variantes de cor.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './Card';
import { Caption } from './Typography';
import { AnimatedNumber } from './AnimatedNumber';
import { spacing, borderRadius } from '../theme';

type StatCardVariant = 'primary' | 'success' | 'warning' | 'neutral';

interface StatCardProps {
    /** Título do card */
    title: string;
    /** Valor monetário a exibir */
    value: number;
    /** Nome do ícone Ionicons */
    icon: keyof typeof Ionicons.glyphMap;
    /** Variante de cor do card */
    variant?: StatCardVariant;
    /** Estilo adicional do container */
    style?: ViewStyle;
    /** Variação percentual (ex: 5.2 para +5.2%) */
    trend?: number;
    /** Rótulo da variação (ex: "vs. mês anterior") */
    trendLabel?: string;
}

/**
 * Cores por variante
 */
function getVariantColors(variant: StatCardVariant, isDark: boolean) {
    const colors = {
        primary: {
            main: '#6366F1',     // Indigo
            gradient: isDark
                ? ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)']
                : ['rgba(99, 102, 241, 0.12)', 'rgba(99, 102, 241, 0.03)'],
        },
        success: {
            main: '#34D399',     // Emerald
            gradient: isDark
                ? ['rgba(52, 211, 153, 0.15)', 'rgba(52, 211, 153, 0.05)']
                : ['rgba(52, 211, 153, 0.12)', 'rgba(52, 211, 153, 0.03)'],
        },
        warning: {
            main: '#FBBF24',     // Amber
            gradient: isDark
                ? ['rgba(251, 191, 36, 0.15)', 'rgba(251, 191, 36, 0.05)']
                : ['rgba(251, 191, 36, 0.12)', 'rgba(251, 191, 36, 0.03)'],
        },
        neutral: {
            main: '#94A3B8',     // Slate
            gradient: isDark
                ? ['rgba(148, 163, 184, 0.1)', 'rgba(148, 163, 184, 0.02)']
                : ['rgba(148, 163, 184, 0.08)', 'rgba(148, 163, 184, 0.02)'],
        },
    };

    return colors[variant];
}

export function StatCard({
    title,
    value,
    icon,
    variant = 'primary',
    style,
    trend,
    trendLabel,
}: StatCardProps) {
    const { theme, isDarkMode } = useTheme();
    const variantColors = getVariantColors(variant, isDarkMode);

    return (
        <Card style={StyleSheet.flatten([styles.card, style])}>
            {/* Gradient overlay */}
            <LinearGradient
                colors={variantColors.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Conteúdo */}
            <View style={styles.content}>
                {/* Header: Ícone + Título */}
                <View style={styles.header}>
                    <View
                        style={[
                            styles.iconContainer,
                            { backgroundColor: `${variantColors.main}20` }
                        ]}
                    >
                        <Ionicons
                            name={icon}
                            size={20}
                            color={variantColors.main}
                        />
                    </View>
                    <Caption
                        style={styles.title}
                        color={theme.colors.textSecondary}
                    >
                        {title}
                    </Caption>
                </View>

                <AnimatedNumber
                    value={value}
                    size="large"
                    color={theme.colors.text}
                    duration={1200}
                />

                {/* Trend Indicator */}
                {trend !== undefined && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Ionicons
                            name={trend >= 0 ? 'trending-up' : 'trending-down'}
                            size={16}
                            color={trend >= 0 ? theme.colors.success : theme.colors.error}
                            style={{ marginRight: 4 }}
                        />
                        <Caption style={{
                            color: trend >= 0 ? theme.colors.success : theme.colors.error,
                            fontWeight: 'bold'
                        }}>
                            {Math.abs(trend).toFixed(1)}%
                        </Caption>
                        {trendLabel && (
                            <Caption style={{ marginLeft: 6, color: theme.colors.textSecondary }}>
                                {trendLabel}
                            </Caption>
                        )}
                    </View>
                )}
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minHeight: 120,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        marginBottom: spacing[3],
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
    },
});
