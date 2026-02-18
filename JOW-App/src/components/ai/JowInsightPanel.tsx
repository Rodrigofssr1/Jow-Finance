import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../theme';

export type RiskLevel = 'safe' | 'warning' | 'danger' | 'critical';

interface JowInsightPanelProps {
    loading?: boolean;
    riskLevel: RiskLevel;
    data: {
        totalCommitment: number; // Percentage (e.g., 45)
        monthlyIncome: number;
        installmentValue: number;
        installments: number;
        monthsToPayoff: number;
        message: string;
        suggestion?: string;
    };
    onAction?: (action: string) => void;
}

const RISK_CONFIG = {
    safe: { color: '#10B981', icon: 'checkmark-circle', label: 'Seguro' }, // Emerald
    warning: { color: '#F59E0B', icon: 'alert-circle', label: 'Atenção' }, // Amber
    danger: { color: '#EF4444', icon: 'warning', label: 'Perigo' }, // Red
    critical: { color: '#7F1D1D', icon: 'hand-left', label: 'Crítico' }, // Dark Red
};

export const JowInsightPanel = ({ loading, riskLevel, data, onAction }: JowInsightPanelProps) => {
    console.log("[DEBUG] JowInsightPanel data received:", !!data, "riskLevel:", riskLevel);
    const { theme } = useTheme();
    const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.safe;

    if (loading) {
        return (
            <View style={[styles.container, { borderColor: theme.colors.primary }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={theme.colors.primary} />
                    <Text style={styles.loadingText}>🤖 JOW está analisando pacto financeiro...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { borderColor: config.color, backgroundColor: `${config.color}10` }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Ionicons name={config.icon as any} size={20} color={config.color} />
                    <Text style={[styles.statusTitle, { color: config.color }]}>
                        Análise: {config.label}
                    </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
                    <Text style={[styles.badgeText, { color: config.color }]}>
                        {data.totalCommitment.toFixed(0)}% da Renda Comprometida
                    </Text>
                </View>
            </View>

            {/* Message */}
            <Text style={styles.message}>
                {data.message}
            </Text>

            {/* Metrics Grid */}
            <View style={styles.metricsContainer}>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Parcela</Text>
                    <Text style={styles.metricValue}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.installmentValue)}
                    </Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Duração</Text>
                    <Text style={styles.metricValue}>{data.installments} meses</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Impacto na Renda</Text>
                    <Text style={styles.metricValue}>
                        +{((data.installmentValue / data.monthlyIncome) * 100).toFixed(1)}%
                    </Text>
                </View>
            </View>

            {/* AI Suggestion */}
            {data.suggestion && (
                <View style={styles.suggestionBox}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="bulb" size={16} color="#FBBF24" />
                        <Text style={styles.suggestionTitle}>Sugestão Inteligente</Text>
                    </View>
                    <Text style={styles.suggestionText}>{data.suggestion}</Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={() => onAction?.('simulate')}
                >
                    <Text style={styles.actionText}>🔮 Simular Alternativas</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    loadingText: {
        color: '#94A3B8',
        fontFamily: 'Inter-Medium',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusTitle: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
    },
    message: {
        color: '#E2E8F0',
        fontFamily: 'Inter-Regular',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontFamily: 'Inter-Medium',
        marginBottom: 4,
    },
    metricValue: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    suggestionBox: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)', // Amber / Yellow low opacity
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#FBBF24',
        marginBottom: 16,
    },
    suggestionTitle: {
        color: '#FBBF24',
        fontSize: 12,
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
    },
    suggestionText: {
        color: '#FFF',
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        fontStyle: 'italic',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    actionText: {
        color: '#FFF',
        fontSize: 13,
        fontFamily: 'Inter-SemiBold',
    }
});
