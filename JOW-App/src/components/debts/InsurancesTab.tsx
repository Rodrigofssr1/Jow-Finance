import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

import { useFocusEffect } from 'expo-router';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Insurance = {
    id: string;
    type: string;
    insurer: string;
    policy_number: string;
    premium_amount: number;
    due_date: string;
    coverage_summary: string;
    payment_method?: string;
    charge_day?: number;
    credit_cards?: {
        name: string;
        closing_day: number;
    };
};

interface InsurancesTabProps {
    refreshTrigger: number;
    onEdit: (item: Insurance) => void;
}

export const InsurancesTab = ({ refreshTrigger, onEdit }: InsurancesTabProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInsurances = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('insurances')
                .select('*, credit_cards(name, closing_day)')
                .eq('user_id', user.id)
                .order('due_date');

            if (error) throw error;
            setInsurances(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchInsurances();
        }, [fetchInsurances, refreshTrigger])
    );

    const handleDelete = async (id: string, name: string) => {
        Alert.alert(
            'Excluir Seguro',
            `Tem certeza que deseja excluir "${name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('insurances').delete().eq('id', id);
                            if (error) throw error;
                            fetchInsurances();
                        } catch (error: any) {
                            Alert.alert('Erro', 'Não foi possível excluir o item.');
                        }
                    }
                }
            ]
        );
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'auto': return 'car-sport';
            case 'vida': return 'heart';
            case 'residencial': return 'home';
            case 'saude': return 'medkit';
            default: return 'shield-checkmark';
        }
    };

    const renderCard = ({ item }: { item: Insurance }) => {
        const dueDate = parseISO(item.due_date);
        const daysToDue = differenceInDays(dueDate, new Date());

        let alertColor = theme.colors.text + '60'; // Cor padrão (cinza/opaco)
        let alertText = '';

        if (daysToDue <= 7 && daysToDue >= 0) {
            alertColor = '#F44336'; // Vermelho
            alertText = `Vence em ${daysToDue} dias!`;
        } else if (daysToDue <= 30 && daysToDue > 7) {
            alertColor = '#FFC107'; // Amarelo
            alertText = `Vence em ${daysToDue} dias`;
        }

        // Invoice Status Calculation
        let invoiceStatus = '';
        if (item.payment_method === 'credit_card' && item.credit_cards && item.charge_day) {
            const closingDay = item.credit_cards.closing_day;
            if (item.charge_day <= closingDay) {
                invoiceStatus = 'Na fatura atual';
            } else {
                invoiceStatus = 'Na próxima fatura';
            }
        }

        return (
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {/* Header (Wallet Card Style) */}
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={getIcon(item.type) as any} size={24} color={theme.colors.primary} />
                        <Text style={[styles.insurer, { color: theme.colors.text }]}> {item.insurer}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={() => onEdit(item)}>
                            <Ionicons name="pencil" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.id, item.insurer)}>
                            <Ionicons name="trash" size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.body}>
                    <Text style={[styles.typeLabel, { color: theme.colors.text + '80' }]}>
                        Seguro {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </Text>

                    {item.policy_number && (
                        <Text style={[styles.policy, { color: theme.colors.text }]}>
                            Apólice: {item.policy_number}
                        </Text>
                    )}

                    {item.payment_method === 'credit_card' && item.credit_cards && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons name="card-outline" size={14} color={theme.colors.text + '80'} />
                            <Text style={{ fontSize: 12, color: theme.colors.text + '80', marginLeft: 4 }}>
                                Pago no {item.credit_cards.name} • {invoiceStatus}
                            </Text>
                        </View>
                    )}

                    {item.coverage_summary && (
                        <Text style={[styles.coverage, { color: theme.colors.text + '90' }]}>
                            {item.coverage_summary}
                        </Text>
                    )}

                    <View style={styles.footer}>
                        <View>
                            <Text style={[styles.label, { color: theme.colors.text + '80' }]}>Valor do Prêmio</Text>
                            <Text style={[styles.value, { color: theme.colors.text }]}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.premium_amount)}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.label, { color: theme.colors.text + '80' }]}>Vencimento</Text>
                            <Text style={[styles.date, { color: alertText ? alertColor : theme.colors.text }]}>
                                {format(dueDate, 'dd/MM/yyyy')}
                            </Text>
                            {alertText ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    <Ionicons name="warning" size={12} color={alertColor} />
                                    <Text style={{ fontSize: 10, color: alertColor, marginLeft: 4, fontWeight: 'bold' }}>{alertText}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={insurances}
                renderItem={renderCard}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 20 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchInsurances} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ color: theme.colors.text, fontFamily: 'SpaceGrotesk-Regular' }}>Nenhum seguro cadastrado.</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    insurer: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 18,
        marginLeft: 8,
    },
    body: {
        padding: 16,
    },
    typeLabel: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    policy: {
        fontFamily: 'SpaceGrotesk-Medium',
        fontSize: 16,
        marginBottom: 8,
        letterSpacing: 2, // Monospace feel
    },
    coverage: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 12,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    label: {
        fontSize: 12,
    },
    value: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    date: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
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
