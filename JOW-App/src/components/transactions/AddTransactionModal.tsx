import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform, KeyboardAvoidingView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { JowInsightPanel } from '../../components/ai/JowInsightPanel';
import { usePurchaseImpact } from '../../hooks/usePurchaseImpact';

export interface TransactionInitialData {
    id?: string;
    amount?: string;
    description?: string;
    category?: string;
    installments?: string;
    paymentMethod?: 'cash' | 'credit';
    cardId?: string;
}

interface AddTransactionModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: TransactionInitialData | null;
}

const CATEGORIES = [
    { id: 'alimentacao', label: 'Alimentação', icon: 'fast-food' },
    { id: 'transporte', label: 'Transporte', icon: 'car' },
    { id: 'moradia', label: 'Moradia', icon: 'home' },
    { id: 'lazer', label: 'Lazer', icon: 'game-controller' },
    { id: 'saude', label: 'Saúde', icon: 'medkit' },
    { id: 'educacao', label: 'Educação', icon: 'school' },
    { id: 'compras', label: 'Compras', icon: 'bag' },
    { id: 'servicos', label: 'Serviços', icon: 'construct' },
    { id: 'outros', label: 'Outros', icon: 'code-working' },
];

export const AddTransactionModal = ({ visible, onClose, onSuccess, initialData }: AddTransactionModalProps) => {
    console.log("[DEBUG] AddTransactionModal visible:", visible, "initialData:", initialData);
    const { theme } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [loading, setLoading] = useState(false);
    const savingRef = useRef(false); // Lock anti-duplicidade
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('outros');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
    const [installments, setInstallments] = useState('1');
    const [creditCards, setCreditCards] = useState<any[]>([]);
    const [selectedCardId, setSelectedCardId] = useState<string>('');

    // JOW Mentor Logic
    const { analyzePurchase, analysis, loading: analyzing, clearAnalysis } = usePurchaseImpact();
    const [showSimulator, setShowSimulator] = useState(false);

    // Load Credit Cards
    useEffect(() => {
        if (visible && paymentMethod === 'credit') {
            fetchCreditCards();
        }
    }, [visible, paymentMethod]);

    // Reset form when modal closes
    useEffect(() => {
        if (!visible) {
            // Reseta o formulário quando o modal fecha
            resetForm();
        }
    }, [visible]);

    useEffect(() => {
        if (visible && initialData) {
            if (initialData.amount) setAmount(initialData.amount);
            if (initialData.description) setDescription(initialData.description);
            if (initialData.category) setCategory(initialData.category);
            if (initialData.installments) setInstallments(initialData.installments);

            if (initialData.paymentMethod) {
                setPaymentMethod(initialData.paymentMethod);
            } else if (initialData.installments && parseInt(initialData.installments) > 1) {
                setPaymentMethod('credit');
            }

            if (initialData.cardId) {
                setSelectedCardId(initialData.cardId);
                setPaymentMethod('credit');
            }
        }
    }, [visible, initialData]);

    const fetchCreditCards = async () => {
        const { data } = await supabase
            .from('credit_cards')
            .select('id, name, last_four_digits, color, closing_day, due_day')
            .eq('user_id', user?.id)
            .order('name');

        if (data && data.length > 0) {
            setCreditCards(data);
            // 🔧 CORREÇÃO: Só seta o primeiro cartão se não houver um pré-selecionado
            // Se initialData.cardId foi passado, ele já foi setado no useEffect acima
            if (!initialData?.cardId && !selectedCardId) {
                setSelectedCardId(data[0].id);
            }
        }
    };

    // Trigger AI Analysis
    useEffect(() => {
        const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        const numericInstallments = parseInt(installments);

        if (paymentMethod === 'credit' && numericInstallments > 1 && numericAmount > 0) {
            // Debounce analysis could be added here
            const timer = setTimeout(() => {
                analyzePurchase(numericAmount, numericInstallments);
            }, 800);
            return () => clearTimeout(timer);
        } else {
            clearAnalysis();
        }
    }, [amount, installments, paymentMethod]);

    const handleSave = async () => {
        if (loading || savingRef.current) return; // Prevent double save (state + ref)
        savingRef.current = true; // Lock imediato (antes do setState async)
        if (!amount || !description) {
            savingRef.current = false;
            Alert.alert('Erro', 'Preencha valor e descrição');
            return;
        }

        setLoading(true);
        try {
            const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));

            // Validate Credit Card Selection
            if (paymentMethod === 'credit' && !selectedCardId) {
                Alert.alert('Erro', 'Selecione um cartão de crédito');
                setLoading(false);
                savingRef.current = false;
                return;
            }

            const isEditing = !!initialData?.id;
            const transactionId = initialData?.id;

            console.log('🔍 [SAVE DEBUG] paymentMethod:', paymentMethod);
            console.log('🔍 [SAVE DEBUG] selectedCardId:', selectedCardId);
            console.log('🔍 [SAVE DEBUG] installments:', installments);
            console.log('🔍 [SAVE DEBUG] creditCards loaded:', creditCards.length);
            console.log('Modo:', isEditing ? 'EDITANDO' : 'CRIANDO');
            console.log('ID da transação:', transactionId);
            console.log('Ação:', isEditing ? 'UPDATE' : 'INSERT');

            const payload: any = {
                user_id: user?.id,
                amount: numericAmount,
                description,
                category,
                type: 'expense',
            };

            // If not editing, set the date
            if (!isEditing) {
                payload.date = new Date().toISOString();
            }

            if (paymentMethod === 'credit') {
                const installmentsCount = parseInt(installments) || 1;
                const selectedCard = creditCards.find(c => c.id === selectedCardId);

                if (!selectedCard) throw new Error("Cartão não encontrado");

                // --- 1. HANDLE UPDATE LOGIC (REVERSE OLD IMPACT) ---
                if (isEditing && transactionId) {
                    const { data: oldTx } = await supabase
                        .from('credit_card_transactions')
                        .select('total_amount, credit_card_id')
                        .eq('id', transactionId)
                        .single();

                    if (oldTx) {
                        // Reverse limit impact on OLD card
                        const { data: oldCard } = await supabase
                            .from('credit_cards')
                            .select('used_limit')
                            .eq('id', oldTx.credit_card_id)
                            .single();

                        if (oldCard) {
                            await supabase.from('credit_cards').update({
                                used_limit: Math.max(0, (oldCard.used_limit || 0) - oldTx.total_amount)
                            }).eq('id', oldTx.credit_card_id);
                        }

                        // Delete old installments - simplified, trigger will handle invoice totals
                        await supabase.from('installments').delete().eq('credit_card_transaction_id', transactionId);
                    }
                }

                // --- 2. PREPARE NEW TRANSACTION DATA ---
                // [REGRAS DEFINITIVAS DE FATURA]
                // - Compra DEPOIS do fechamento (dia > closing_day) → Próxima fatura (mês seguinte)
                // - Compra ANTES/NO fechamento (dia <= closing_day) → Fatura atual (este mês)
                // - Vencimento: due_day do mês SEGUINTE à fatura
                const today = new Date();
                const closingDay = selectedCard.closing_day || 1;
                const dueDay = selectedCard.due_day || 10;
                const currentDay = today.getDate();

                // Calcular mês/ano da FATURA base (parcela 1)
                let baseInvoiceMonth: number; // 0-indexed (JS Date)
                let baseInvoiceYear: number;

                if (currentDay > closingDay) {
                    // Depois do fechamento → Próxima fatura (mês que vem)
                    baseInvoiceMonth = today.getMonth() + 1;
                    baseInvoiceYear = today.getFullYear();
                    if (baseInvoiceMonth > 11) {
                        baseInvoiceMonth = 0;
                        baseInvoiceYear += 1;
                    }
                } else {
                    // Antes/no dia do fechamento → Fatura atual (este mês)
                    baseInvoiceMonth = today.getMonth();
                    baseInvoiceYear = today.getFullYear();
                }

                // Vencimento da 1ª parcela: due_day do mês SEGUINTE à fatura
                let firstDueMonth = baseInvoiceMonth + 1;
                let firstDueYear = baseInvoiceYear;
                if (firstDueMonth > 11) {
                    firstDueMonth = 0;
                    firstDueYear += 1;
                }
                const firstInstallmentDate = new Date(firstDueYear, firstDueMonth, dueDay);

                console.log(`📅 [FATURA] Compra dia ${currentDay}, fecha dia ${closingDay}, vence dia ${dueDay}`);
                console.log(`📅 [FATURA] ${currentDay > closingDay ? 'DEPOIS' : 'ANTES'} do fechamento`);
                console.log(`📅 [FATURA] Fatura base: ${baseInvoiceMonth + 1}/${baseInvoiceYear}`);
                console.log(`📅 [FATURA] Vencimento 1ª parcela: ${firstInstallmentDate.toLocaleDateString('pt-BR')}`);

                const installmentValue = numericAmount / installmentsCount;

                const parentPayload = {
                    user_id: user?.id,
                    credit_card_id: selectedCardId,
                    description,
                    total_amount: numericAmount,
                    installment_count: installmentsCount,
                    installment_value: installmentValue,
                    category,
                    first_installment_date: firstInstallmentDate.toISOString(),
                    status: 'active'
                };

                let parentTxId = transactionId;

                if (isEditing && transactionId) {
                    // UPDATE Parent
                    const { error: updateError } = await supabase
                        .from('credit_card_transactions')
                        .update(parentPayload)
                        .eq('id', transactionId);
                    if (updateError) throw updateError;
                } else {
                    // INSERT Parent
                    const { data: newParent, error: insertError } = await supabase
                        .from('credit_card_transactions')
                        .insert(parentPayload)
                        .select()
                        .single();
                    if (insertError) throw insertError;
                    parentTxId = newParent.id;
                }

                // --- 3. CREATE INSTALLMENTS & INVOICES ---
                // Agrupar parcelas por invoice para atualizar total_amount depois
                const invoiceAmounts: Record<string, number> = {};

                for (let i = 0; i < installmentsCount; i++) {
                    // Fatura da parcela i: baseInvoiceMonth + i
                    let invMonth0 = baseInvoiceMonth + i; // 0-indexed
                    let invYear = baseInvoiceYear;
                    // Normalizar overflow de mês
                    while (invMonth0 > 11) {
                        invMonth0 -= 12;
                        invYear += 1;
                    }
                    const invMonth = invMonth0 + 1; // 1-indexed para banco
                    const invMonthStr = `${invYear}-${String(invMonth).padStart(2, '0')}`;

                    // Vencimento: due_day do mês SEGUINTE à fatura
                    let dueDateMonth0 = invMonth0 + 1;
                    let dueDateYear = invYear;
                    if (dueDateMonth0 > 11) {
                        dueDateMonth0 = 0;
                        dueDateYear += 1;
                    }
                    const dueDate = new Date(dueDateYear, dueDateMonth0, dueDay);
                    const closingDate = new Date(invYear, invMonth0, closingDay);

                    console.log(`📅 [PARCELA ${i + 1}/${installmentsCount}] Fatura: ${invMonth}/${invYear} | Vencimento: ${dueDate.toLocaleDateString('pt-BR')}`);

                    let invoiceId;
                    const { data: existingInvoice } = await supabase
                        .from('credit_card_invoices')
                        .select('id')
                        .eq('card_id', selectedCardId)
                        .eq('month', invMonth)
                        .eq('year', invYear)
                        .maybeSingle();

                    if (existingInvoice) {
                        invoiceId = existingInvoice.id;
                    } else {
                        const { data: newInv, error: invErr } = await supabase
                            .from('credit_card_invoices')
                            .insert({
                                user_id: user?.id,
                                card_id: selectedCardId, month: invMonth, year: invYear,
                                due_date: dueDate.toISOString().split('T')[0],
                                closing_date: closingDate.toISOString().split('T')[0],
                                total_amount: 0, status: 'open'
                            })
                            .select('id').single();
                        if (invErr) throw invErr;
                        invoiceId = newInv.id;
                    }

                    const { error: instError } = await supabase
                        .from('installments')
                        .insert({
                            credit_card_transaction_id: parentTxId,
                            installment_number: i + 1,
                            amount: installmentValue,
                            due_date: dueDate.toISOString(),
                            invoice_month: invMonthStr,
                            status: 'pending',
                            invoice_id: invoiceId
                        });
                    if (instError) throw instError;

                    // Acumular valor por invoice para atualizar total_amount
                    invoiceAmounts[invoiceId] = (invoiceAmounts[invoiceId] || 0) + installmentValue;
                }

                // --- 3.5 ATUALIZAR total_amount de CADA invoice manualmente ---
                // (Fallback para caso o trigger do banco não esteja ativo)
                for (const [invoiceId, addedAmount] of Object.entries(invoiceAmounts)) {
                    // Buscar total atual + somar novo valor
                    const { data: currentInv } = await supabase
                        .from('credit_card_invoices')
                        .select('total_amount')
                        .eq('id', invoiceId)
                        .single();

                    const currentTotal = Number(currentInv?.total_amount || 0);
                    // Se o trigger já atualizou, o total já inclui o addedAmount.
                    // Se não, precisamos somar. Verificamos recalculando do zero:
                    const { data: sumData } = await supabase
                        .from('installments')
                        .select('amount')
                        .eq('invoice_id', invoiceId);

                    const recalculatedTotal = (sumData || []).reduce((sum: number, inst: any) => sum + Number(inst.amount), 0);

                    await supabase
                        .from('credit_card_invoices')
                        .update({ total_amount: recalculatedTotal })
                        .eq('id', invoiceId);

                    console.log(`✅ Invoice ${invoiceId}: total_amount atualizado para R$ ${recalculatedTotal.toFixed(2)}`);
                }

                // --- 4. UPDATE LIMITS ---
                const { data: cardData } = await supabase.from('credit_cards').select('used_limit').eq('id', selectedCardId).single();
                if (cardData) {
                    await supabase.from('credit_cards').update({
                        used_limit: (cardData.used_limit || 0) + numericAmount,
                    }).eq('id', selectedCardId);
                }

            } else {
                // CASH / DEBIT Logic
                payload.paid = true;
                if (isEditing && transactionId) {
                    const { error } = await supabase.from('transactions').update(payload).eq('id', transactionId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('transactions').insert(payload);
                    if (error) throw error;
                }
            }

            // Invalidar TODAS as queries relacionadas para garantir refresh
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
            await queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
            // Invalidar queries do Diário para refletir mudanças imediatamente
            await queryClient.invalidateQueries({ queryKey: ['diary_transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['diary_installments'] });

            if (onSuccess) onSuccess();
            resetForm();
            onClose();

        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
            savingRef.current = false; // Liberar lock
        }
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setCategory('outros');
        setPaymentMethod('cash');
        setInstallments('1');
        clearAnalysis();
    };

    const Wrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
    const wrapperProps = Platform.OS === 'web'
        ? { style: styles.overlay }
        : { behavior: Platform.OS === "ios" ? "padding" : "height", style: styles.overlay } as any;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <Wrapper {...wrapperProps}>
                <View style={[styles.container, { backgroundColor: '#1e293b' }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Nova Transação</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>

                        {/* Tipo de Pagamento */}
                        <View style={styles.segmentContainer}>
                            {/* Option 1: À Vista (Cash ou Credit 1x) */}
                            <TouchableOpacity
                                style={[styles.segmentBtn,
                                (paymentMethod === 'cash' || (paymentMethod === 'credit' && installments === '1'))
                                && styles.segmentActive]}
                                onPress={() => {
                                    if (paymentMethod === 'credit' || selectedCardId || creditCards.length > 0) {
                                        // Contexto de cartão: "À Vista" = Credit 1x
                                        setPaymentMethod('credit');
                                        setInstallments('1');
                                    } else {
                                        // Sem cartão: "À Vista" = Cash
                                        setPaymentMethod('cash');
                                        setInstallments('1');
                                    }
                                }}
                            >
                                <Text style={[styles.segmentText,
                                (paymentMethod === 'cash' || (paymentMethod === 'credit' && installments === '1'))
                                && styles.segmentTextActive]}>
                                    {(paymentMethod === 'credit' || selectedCardId) ? 'À Vista no Cartão' : 'À Vista / Débito'}
                                </Text>
                            </TouchableOpacity>

                            {/* Option 2: Parcelado (Credit) */}
                            <TouchableOpacity
                                style={[styles.segmentBtn,
                                (paymentMethod === 'credit' && installments !== '1')
                                && styles.segmentActive]}
                                onPress={() => {
                                    setPaymentMethod('credit');
                                    if (installments === '1') setInstallments('2');
                                }}
                            >
                                <Text style={[styles.segmentText,
                                (paymentMethod === 'credit' && installments !== '1')
                                && styles.segmentTextActive]}>
                                    {(paymentMethod === 'credit' || selectedCardId) ? 'Parcelado no Cartão' : 'Crédito / Parcelado'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Valor */}
                        <Text style={styles.label}>VALOR (R$)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={text => setAmount(text.replace(/[^0-9.,]/g, ''))}
                        />

                        {/* Cartão & Parcelas (Condicional) */}
                        {paymentMethod === 'credit' && (
                            <View style={styles.creditRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>CARTÃO</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                        {creditCards.length === 0 ? (
                                            <Text style={{ color: '#94a3b8', fontSize: 13, padding: 10, fontStyle: 'italic' }}>Sem cartões</Text>
                                        ) : (
                                            creditCards.map(card => (
                                                <TouchableOpacity
                                                    key={card.id}
                                                    style={[
                                                        styles.cardChip,
                                                        selectedCardId === card.id && { borderColor: card.color || theme.colors.primary, backgroundColor: `${card.color}20` }
                                                    ]}
                                                    onPress={() => setSelectedCardId(card.id)}
                                                >
                                                    <View style={[styles.cardDot, { backgroundColor: card.color || '#ccc' }]} />
                                                    <Text style={styles.cardName}>{card.name}</Text>
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </ScrollView>
                                </View>
                                <View style={{ width: 100 }}>
                                    <Text style={[styles.label, installments === '1' && { opacity: 0.5 }]}>PARCELAS</Text>
                                    <TextInput
                                        style={[styles.input, { textAlign: 'center' }, installments === '1' && { opacity: 0.5, backgroundColor: '#1e293b' }]}
                                        value={installments}
                                        onChangeText={text => setInstallments(text.replace(/[^0-9]/g, ''))}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        editable={installments !== '1'} // Disable manual edit if in "À Vista" mode
                                    />
                                </View>
                            </View>
                        )}

                        {/* JOW INSIGHT PANEL (AI) */}
                        {(analyzing || (analysis && analysis.data)) && (
                            <View style={{ marginBottom: 24 }}>
                                <JowInsightPanel
                                    loading={analyzing}
                                    riskLevel={analysis?.riskLevel || 'safe'}
                                    data={analysis?.data!}
                                    onAction={(action) => {
                                        if (action === 'simulate') setShowSimulator(true);
                                    }}
                                />
                            </View>
                        )}

                        {/* SIMULATOR MODAL / VIEW */}
                        <Modal visible={showSimulator} animationType="slide" transparent={true} onRequestClose={() => setShowSimulator(false)}>
                            <View style={styles.overlay}>
                                <View style={[styles.container, { backgroundColor: '#1e293b' }]}>
                                    <View style={styles.header}>
                                        <Text style={styles.title}>Simulação: Comprar vs Investir</Text>
                                        <Pressable onPress={() => setShowSimulator(false)}>
                                            <Ionicons name="close" size={24} color={theme.colors.text} />
                                        </Pressable>
                                    </View>

                                    {analysis?.data && (
                                        <View>
                                            <Text style={styles.simulationText}>Se você investir <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>R$ {analysis.data.installmentValue.toFixed(2)}</Text> todo mês por {analysis.data.installments} meses (rendendo 1% a.m.), você teria:</Text>

                                            <View style={styles.simulationResult}>
                                                <Text style={styles.simulationLabel}>Total Acumulado</Text>
                                                <Text style={styles.simulationValue}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        analysis.data.installmentValue * ((Math.pow(1.01, analysis.data.installments) - 1) / 0.01)
                                                    )}
                                                </Text>
                                                <Text style={styles.simulationSub}>vs R$ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.data.installmentValue * analysis.data.installments)} (Custo da Compra)</Text>
                                            </View>

                                            <View style={{ backgroundColor: '#334155', padding: 12, borderRadius: 8, marginTop: 16 }}>
                                                <Text style={{ color: '#fff', fontSize: 14 }}>💡 Vale a pena esperar? Se não for urgente, investir o valor da parcela te dá lucro!</Text>
                                            </View>

                                            <TouchableOpacity
                                                style={[styles.saveButton, { backgroundColor: '#f59e0b', marginTop: 24 }]}
                                                onPress={() => setShowSimulator(false)}
                                            >
                                                <Text style={styles.saveButtonText}>Voltar para Transação</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </Modal>

                        {/* Descrição */}
                        <Text style={styles.label}>DESCRIÇÃO</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Mercado Semanal"
                            placeholderTextColor="#94a3b8"
                            value={description}
                            onChangeText={setDescription}
                        />

                        {/* Categoria */}
                        <Text style={styles.label}>CATEGORIA</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryItem,
                                        category === cat.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setCategory(cat.id)}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={20}
                                        color={category === cat.id ? '#FFF' : '#94a3b8'}
                                    />
                                    <Text style={[styles.categoryLabel, category === cat.id && { color: '#FFF' }]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Pressable
                            style={({ pressed }) => [
                                styles.saveButton,
                                { opacity: pressed ? 0.8 : 1, backgroundColor: theme.colors.primary }
                            ]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Salvar Transação</Text>}
                        </Pressable>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Wrapper>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20, alignItems: 'center'
    },
    container: {
        borderRadius: 24, padding: 24, width: '100%', maxWidth: 500,
        borderWidth: 1, borderColor: '#334155', maxHeight: '90%'
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24
    },
    title: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: '#FFFFFF'
    },
    segmentContainer: {
        flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 12, padding: 4, marginBottom: 24
    },
    segmentBtn: {
        flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8
    },
    segmentActive: {
        backgroundColor: '#334155'
    },
    segmentText: {
        color: '#94a3b8', fontFamily: 'Inter-Medium'
    },
    segmentTextActive: {
        color: '#FFF', fontFamily: 'Inter-Bold'
    },
    label: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, marginBottom: 8, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase'
    },
    input: {
        borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24, fontFamily: 'SpaceGrotesk-Medium', fontSize: 18,
        backgroundColor: '#0f172a', borderColor: '#334155', color: '#ffffff'
    },
    creditRow: {
        flexDirection: 'row', gap: 16, marginBottom: 12
    },
    cardChip: {
        flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', marginRight: 8
    },
    cardDot: {
        width: 10, height: 10, borderRadius: 5, marginRight: 8
    },
    cardName: {
        color: '#FFF', fontFamily: 'Inter-Medium', fontSize: 13
    },
    categoryGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24
    },
    categoryItem: {
        width: '31%', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', gap: 8
    },
    categoryLabel: {
        color: '#94a3b8', fontSize: 11, fontFamily: 'Inter-Medium'
    },
    saveButton: {
        padding: 16, borderRadius: 12, alignItems: 'center'
    },
    saveButtonText: {
        color: '#FFF', fontFamily: 'SpaceGrotesk-Bold', fontSize: 16
    },
    simulationText: {
        color: '#cbd5e1', fontSize: 16, fontFamily: 'Inter-Regular', marginBottom: 20, lineHeight: 24
    },
    simulationResult: {
        alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#10B981'
    },
    simulationLabel: {
        color: '#10B981', fontSize: 14, fontFamily: 'Inter-Bold', textTransform: 'uppercase', marginBottom: 8
    },
    simulationValue: {
        color: '#FFFFFF', fontSize: 32, fontFamily: 'SpaceGrotesk-Bold', marginBottom: 4
    },
    simulationSub: {
        color: '#94a3b8', fontSize: 12, fontFamily: 'Inter-Regular'
    }
});
