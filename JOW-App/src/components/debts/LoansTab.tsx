import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { calculateSACPayment, calculateSACTotalPaid } from '../../utils/finance';
import { useFocusEffect } from 'expo-router';

import { Loan } from '../../types';

interface LoansTabProps {
    refreshTrigger: number;
    onEdit: (item: Loan) => void;
}

export const LoansTab = ({ refreshTrigger, onEdit }: LoansTabProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLoans = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLoans(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchLoans();
        }, [fetchLoans, refreshTrigger])
    );

    const handleDelete = async (id: string, name: string) => {
        Alert.alert(
            'Excluir Empréstimo',
            `Tem certeza que deseja excluir "${name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('loans').delete().eq('id', id);
                            if (error) throw error;
                            fetchLoans();
                        } catch (error: any) {
                            Alert.alert('Erro', 'Não foi possível excluir o item.');
                        }
                    }
                }
            ]
        );
    };

    const getIcon = (item: Loan) => {
        if (!item.asset_type) return 'cash-outline';
        if (item.asset_type === 'carro') return 'car-sport-outline';
        if (item.asset_type === 'casa') return 'home-outline';
        if (item.asset_type === 'moto') return 'bicycle-outline';
        return 'pricetag-outline';
    };

    const renderItem = ({ item }: { item: Loan }) => {
        const total = item.total_installments;
        const paid = item.paid_installments;
        const progress = Math.min((paid / total), 1);

        // Calculate Values based on System
        let nextPayment = item.monthly_payment;
        let totalPaid = 0;
        let remainingValue = 0;

        if (item.amortization_system === 'SAC') {
            // SAC Logic
            if (paid < total) {
                nextPayment = calculateSACPayment(item.original_amount, item.interest_rate || 0, total, paid + 1);
            } else {
                nextPayment = 0;
            }

            totalPaid = calculateSACTotalPaid(item.original_amount, item.interest_rate || 0, total, paid);
            // Remaining = original + total_interest_predicted - paid? 
            // Better: Remaining Balance of Principal? Or Remaining Payments sum?
            // Usually "Saldo Devedor" (Principal) vs "Saldo Quitar" (Total future payments).
            // User requested "Total pago até agora vs Valor original".
            // Let's show (Total Paid) / (Estimated Total).

            // For card "Restante" value: future payments sum.
            const totalEstimatedToPay = calculateSACTotalPaid(item.original_amount, item.interest_rate || 0, total, total);
            remainingValue = totalEstimatedToPay - totalPaid;

        } else {
            // Price / User Def Logic
            totalPaid = paid * item.monthly_payment;
            remainingValue = (total - paid) * Number(item.monthly_payment);
        }

        return (
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                            <Ionicons name={getIcon(item) as any} size={20} color={theme.colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.text + '80' }]}>
                                {item.asset_type ? `Financiamento (${item.asset_type})` : 'Empréstimo'} • {item.amortization_system || 'PRICE'}
                            </Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                            <TouchableOpacity onPress={() => onEdit(item)}>
                                <Ionicons name="pencil" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                                <Ionicons name="trash" size={16} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.value, { color: theme.colors.text }]}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingValue)}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.colors.text + '80' }]}>Restante Total</Text>
                    </View>
                </View>

                {/* Progress */}
                <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: theme.colors.text + '80' }}>
                            Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}
                        </Text>
                        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, color: theme.colors.text }}>
                            {paid}/{total} ({Math.round(progress * 100)}%)
                        </Text>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: theme.colors.border }]}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]} />
                    </View>
                </View>

                {/* Detail Row */}
                <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, color: theme.colors.text + '80' }}>Próxima Parcela</Text>
                        <Text style={{ fontFamily: 'SpaceGrotesk-Bold', color: theme.colors.text }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nextPayment)}
                        </Text>
                    </View>
                    {item.asset_value && (
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 12, color: theme.colors.text + '80' }}>Valor do Bem</Text>
                            <Text style={{ fontFamily: 'SpaceGrotesk-Bold', color: theme.colors.text }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.asset_value)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={loans}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 80 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLoans} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ color: theme.colors.text, fontFamily: 'SpaceGrotesk-Regular' }}>Nenhum empréstimo ou financiamento.</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    name: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    subtitle: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 12,
    },
    value: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    progressBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    fab: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }
});
