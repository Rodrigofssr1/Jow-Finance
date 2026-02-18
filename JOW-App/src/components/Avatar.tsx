/**
 * JOW - Componente Avatar
 * 
 * Avatar circular com suporte a imagem ou iniciais.
 * Gradiente Indigo → Rosa quando sem imagem.
 */

import React from 'react';
import { View, Image, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { brandColors } from '../theme';

interface AvatarProps {
    /** Tamanho do avatar em pixels (padrão: 48) */
    size?: number;
    /** Fonte da imagem (se não fornecida, mostra iniciais) */
    source?: ImageSourcePropType;
    /** Iniciais a mostrar (padrão: "JW") */
    initials?: string;
}

export function Avatar({ size = 48, source, initials = 'JW' }: AvatarProps) {
    const { theme } = useTheme();

    const containerStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
    };

    const textSize = size * 0.4;

    if (source) {
        return (
            <Image
                source={source}
                style={[styles.image, containerStyle]}
            />
        );
    }

    return (
        <View style={[styles.container, containerStyle]}>
            <LinearGradient
                colors={[brandColors.indigo, brandColors.rose]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <Text
                style={[
                    styles.initials,
                    {
                        fontSize: textSize,
                        color: theme.colors.text,
                    }
                ]}
            >
                {initials.toUpperCase().slice(0, 2)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        resizeMode: 'cover',
    },
    initials: {
        fontWeight: '600',
    },
});
