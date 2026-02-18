import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

import { useFocusEffect } from 'expo-router';

import { Subscription } from '../../types';

interface SubscriptionsTabProps {
    refreshTrigger: number;
    onEdit: (item: Subscription) => void;
}

export const SubscriptionsTab = ({ refreshTrigger, onEdit }: SubscriptionsTabProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubs = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*, credit_cards(name, closing_day)')
                .eq('user_id', user.id)
                .order('due_day', { ascending: true });

            if (error) throw error;
            setSubscriptions(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchSubs();
        }, [fetchSubs, refreshTrigger])
    );

    const handleDelete = async (id: string, name: string) => {
        Alert.alert(
            'Excluir Assinatura',
            `Tem certeza que deseja excluir "${name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('subscriptions').delete().eq('id', id);
                            if (error) throw error;
                            fetchSubs();
                        } catch (error: any) {
                            Alert.alert('Erro', 'Não foi possível excluir o item.');
                        }
                    }
                }
            ]
        );
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'streaming': return 'play-circle-outline';
            case 'servicos': return 'construct-outline';
            case 'educacao': return 'school-outline';
            case 'saude': return 'fitness-outline';
            case 'software': return 'desktop-outline';
            default: return 'calendar-outline';
        }
    };

    const renderItem = ({ item, index }: { item: Subscription, index: number }) => {
        const todayDay = new Date().getDate();
        const isPastDue = item.due_day < todayDay;
        const isToday = item.due_day === todayDay;

        // Use updated installment logic
        // If installments > 0, show "x/Y" (e.g. 1/12)
        // We rely on current_installment which should be updated by a cron or manually
        // For now, let's display totals.

        let paymentInfo = '';
        if (item.payment_method === 'credit_card' && item.credit_cards) {
            paymentInfo = `${item.credit_cards.name}`;
        } else if (item.payment_method === 'boleto') {
            paymentInfo = 'Boleto';
        } else if (item.payment_method === 'pix') {
            paymentInfo = 'Pix';
        } else {
            paymentInfo = 'Débito';
        }

        let durationLabel = '';
        if (item.service_duration_type === 'fixed' && item.payment_installments > 0) {
            durationLabel = `${item.payment_installments}x`;
        } else if (item.service_duration_type === 'lifetime') {
            durationLabel = 'Vitalício';
        } else {
            durationLabel = 'Mensal';
        }

        return (
            <View style={styles.timelineRow}>
                {/* Timeline Column */}
                <View style={[styles.timelineCol, { alignItems: 'center' }]}>
                    <View style={[styles.timelineLine, { backgroundColor: theme.colors.border }, index === subscriptions.length - 1 && { height: '50%' }]} />
                    <View style={[
                        styles.timelineDot,
                        {
                            backgroundColor: isToday ? theme.colors.primary : (isPastDue ? theme.colors.text : theme.colors.card),
                            borderColor: theme.colors.border,
                            borderWidth: isPastDue ? 0 : 2
                        }
                    ]}>
                        <Text style={[styles.dayText, { color: isToday ? '#FFF' : theme.colors.text, fontSize: 10 }]}>
                            {item.due_day}
                        </Text>
                    </View>
                </View>

                {/* Content Card */}
                <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, flex: 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.background, marginRight: 12 }]}>
                            <Ionicons name={getIcon(item.category) as any} size={20} color={theme.colors.primary} />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Text style={[styles.category, { color: theme.colors.text + '90', marginRight: 8 }]}>
                                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                </Text>
                                <View style={{ backgroundColor: theme.colors.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, color: theme.colors.primary, fontFamily: 'SpaceGrotesk-Bold' }}>
                                        {durationLabel}
                                    </Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Ionicons name="card-outline" size={12} color={theme.colors.text + '80'} />
                                <Text style={{ fontSize: 10, color: theme.colors.text + '80', marginLeft: 4 }}>
                                    {paymentInfo}
                                </Text>
                            </View>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 5 }}>
                                <TouchableOpacity onPress={() => onEdit(item)}>
                                    <Ionicons name="pencil" size={16} color={theme.colors.text} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                                    <Ionicons name="trash" size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.amount, { color: theme.colors.text }]}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                            </Text>
                            {item.payment_installments > 0 && (
                                <Text style={{ fontSize: 10, color: theme.colors.text + '80' }}>
                                    {item.current_installment || 1}/{item.payment_installments}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={subscriptions}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 20 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchSubs} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ color: theme.colors.text, fontFamily: 'SpaceGrotesk-Regular' }}>Nenhuma assinatura encontrada.</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    timelineCol: {
        width: 40,
        marginRight: 10,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        left: '50%',
        marginLeft: -1,
    },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
        marginTop: 16, // Center visually with card
    },
    dayText: {
        fontFamily: 'SpaceGrotesk-Bold',
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    category: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 12,
    },
    amount: {
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
