/**
 * JOW - Componente ThemeToggle
 * 
 * Switch animado para alternar entre dark/light mode.
 * Ícones de lua (dark) e sol (light).
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius } from '../theme';

interface ThemeToggleProps {
    /** Tamanho do componente (padrão: 'medium') */
    size?: 'small' | 'medium' | 'large';
}

const sizeConfig = {
    small: { width: 52, height: 28, iconSize: 14, thumbSize: 22 },
    medium: { width: 64, height: 34, iconSize: 18, thumbSize: 28 },
    large: { width: 76, height: 40, iconSize: 22, thumbSize: 34 },
};

export function ThemeToggle({ size = 'medium' }: ThemeToggleProps) {
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const config = sizeConfig[size];

    const thumbPosition = isDarkMode
        ? config.width - config.thumbSize - 3
        : 3;

    return (
        <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.8}
            accessibilityRole="switch"
            accessibilityState={{ checked: isDarkMode }}
            accessibilityLabel={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        >
            <View
                style={[
                    styles.track,
                    {
                        width: config.width,
                        height: config.height,
                        backgroundColor: isDarkMode
                            ? theme.colors.switchTrackActive
                            : theme.colors.switchTrackInactive,
                    }
                ]}
            >
                {/* Ícones de fundo */}
                <View style={styles.iconsContainer}>
                    <Ionicons
                        name="sunny"
                        size={config.iconSize}
                        color={isDarkMode ? 'rgba(255,255,255,0.3)' : '#FCD34D'}
                        style={styles.sunIcon}
                    />
                    <Ionicons
                        name="moon"
                        size={config.iconSize}
                        color={isDarkMode ? '#E0E7FF' : 'rgba(0,0,0,0.2)'}
                        style={styles.moonIcon}
                    />
                </View>

                {/* Thumb animado */}
                <Animated.View
                    style={[
                        styles.thumb,
                        {
                            width: config.thumbSize,
                            height: config.thumbSize,
                            transform: [{ translateX: thumbPosition }],
                            backgroundColor: '#FFFFFF',
                        }
                    ]}
                >
                    <Ionicons
                        name={isDarkMode ? 'moon' : 'sunny'}
                        size={config.iconSize - 2}
                        color={isDarkMode ? theme.colors.primary : '#F59E0B'}
                    />
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    track: {
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        padding: 3,
    },
    iconsContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing[2],
    },
    sunIcon: {
        marginLeft: 2,
    },
    moonIcon: {
        marginRight: 2,
    },
    thumb: {
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
});
