import React, { useEffect, useState, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Dimensions, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard3D } from './CreditCard3D';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { CreditCard } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { debugCreditCardSystem } from '../../utils/debugCreditCards';


interface CreditCardDetailsModalProps {
    visible: boolean;
    onClose: () => void;
    card: CreditCard | null;
    currentBill: number;
    onRegisterPurchase?: (cardId: string) => void;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
}

interface BillHistoryItem {
    month: string;
    year: number;
    amount: number;
    status: 'paid' | 'open' | 'pending';
    paidDate?: string;
}

export const CreditCardDetailsModal = ({ visible, onClose, card, currentBill, onRegisterPurchase }: CreditCardDetailsModalProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [history, setHistory] = useState<BillHistoryItem[]>([]);
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

    const toggleInvoice = (invoiceId: string) => {
        setExpandedInvoiceId(prev => prev === invoiceId ? null : invoiceId);
    };


    const isMobile = Platform.OS !== 'web' || Dimensions.get('window').width < 768;

    useEffect(() => {
        if (visible && card) {
            fetchDetails();
        }
    }, [visible, card]);

    // ... inside CreditCardDetailsModal component

    const handlePayInvoice = async (invoice: any) => {
        if (!card) return;
        setLoading(true);
        try {
            // 1. Create Transaction (Cash Flow)
            const { error: txError } = await supabase.from('transactions').insert({
                user_id: user?.id,
                description: `Fatura ${card.name} - ${new Date(invoice.invoice_date).toLocaleDateString('pt-BR', { month: 'long' })}`,
                amount: invoice.amount,
                type: 'expense',
                category: 'Cartão de Crédito',
                date: new Date().toISOString(),
                paid: true,
                paid_at: new Date().toISOString(),
                origin: 'credit_card_payment',
                credit_card_id: card.id,
                // invoice_id: invoice.id // If we added this column to transactions
            });

            if (txError) throw txError;

            // 2. Update Invoice Status
            const { error: invError } = await supabase
                .from('credit_card_invoices')
                .update({
                    status: 'paid',
                    paid_at: new Date().toISOString(),
                    paid_amount: invoice.amount
                })
                .eq('id', invoice.id);

            if (invError) throw invError;

            // 3. Update Installments Status
            const { error: instError } = await supabase
                .from('installments')
                .update({ status: 'paid' })
                .eq('invoice_id', invoice.id);

            if (instError) throw instError;

            // 4. Restore Credit Limit? 
            // Usually valid limit = limit - used_limit.
            // If used_limit accumulates all unpaid purchases, paying the bill should REDUCE used_limit.
            // Let's verify: used_limit increased on purchase.
            // So yes, we must decrease used_limit by the paid amount.

            const { data: cardData } = await supabase.from('credit_cards').select('used_limit').eq('id', card.id).single();
            if (cardData) {
                const newUsedLimit = Math.max(0, (cardData.used_limit || 0) - invoice.amount);
                await supabase.from('credit_cards').update({ used_limit: newUsedLimit }).eq('id', card.id);
            }

            Alert.alert("Sucesso", "Fatura paga com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
            fetchDetails();

        } catch (error: any) {
            Alert.alert("Erro", error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchDetails = async () => {
        if (!card) return;
        setLoading(true);
        try {
            console.log('🔍 [DEBUG] Buscando detalhes do cartão:', card.id);

            // 🔧 DIAGNÓSTICO COMPLETO
            await debugCreditCardSystem(card.id);

            // Fetch Invoices with Installments
            const { data, error } = await supabase
                .from('credit_card_invoices')
                .select(`
                    *,
                    installments (
                        id, amount, due_date, installment_number,
                        credit_card_transactions (description, category, installment_count, created_at)
                    )
                `)
                .eq('card_id', card.id)
                .order('year', { ascending: true })
                .order('month', { ascending: true });

            if (error) {
                console.error('❌ [DEBUG] Erro na query:', error);
                throw error;
            }

            console.log('📊 [DEBUG] Dados retornados:', data?.length || 0, 'faturas');

            if (data) {
                // Map to friendly structure
                const formattedInvoices = data.map((inv: any) => {
                    // Recalcular total a partir das installments se total_amount = 0
                    let invoiceAmount = Number(inv.total_amount);
                    if (invoiceAmount === 0 && inv.installments && inv.installments.length > 0) {
                        invoiceAmount = inv.installments.reduce((sum: number, inst: any) => sum + Number(inst.amount), 0);
                        console.log(`🔧 [FIX Details] Invoice ${inv.id}: total recalculado = R$ ${invoiceAmount.toFixed(2)}`);
                        // Auto-fix no banco
                        supabase.from('credit_card_invoices').update({ total_amount: invoiceAmount }).eq('id', inv.id);
                    }

                    const items = inv.installments?.map((inst: any) => ({
                        id: inst.id,
                        amount: inst.amount,
                        description: inst.credit_card_transactions?.description || 'Parcela',
                        date: inst.credit_card_transactions?.created_at || inst.due_date,
                        category: inst.credit_card_transactions?.category,
                        installmentNumber: inst.installment_number,
                        totalInstallments: inst.credit_card_transactions?.installment_count
                    })) || [];

                    return {
                        id: inv.id,
                        dueDate: new Date(inv.due_date),
                        closingDate: inv.closing_date ? new Date(inv.closing_date) : new Date(),
                        month: inv.month - 1,
                        year: inv.year,
                        amount: invoiceAmount,
                        status: inv.status,
                        items
                    };
                });

                console.log('✅ [DEBUG] Faturas formatadas:', formattedInvoices.length);
                setInvoices(formattedInvoices);
            }

        } catch (error) {
            console.error('❌ [DEBUG] Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    // ... existing helper functions ...

    if (!card) return null;

    const limit = Number(card.limit_amount);
    // Use 'used_limit' if available, otherwise fallback to current_bill logic (legacy)
    const usedLimit = (card as any).used_limit !== undefined ? Number((card as any).used_limit) : currentBill;
    const available = limit - usedLimit;

    // Progress bar reflects used limit
    const progress = Math.min((usedLimit / limit) || 0, 1);
    const percentage = progress * 100;

    // ... 

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={Platform.OS === 'web'}
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: '#0f172a' }]}>
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {/* 1. Header */}
                        <View style={styles.header}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                                    <Ionicons name="chevron-down" size={28} color="#FFF" />
                                </TouchableOpacity>
                                <View style={[styles.colorDot, { backgroundColor: card.color }]} />
                                <View>
                                    <Text style={styles.title}>{card.name} • {card.last_four_digits || '0000'}</Text>
                                    <Text style={styles.subtitle}>Vence dia {card.due_day}</Text>
                                </View>
                            </View>

                            {/* Add Transaction Button */}
                            {onRegisterPurchase && (
                                <TouchableOpacity
                                    onPress={() => onRegisterPurchase(card.id)}
                                    style={styles.addButton}
                                >
                                    <Ionicons name="add" size={24} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 2. RESUMO RÁPIDO */}
                        <View style={styles.summaryRow}>
                            <View style={[styles.summaryBox, { borderLeftColor: card.color }]}>
                                <Text style={styles.label}>LIMITE UTILIZADO</Text>
                                <Text style={styles.value}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(usedLimit)}
                                </Text>
                            </View>

                            <View style={[styles.summaryBox, { borderLeftColor: '#10B981' }]}>
                                <Text style={styles.label}>LIMITE DISPONÍVEL</Text>
                                <Text style={[styles.value, { color: '#10B981' }]}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(available)}
                                </Text>
                            </View>
                        </View>

                        {/* 3. DETAILS PROGRESS */}
                        <View style={styles.progressSection}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.progressLabel}>{percentage.toFixed(0)}% Utilizado</Text>
                                <Text style={styles.progressTotal}>Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limit)}</Text>
                            </View>
                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: card.color }]} />
                            </View>
                        </View>

                        {/* 4. FATURA ATUAL */}
                        <View style={styles.section}>
                            {invoices.length === 0 ? (
                                <View style={styles.emptyStateContainer}>
                                    <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
                                    <Text style={styles.emptyStateTitle}>Nenhuma fatura encontrada</Text>
                                    <Text style={styles.emptyStateText}>
                                        {usedLimit > 0
                                            ? '⚠️ O limite está ocupado mas não há faturas!\n\nVerifique o CONSOLE (F12) para diagnóstico.\n\nSe você fez compras recentemente, pode ser necessário aplicar as migrations no Supabase.\n\nVeja: RESTAURAR_CARTOES.md'
                                            : 'Você ainda não tem compras neste cartão.\n\nClique em "Nova Compra" para começar!'}
                                    </Text>
                                </View>
                            ) : (
                                (() => {
                                    const currentInvoice = invoices[0];
                                    const isPaid = currentInvoice.status === 'paid';
                                    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentInvoice.dueDate);

                                    return (
                                        <>
                                            <Text style={styles.sectionTitle}>
                                                Fatura Atual - {monthName.charAt(0).toUpperCase() + monthName.slice(1)}/{currentInvoice.year}
                                            </Text>
                                            <View style={styles.currentInvoiceCard}>
                                                <View style={styles.invoiceHeader}>
                                                    <View>
                                                        <Text style={styles.invoiceLabel}>VENCIMENTO</Text>
                                                        <Text style={styles.invoiceDate}>
                                                            {currentInvoice.dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </Text>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={styles.invoiceLabel}>VALOR TOTAL</Text>
                                                        <Text style={styles.invoiceValue}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentInvoice.amount)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.statusBadgeContainer}>
                                                    <View style={[styles.statusBadge, { backgroundColor: isPaid ? '#10B98120' : '#F59E0B20' }]}>
                                                        <Text style={[styles.statusBadgeText, { color: isPaid ? '#10B981' : '#F59E0B' }]}>
                                                            {isPaid ? 'PAGA' : 'ABERTA'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.divider} />

                                                {/* Action Button */}
                                                {!isPaid && (
                                                    <TouchableOpacity
                                                        style={styles.payButton}
                                                        onPress={() => handlePayInvoice(currentInvoice)}
                                                    >
                                                        <Ionicons name="card-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                                        <Text style={styles.payButtonText}>Pagar Fatura</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {/* Items List */}
                                                <View style={styles.itemsContainer}>
                                                    <Text style={styles.itemsTitle}>Lançamentos</Text>
                                                    {currentInvoice.items.map((item: any) => (
                                                        <View key={item.id} style={styles.expenseItem}>
                                                            <View style={styles.expenseLeft}>
                                                                <View style={[styles.iconBox, { backgroundColor: `${card.color}20` }]}>
                                                                    <Ionicons name="cart" size={16} color={card.color} />
                                                                </View>
                                                                <View>
                                                                    <Text style={styles.expenseDesc}>{item.description}</Text>
                                                                    <Text style={styles.expenseSub}>
                                                                        {new Date(item.date).toLocaleDateString('pt-BR')} • {item.totalInstallments > 1 ? `${item.installmentNumber}/${item.totalInstallments}` : 'À vista'}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            <Text style={styles.expenseAmount}>
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        </>
                                    );
                                })()
                            )}
                        </View>

                        {/* 5. PRÓXIMAS FATURAS */}
                        {invoices.length > 1 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Próximas Faturas</Text>
                                {invoices.slice(1).map((invoice: any, index: number) => {
                                    const isExpanded = expandedInvoiceId === invoice.id;
                                    return (
                                        <TouchableOpacity
                                            key={invoice.id || index}
                                            style={[styles.futureInvoiceRow, isExpanded && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                                            onPress={() => toggleInvoice(invoice.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                    <View style={styles.futureInvoiceLeft}>
                                                        <View style={styles.calendarBox}>
                                                            <Text style={styles.calendarMonth}>
                                                                {new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(invoice.dueDate).toUpperCase().replace('.', '')}
                                                            </Text>
                                                            <Text style={styles.calendarDay}>{invoice.year}</Text>
                                                        </View>
                                                        <View>
                                                            <Text style={styles.futureInvoiceTitle}>
                                                                Fatura {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(invoice.dueDate)}/{invoice.year}
                                                            </Text>
                                                            <Text style={styles.futureInvoiceSub}>
                                                                Vence {invoice.dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {invoice.items.length} itens
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={styles.futureInvoiceAmount}>
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}
                                                        </Text>
                                                        <Ionicons
                                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                                            size={16}
                                                            color="#64748B"
                                                        />
                                                    </View>
                                                </View>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 }}>
                                                        {invoice.items.map((item: any) => (
                                                            <View key={item.id} style={[styles.expenseItem, { paddingVertical: 8 }]}>
                                                                <View style={styles.expenseLeft}>
                                                                    <View style={[styles.iconBox, { backgroundColor: 'transparent', width: 24, height: 24 }]}>
                                                                        <Ionicons name="ellipse" size={8} color={card?.color || '#ccc'} />
                                                                    </View>
                                                                    <View>
                                                                        <Text style={[styles.expenseDesc, { fontSize: 13 }]}>{item.description}</Text>
                                                                        <Text style={[styles.expenseSub, { fontSize: 10 }]}>
                                                                            {new Date(item.date).toLocaleDateString('pt-BR')} • {item.totalInstallments > 1 ? `${item.installmentNumber}/${item.totalInstallments}` : 'À vista'}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                                <Text style={[styles.expenseAmount, { fontSize: 13 }]}>
                                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* 5. Historico (Unchanged) */}
                        <View style={styles.section}>
                            {/* ... */}
                        </View>

                        {/* AÇÕES */}
                        {/* Keep actions but maybe dynamically point to the "First" invoice as current bill? */}

                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 10,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8
    },
    backButton: {
        marginRight: 12,
    },
    colorDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        fontFamily: 'SpaceGrotesk-Bold',
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 2,
        fontFamily: 'Inter-Regular',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    summaryBox: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
    },
    label: {
        fontSize: 10,
        color: '#94A3B8',
        marginBottom: 4,
        fontFamily: 'Inter-Medium',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        fontFamily: 'SpaceGrotesk-Bold',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
        fontFamily: 'Inter-Bold',
    },
    billDetails: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowLabel: {
        fontSize: 13,
        color: '#94A3B8',
        fontFamily: 'Inter-Regular',
    },
    rowValue: {
        fontSize: 13,
        color: '#FFF',
        fontFamily: 'Inter-Medium',
    },
    progressSection: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontFamily: 'Inter-Medium',
    },
    progressTotal: {
        fontSize: 12,
        color: '#FFF',
        fontFamily: 'SpaceGrotesk-Medium',
    },
    progressContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: '#64748B',
        textAlign: 'right',
        fontFamily: 'Inter-Regular',
    },
    historyGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    monthItem: {
        width: '23.4%', // Adjusted for 4 per line with gap
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    monthName: {
        fontSize: 10,
        color: '#64748B',
        textTransform: 'uppercase',
        fontFamily: 'Inter-Medium',
    },
    monthValue: {
        fontSize: 11,
        color: '#FFF',
        fontWeight: '600',
        marginVertical: 4,
        fontFamily: 'SpaceGrotesk-Medium',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseDesc: {
        fontSize: 14,
        color: '#FFF',
        fontFamily: 'Inter-Medium',
    },
    expenseDate: {
        fontSize: 11,
        color: '#64748B',
        fontFamily: 'Inter-Regular',
    },
    expenseAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
        fontFamily: 'SpaceGrotesk-Bold',
    },
    actions: {
        marginTop: 8,
    },
    primaryButton: {
        height: 54,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Inter-Bold',
    },
    emptyStateText: {
        color: '#64748B', fontFamily: 'Inter-Regular', fontSize: 13, textAlign: 'center', marginTop: 8
    },
    emptyStateContainer: {
        alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12
    },
    emptyStateTitle: {
        color: '#FFF', fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, marginTop: 12
    },
    currentInvoiceCard: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    invoiceHeader: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16
    },
    invoiceLabel: {
        fontSize: 10, color: '#94A3B8', fontFamily: 'Inter-Bold', letterSpacing: 1, marginBottom: 4
    },
    invoiceDate: {
        fontSize: 16, color: '#FFF', fontFamily: 'SpaceGrotesk-Medium', textTransform: 'uppercase'
    },
    invoiceValue: {
        fontSize: 20, color: '#FFF', fontFamily: 'SpaceGrotesk-Bold'
    },
    divider: {
        height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16
    },
    payButton: {
        backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginBottom: 24
    },
    payButtonText: {
        color: '#FFF', fontFamily: 'Inter-Bold', fontSize: 14
    },
    statusBadgeContainer: {
        marginBottom: 16,
        alignItems: 'flex-start'
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    statusBadgeText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold'
    },
    itemsContainer: {
        gap: 0
    },
    itemsTitle: {
        color: '#94A3B8', fontSize: 12, fontFamily: 'Inter-Medium', marginBottom: 12, textTransform: 'uppercase'
    },
    expenseSub: {
        fontSize: 11, color: '#64748B', fontFamily: 'Inter-Regular'
    },
    futureInvoiceRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 8
    },
    futureInvoiceLeft: {
        flexDirection: 'row', alignItems: 'center', gap: 12
    },
    calendarBox: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 8, alignItems: 'center', minWidth: 50
    },
    calendarMonth: {
        color: '#94A3B8', fontSize: 10, fontFamily: 'Inter-Bold'
    },
    calendarDay: {
        color: '#FFF', fontSize: 12, fontFamily: 'SpaceGrotesk-Bold'
    },
    futureInvoiceAmount: {
        color: '#FFF', fontSize: 14, fontFamily: 'SpaceGrotesk-Bold'
    },
    futureInvoiceTitle: {
        color: '#FFF', fontSize: 14, fontFamily: 'Inter-Bold', marginBottom: 2
    },
    futureInvoiceSub: {
        color: '#64748B', fontSize: 11, fontFamily: 'Inter-Regular'
    }
});
