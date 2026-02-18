/**
 * JOW - Componentes de Tipografia
 * 
 * Componentes de texto tipados seguindo o design system.
 * - H1, H2, H3, H4: Space Grotesk
 * - Body, BodyMedium, Caption, Label: Inter
 * - MonoText: JetBrains Mono (para valores monetários)
 */

import React, { ReactNode } from 'react';
import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { textStyles } from '../theme';

interface TypographyProps extends TextProps {
    children: ReactNode;
    color?: string;
    style?: TextStyle;
}

// Headings - Space Grotesk
export function H1({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.h1,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

export function H2({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.h2,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

export function H3({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.h3,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

export function H4({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.h4,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

// Body text - Inter
export function Body({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.body,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

export function BodyMedium({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.bodyMedium,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

export function Caption({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.caption,
                { color: color || theme.colors.textSecondary },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

export function Label({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.label,
                { color: color || theme.colors.textSecondary },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

// Mono text - JetBrains Mono (para valores monetários)
export function MonoText({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.mono,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

export function MonoLarge({ children, color, style, ...props }: TypographyProps) {
    const { theme } = useTheme();
    return (
        <Text
            style={[
                styles.monoLarge,
                { color: color || theme.colors.text },
                style
            ]}
            {...props}
        >
            {children}
        </Text>
    );
}

const styles = StyleSheet.create({
    h1: textStyles.h1,
    h2: textStyles.h2,
    h3: textStyles.h3,
    h4: textStyles.h4,
    body: textStyles.body,
    bodyMedium: textStyles.bodyMedium,
    caption: textStyles.caption,
    label: textStyles.label,
    mono: textStyles.mono,
    monoLarge: textStyles.monoLarge,
});
