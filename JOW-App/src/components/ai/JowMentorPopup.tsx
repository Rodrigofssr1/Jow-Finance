import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { AIResponse } from '../../services/ai/AIContextAnalyzer';

const { width } = Dimensions.get('window');

interface JowMentorPopupProps {
    visible: boolean;
    data: AIResponse | null;
    onDismiss: () => void;
    onAction?: () => void;
}

export function JowMentorPopup({ visible, data, onDismiss, onAction }: JowMentorPopupProps) {
    const { theme } = useTheme();

    if (!visible || !data) return null;

    const getColors = () => {
        switch (data.type) {
            case 'warning': return { bg: '#FEF2F2', border: '#F87171', icon: '#DC2626', iconName: 'alert-circle' as const };
            case 'success': return { bg: '#ECFDF5', border: '#34D399', icon: '#059669', iconName: 'checkmark-circle' as const };
            case 'tip': return { bg: '#F5F3FF', border: '#8B5CF6', icon: '#7C3AED', iconName: 'bulb' as const };
            default: return { bg: '#EFF6FF', border: '#60A5FA', icon: '#2563EB', iconName: 'information-circle' as const };
        }
    };

    const colors = getColors();

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onDismiss();
            }, 8000); // Auto dismiss after 8s
            return () => clearTimeout(timer);
        }
    }, [visible]);

    return (
        <Animated.View
            entering={SlideInUp.duration(500)}
            exiting={SlideOutUp.duration(500)}
            style={[styles.container, { top: 60 }]} // Adjust top based on safe area if needed
        >
            <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                {/* Header with Icon and Title */}
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.icon + '20' }]}>
                        <Ionicons name={colors.iconName} size={24} color={colors.icon} />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: colors.icon }]}>{data.title}</Text>
                        <Text style={[styles.message, { color: theme.colors.text }]}>
                            {data.message}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
                        <Ionicons name="close" size={20} color={theme.colors.text + '80'} />
                    </TouchableOpacity>
                </View>

                {/* Suggestion / Tip */}
                <View style={[styles.footer, { borderTopColor: colors.border + '40' }]}>
                    <Text style={[styles.suggestion, { color: theme.colors.text + '90' }]}>
                        💡 {data.suggestion}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999, // Ensure it's on top
        maxWidth: 500,
        alignSelf: 'center',
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 14,
        marginBottom: 4,
    },
    message: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 13,
        lineHeight: 18,
    },
    closeButton: {
        padding: 4,
    },
    footer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    suggestion: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 12,
    }
});
