import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { CreditCard } from '../../types';

interface CreditCard3DProps {
    card: CreditCard;
    onEdit?: (card: CreditCard) => void;
    onDelete?: (cardId: string) => void;
    currentBill: number;
    size?: 'small' | 'default' | 'large';
    showFlipAnimation?: boolean;
    onPress?: () => void;
}

export const CreditCard3D = ({ card, onEdit, onDelete, currentBill, size = 'default', showFlipAnimation = false, onPress }: CreditCard3DProps) => {
    const { theme } = useTheme();

    const limit = Number(card.limit_amount);
    const available = limit - currentBill;
    const progress = Math.min((currentBill / limit), 1);

    // Determine status color based on usage
    let statusColor = '#4CAF50'; // Green (<50%)
    if (progress > 0.5) statusColor = '#FFC107'; // Yellow (>50%)
    if (progress > 0.8) statusColor = '#F44336'; // Red (>80%)

    const cardColor = card.color || '#8B5CF6'; // Default purple

    // Scale factor based on size
    const scale = size === 'large' ? 1.1 : (size === 'small' ? 0.9 : 1);
    const containerHeight = size === 'large' ? 240 : (size === 'small' ? 160 : 200);

    // Dynamic styles for Glow Effect
    const glowStyle = {
        shadowColor: cardColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: size === 'large' ? 30 : (size === 'small' ? 15 : 20),
        elevation: size === 'large' ? 15 : (size === 'small' ? 8 : 10),
    };

    const containerStyle = {
        borderColor: `${cardColor}60`, // Transparent border
        minHeight: containerHeight,
        ...Platform.select({
            web: {
                boxShadow: `0 0 ${size === 'large' ? 30 : (size === 'small' ? 15 : 20)}px ${cardColor}80, 0 0 ${size === 'large' ? 60 : (size === 'small' ? 30 : 40)}px ${cardColor}40, inset 0 0 20px rgba(255,255,255,0.1)`,
                border: `2px solid ${cardColor}60`,
            }
        }) as any
    };

    return (
        <Pressable
            style={[styles.wrapper, glowStyle, size === 'large' && { marginBottom: 30 }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <LinearGradient
                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                style={[styles.cardContainer, containerStyle, size === 'small' && { minHeight: 160 }]}
            >
                {/* Glass Effect - Content */}
                <View style={[styles.content, size === 'small' && { padding: 16 }]}>
                    {/* Header: Chip & Flag */}
                    <View style={[styles.header, size === 'small' && { marginBottom: 10, marginTop: 0 }]}>
                        <View style={[styles.chip, size === 'small' && { width: 32, height: 22 }]} />
                        <Ionicons name="card" size={size === 'small' ? 20 : 24} color="rgba(255,255,255,0.8)" />
                    </View>

                    {/* Card Number (Masked) */}
                    <Text style={[styles.cardNumber, size === 'small' && { fontSize: 16, marginBottom: 4 }]}>
                        {card.name.toUpperCase()} •••• {card.last_four_digits || '0000'}
                    </Text>

                    {/* Holder Name (Removed as requested, merged into card number line basically, but keeping clean) */}
                    {/* <Text style={[styles.holderName, size === 'small' && { fontSize: 12, marginBottom: 10 }]}>{card.name.toUpperCase()}</Text> */}

                    {/* Financial Info */}
                    <View style={[styles.footer, size === 'small' && { marginBottom: 8 }]}>
                        <View>
                            <Text style={[styles.label, size === 'small' && { fontSize: 8 }]}>FATURA ATUAL</Text>
                            <Text style={[styles.billValue, size === 'small' && { fontSize: 16 }]}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentBill)}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.label, size === 'small' && { fontSize: 8 }]}>LIMITE DISPONÍVEL</Text>
                            <Text style={[styles.limitValue, { color: statusColor }, size === 'small' && { fontSize: 12 }]}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(available)}
                            </Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={[styles.progressContainer, size === 'small' && { height: 4, marginBottom: 4 }]}>
                        <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: cardColor }]} />
                    </View>

                    <Text style={[styles.dueDate, size === 'small' && { fontSize: 10 }]}>Vence dia {card.due_day}</Text>
                </View>
            </LinearGradient>

            {/* Actions (Top Right) - MOVED OUTSIDE Gradient for Web Click Reliability */}
            {(onEdit && onDelete) && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        onPress={() => onEdit(card)}
                        style={[styles.iconButton, Platform.OS === 'web' && { cursor: 'pointer' } as any]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onDelete(card.id)}
                        style={[styles.iconButton, Platform.OS === 'web' && { cursor: 'pointer' } as any]}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="trash" size={14} color="rgba(255,100,100,0.9)" />
                    </TouchableOpacity>
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15, // Base shadow
        position: 'relative', // Ensure absolute children are relative to this
    },
    cardContainer: {
        borderRadius: 16,
        borderWidth: 2,
        // borderColor set dynamically
        overflow: 'hidden',
        minHeight: 200,
        backgroundColor: Platform.OS === 'web' ? 'rgba(30, 41, 59, 0.7)' : 'transparent',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(20px)',
            }
        }) as any,
    },
    actionButtons: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        gap: 8,
        zIndex: 50, // High z-index to ensure clickable
        elevation: 10,
    },
    iconButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        padding: 24,
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        marginTop: 10, // Make space for action buttons
    },
    chip: {
        width: 40,
        height: 28,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardNumber: {
        fontFamily: 'SpaceGrotesk-Medium',
        fontSize: 18,
        letterSpacing: 2,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    holderName: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    label: {
        fontFamily: 'Inter-Medium',
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 4,
    },
    billValue: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 18,
        color: '#FFFFFF',
    },
    limitValue: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 14,
    },
    progressContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    dueDate: {
        alignSelf: 'flex-end',
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
});
