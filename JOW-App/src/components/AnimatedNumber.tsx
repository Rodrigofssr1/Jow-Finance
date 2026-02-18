/**
 * JOW - AnimatedNumber
 * 
 * Componente para animar valores numéricos com efeito de contagem.
 * Usa react-native-reanimated para performance nativa.
 * 
 * Formato padrão: R$ 1.234,56 (BRL)
 */

import React, { useEffect, useState } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    withTiming,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { fontFamilies, fontSizes, fontWeights } from '../theme';

interface AnimatedNumberProps {
    /** Valor final a ser exibido */
    value: number;
    /** Duração da animação em ms (padrão: 1000) */
    duration?: number;
    /** Prefixo antes do número (padrão: "R$ ") */
    prefix?: string;
    /** Sufixo após o número */
    suffix?: string;
    /** Tamanho do texto */
    size?: 'small' | 'medium' | 'large';
    /** Cor customizada (usa cor do tema se não especificada) */
    color?: string;
    /** Estilo adicional */
    style?: TextStyle;
}

/**
 * Formata número para padrão brasileiro (1.234,56)
 */
function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function AnimatedNumber({
    value,
    duration = 1000,
    prefix = 'R$ ',
    suffix = '',
    size = 'large',
    color,
    style,
}: AnimatedNumberProps) {
    const { theme } = useTheme();
    const [displayValue, setDisplayValue] = useState(0);
    const animatedValue = useSharedValue(0);

    useEffect(() => {
        const updateDisplay = (val: number) => {
            setDisplayValue(val);
        };

        animatedValue.value = withTiming(value, {
            duration,
            easing: Easing.out(Easing.cubic),
        }, (finished) => {
            if (finished) {
                runOnJS(updateDisplay)(value);
            }
        });

        // Ticker para atualizar display durante animação
        const interval = setInterval(() => {
            runOnJS(updateDisplay)(animatedValue.value);
        }, 16); // ~60fps

        return () => clearInterval(interval);
    }, [value, duration]);

    const sizeStyles = {
        small: styles.small,
        medium: styles.medium,
        large: styles.large,
    };

    return (
        <Text
            style={[
                styles.base,
                sizeStyles[size],
                { color: color || theme.colors.text },
                style,
            ]}
        >
            {`${prefix}${formatBRL(displayValue)}${suffix}`}
        </Text>
    );
}

const styles = StyleSheet.create({
    base: {
        fontFamily: fontFamilies.mono,
        fontWeight: fontWeights.semibold as TextStyle['fontWeight'],
    },
    small: {
        fontSize: fontSizes.base,
    },
    medium: {
        fontSize: fontSizes.xl,
    },
    large: {
        fontSize: fontSizes['2xl'],
    },
});

