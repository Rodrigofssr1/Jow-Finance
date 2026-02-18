import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCashFlow } from '../../src/hooks/useCashFlow';
import { useDashboardData } from '../../src/hooks/useDashboardData';

export default function CashFlowScreen() {
    const { theme } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());

    const {
        saldoInicial,
        receitas,
        despesas,
        investimentos,
        faturas,
        saldoFinal,
        saldoFinalProjetado,
        variacao,
        isLoading
    } = useCashFlow(currentDate);

    const { refetchAll } = useDashboardData();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetchAll();
        setRefreshing(false);
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const renderHeader = () => (
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity onPress={() => handleMonthChange('prev')}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    FLUXO DE CAIXA
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.text + '80' }]}>
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
                </Text>
            </View>
            <TouchableOpacity onPress={() => handleMonthChange('next')}>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
            </TouchableOpacity>
        </View>
    );

    const renderColumnHeaders = () => (
        <View style={[styles.row, { borderBottomColor: theme.colors.border + '40', paddingVertical: 8 }]}>
            <Text style={[styles.rowLabel, { color: theme.colors.text + '60', fontSize: 10, flex: 1.5 }]}>CATEGORIA</Text>
            <Text style={[styles.rowValue, { color: theme.colors.text + '60', fontSize: 10, flex: 1 }]}>REALIZADO</Text>
            <Text style={[styles.rowValue, { color: theme.colors.text + '60', fontSize: 10, flex: 1 }]}>PROJETADO</Text>
        </View>
    );

    const renderRow = (label: string, realized: number, projected: number, isTotal = false, color?: string, indent = false) => (
        <View key={label} style={[styles.row, isTotal && styles.totalRow, { borderBottomColor: theme.colors.border + '40' }]}>
            <Text style={[
                styles.rowLabel,
                { color: theme.colors.text, flex: 1.5 },
                isTotal && { fontFamily: 'SpaceGrotesk-Bold', fontWeight: 'bold' },
                indent && { paddingLeft: 16, fontSize: 13 }
            ]} numberOfLines={1}>
                {label}
            </Text>
            <Text style={[
                styles.rowValue,
                { color: color || theme.colors.text, flex: 1 },
                isTotal && { fontFamily: 'JetBrainsMono-Bold', fontWeight: 'bold' }
            ]}>
                {formatCurrency(realized)}
            </Text>
            <Text style={[
                styles.rowValue,
                {
                    color: '#FBBF24', // 🔥 AMARELO para toda coluna PROJETADO
                    flex: 1
                },
                isTotal && {
                    fontFamily: 'JetBrainsMono-Bold',
                    fontWeight: 'bold' // 🔥 TOTAIS em negrito
                }
            ]}>
                {formatCurrency(projected)}
            </Text>
        </View>
    );

    if (isLoading && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {renderHeader()}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Global Column Headers */}
                {renderColumnHeaders()}

                {/* Saldo Inicial */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    {renderRow('SALDO INICIAL', saldoInicial, saldoInicial, true)}
                </View>

                {/* Receitas */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>RECEITAS</Text>
                    </View>
                    {receitas.items.map(inc => renderRow(inc.categoria, inc.valor, inc.projetado, false, '#34D399', true))}
                    {renderRow('TOTAL RECEITAS', receitas.total, receitas.totalProjetado, true, '#34D399')}
                </View>

                {/* Despesas */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#F87171' + '20' }]}>
                        <Text style={[styles.sectionTitle, { color: '#F87171' }]}>DESPESAS</Text>
                    </View>
                    {despesas.items.map(exp => renderRow(exp.categoria, exp.valor, exp.projetado, false, '#F87171', true))}
                    {renderRow('TOTAL DESPESAS', despesas.total, despesas.totalProjetado, true, '#F87171')}
                </View>

                {/* Investimentos */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#6366f1' + '20' }]}>
                        <Text style={[styles.sectionTitle, { color: '#6366f1' }]}>INVESTIMENTOS (APLICAÇÕES E RESGATES)</Text>
                    </View>
                    {investimentos.items.map(inv => renderRow(inv.categoria, inv.valor, inv.projetado, false, '#6366f1', true))}
                    {renderRow('TOTAL INVESTIMENTOS', investimentos.total, investimentos.totalProjetado, true, '#6366f1')}
                </View>

                {/* Resultado */}
                <View style={[styles.section, { backgroundColor: theme.colors.card, marginTop: 20 }]}>
                    {renderRow('SALDO FINAL', saldoFinal, saldoFinalProjetado, true)}
                    <View style={[styles.row, styles.totalRow, { borderBottomColor: theme.colors.border + '40' }]}>
                        <Text style={[styles.rowLabel, { color: theme.colors.text, fontFamily: 'SpaceGrotesk-Bold', flex: 1.5 }]}>
                            VARIAÇÃO
                        </Text>
                        <Text style={[
                            styles.rowValue,
                            { color: variacao >= 0 ? '#34D399' : '#F87171', fontFamily: 'JetBrainsMono-Bold', flex: 2, textAlign: 'right' }
                        ]}>
                            {variacao.toFixed(2)}%
                        </Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 20,
        elevation: 2,
    },
    headerTitle: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    headerSubtitle: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 14,
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionHeader: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    sectionTitle: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
    },
    totalRow: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderBottomWidth: 0,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        marginTop: 4,
    },
    rowLabel: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 14,
    },
    rowValue: {
        fontFamily: 'JetBrainsMono-Regular',
        fontSize: 13, // Slightly smaller to fit 2 columns
        textAlign: 'right',
    }
});
