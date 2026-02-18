import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, Alert, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../theme';
import { useQueryClient } from '@tanstack/react-query';

import { CreditCard } from '../../types';
import { useCreditCards } from '../../hooks/useCreditCards';
import { CreditCard3D } from './CreditCard3D';
import { CreditCardDetailsModal } from './CreditCardDetailsModal';

interface CreditCardsTabProps {
    refreshTrigger: number;
    onEdit: (item: CreditCard) => void;
    onRegisterPurchase?: (cardId: string) => void;
}

export const CreditCardsTab = ({ refreshTrigger, onEdit, onRegisterPurchase }: CreditCardsTabProps) => {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const { cards, deleteCreditCard, isLoading: hookLoading } = useCreditCards();
    const [expensesMap, setExpensesMap] = useState<Record<string, number>>({});
    const [loadingExpenses, setLoadingExpenses] = useState(false);

    const fetchExpenses = useCallback(async () => {
        if (!cards.length) return;
        setLoadingExpenses(true);
        try {
            // Buscar faturas abertas COM installments para recalcular total se necessário
            const { data, error } = await supabase
                .from('credit_card_invoices')
                .select('id, card_id, total_amount, status, installments(amount)')
                .in('card_id', cards.map(c => c.id))
                .eq('status', 'open')
                .order('year', { ascending: true })
                .order('month', { ascending: true });

            if (error) throw error;

            const newMap: Record<string, number> = {};
            const grouped = (data || []).reduce((acc, inv) => {
                if (!acc[inv.card_id]) {
                    acc[inv.card_id] = [];
                }
                acc[inv.card_id].push(inv);
                return acc;
            }, {} as Record<string, any[]>);

            // Para cada cartão, pegar a primeira fatura (fatura atual)
            for (const [cardId, invoices] of Object.entries(grouped)) {
                if (invoices.length > 0) {
                    const invoice = invoices[0];
                    let billAmount = Number(invoice.total_amount);

                    // Fallback: se total_amount = 0 mas tem installments, recalcular
                    if (billAmount === 0 && invoice.installments && invoice.installments.length > 0) {
                        billAmount = invoice.installments.reduce((sum: number, inst: any) => sum + Number(inst.amount), 0);
                        console.log(`🔧 [FIX] Cartão ${cardId}: total_amount era 0, recalculado = R$ ${billAmount.toFixed(2)}`);

                        // Corrigir no banco também (auto-fix)
                        await supabase
                            .from('credit_card_invoices')
                            .update({ total_amount: billAmount })
                            .eq('id', invoice.id);
                    }

                    newMap[cardId] = billAmount;
                    console.log(`💳 [DEBUG] Cartão ${cardId}: Fatura Atual = R$ ${billAmount.toFixed(2)}`);
                }
            }

            console.log('💰 [DEBUG] Mapa de faturas atuais:', newMap);
            setExpensesMap(newMap);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoadingExpenses(false);
        }
    }, [cards]);

    useFocusEffect(
        useCallback(() => {
            fetchExpenses();
        }, [fetchExpenses, refreshTrigger])
    );

    // Re-fetch faturas quando cards são invalidados (após nova compra)
    useEffect(() => {
        if (cards.length > 0) {
            fetchExpenses();
        }
    }, [cards, refreshTrigger]);

    const handleDelete = async (id: string, name: string) => {
        if (Platform.OS === 'web') {
            const confirm = window.confirm(`Tem certeza que deseja excluir "${name}"?`);
            if (confirm) {
                try {
                    await deleteCreditCard.mutateAsync(id);
                } catch (error: any) {
                    alert('Erro ao excluir cartão: ' + error.message);
                }
            }
        } else {
            Alert.alert(
                'Excluir Cartão',
                `Tem certeza que deseja excluir "${name}"?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteCreditCard.mutateAsync(id);
                            } catch (error: any) {
                                Alert.alert('Erro', 'Não foi possível excluir o item.');
                            }
                        }
                    }
                ]
            );
        }
    };

    const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

    const renderCard = ({ item }: { item: CreditCard }) => {
        const calculatedBill = expensesMap[item.id] || 0;

        return (
            <View style={{ marginBottom: 16 }}>
                <CreditCard3D
                    card={item}
                    currentBill={calculatedBill}
                    onEdit={onEdit}
                    onDelete={(id) => handleDelete(id, item.name)}
                    onPress={() => setSelectedCard(item)}
                />
                <TouchableOpacity
                    onPress={() => onRegisterPurchase?.(item.id)}
                    style={{
                        marginTop: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.colors.primary + '15',
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: theme.colors.primary + '30',
                        marginHorizontal: spacing[1] || 0
                    }}
                >
                    <Ionicons name="cart-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: theme.colors.primary, fontFamily: 'SpaceGrotesk-Bold' }}>Nova Compra</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (hookLoading && !cards.length) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <FlatList
                data={cards}
                renderItem={renderCard}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, paddingTop: 20 }}
                refreshControl={<RefreshControl refreshing={loadingExpenses || hookLoading} onRefresh={fetchExpenses} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ color: theme.colors.text, fontFamily: 'SpaceGrotesk-Regular' }}>Nenhum cartão cadastrado.</Text>
                    </View>
                }
            />

            <CreditCardDetailsModal
                visible={!!selectedCard}
                card={selectedCard}
                currentBill={selectedCard ? (expensesMap[selectedCard.id] || 0) : 0}
                onClose={() => setSelectedCard(null)}
                onRegisterPurchase={onRegisterPurchase}
            />
        </View>
    );
};

const styles = StyleSheet.create({});
