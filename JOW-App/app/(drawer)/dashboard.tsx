/**
 * JOW - Dashboard
 * 
 * Tela principal com 4 cards de métricas financeiras.
 * Fase 2: Dados mock zerados.
 */

import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { H1, Caption, Body } from '../../src/components/Typography';
import { StatCard } from '../../src/components/StatCard';
import { JowFAB } from '../../src/components/JowFAB';
import { spacing } from '../../src/theme';
import { useTransactions } from '../../src/hooks/useTransactions'; // Mantendo por compatibilidade se necessário, mas não usando
import { useDashboardData } from '../../src/hooks/useDashboardData';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';


import { ChatModal } from '../../src/components/chat/ChatModal';
import { useChat } from '../../src/hooks/useChat'; // Ensure this hooks is available or context is used

export default function Dashboard(props: any) {
    const { theme } = useTheme();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const navigation = useNavigation();

    const [chatVisible, setChatVisible] = useState(false);

    // Watch for navigation params to open modal
    // FIXME: This should be handled globally or via context now
    // React.useEffect(() => {
    //     if (params.openTransactionModal === 'true') {
    //         setTransactionModalVisible(true);
    //         navigation.setParams({ openTransactionModal: undefined } as any);
    //     }
    // }, [params.openTransactionModal]);

    // REACT QUERY HOOK
    const {
        netWorth,
        totalCash,
        totalInvestments,
        incomeMonth,
        expenseMonth,
        trend,
        isLoading,
        refetchAll
    } = useDashboardData();

    // Pull to Refresh
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetchAll();
        setRefreshing(false);
    }, [refetchAll]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.contentContainer}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                >
                    {/* Header com Avatar */}
                    <View style={styles.header}>
                        <View style={styles.greeting}>
                            <Caption>Bem-vindo ao</Caption>
                            <H1 color={theme.colors.primary}>JOW</H1>
                            <Body color={theme.colors.textSecondary}>
                                Just Organize Wealth
                            </Body>
                        </View>
                        <Image
                            source={require('../../assets/Jow.png')}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                borderWidth: 2,
                                borderColor: theme.colors.primary
                            }}
                        />
                    </View>

                    {/* Grid de Cards 2x2 */}
                    <View style={styles.cardsContainer}>
                        {/* Linha 1 */}
                        <View style={styles.row}>
                            <StatCard
                                title="Disponível"
                                value={totalCash}
                                icon="wallet-outline"
                                variant="primary"
                            />
                            <StatCard
                                title="Investido"
                                value={totalInvestments}
                                icon="trending-up"
                                variant="success"
                            />
                        </View>

                        {/* Linha 2 */}
                        <View style={styles.row}>
                            <StatCard
                                title="Entradas"
                                value={incomeMonth}
                                icon="arrow-down-circle-outline"
                                variant="success"
                            />
                            <StatCard
                                title="Saídas"
                                value={expenseMonth}
                                icon="arrow-up-circle-outline"
                                variant="warning"
                            />
                        </View>

                        {/* Linha 3: Patrimônio */}
                        <View style={styles.row}>
                            <StatCard
                                title="Patrimônio Líquido"
                                value={netWorth}
                                icon="business-outline"
                                variant="primary"
                                trend={trend}
                                trendLabel="ativos vs. 30 dias"
                            />
                        </View>
                    </View>

                    {/* SEÇÃO NOVO: Próximos Vencimentos */}
                    <View style={{ marginTop: spacing[6], paddingBottom: 80 }}>
                        <H1 style={{ fontSize: 18, marginBottom: spacing[4], color: theme.colors.text }}>
                            Próximos Vencimentos
                        </H1>

                        {/* Como não criamos um hook unificado ainda, vamos mostrar um placeholder funcional 
                            que sugere ao usuário ir para a tela de Dívidas 
                        */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: theme.colors.card,
                                padding: 16,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: theme.colors.border
                            }}
                            // @ts-ignore
                            onPress={() => props.navigation?.navigate('debts')}
                        >
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: theme.colors.warning + '20',
                                justifyContent: 'center', alignItems: 'center',
                                marginRight: 12
                            }}>
                                <Ionicons name="calendar" size={20} color={theme.colors.warning} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Body style={{ fontFamily: 'SpaceGrotesk-Bold' }}>Verifique suas contas</Body>
                                <Caption>Toque para ver cartões e assinaturas a vencer.</Caption>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.text + '80'} />
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* FAB Removed - Modal trigger moved to AI/Chat or Header */}
                {/* <JowFAB onPress={() => ...} /> */}

                {/* Chat Modal - Now manages AI communication */}
                <ChatModal
                    visible={chatVisible}
                    onClose={() => setChatVisible(false)}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        position: 'relative', // Para o FAB se posicionar absoluto aqui dentro
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing[5],
        paddingBottom: spacing[8],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing[6],
    },
    greeting: {
        flex: 1,
    },
    cardsContainer: {
        gap: spacing[4],
    },
    row: {
        flexDirection: 'row',
        gap: spacing[4],
    },
});
