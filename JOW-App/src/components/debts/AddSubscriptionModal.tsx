import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CreditCard } from '../../types';
import { useSubscriptions } from '../../hooks/useSubscriptions';

interface AddSubscriptionModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export const AddSubscriptionModal = ({ visible, onClose, onSuccess, initialData }: AddSubscriptionModalProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { addSubscription, updateSubscription } = useSubscriptions();
    const [loading, setLoading] = useState(false);

    // --- State ---

    // 1. Service Section
    const [name, setName] = useState('');
    const [serviceDurationType, setServiceDurationType] = useState<'lifetime' | 'fixed' | 'recurring'>('recurring');
    const [serviceMonths, setServiceMonths] = useState('12'); // Default for fixed
    const [category, setCategory] = useState('streaming');

    // 2. Payment Section
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'boleto' | 'pix' | 'debit'>('credit_card');
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [selectedCardId, setSelectedCardId] = useState('');
    const [cardChargeDay, setCardChargeDay] = useState('');

    // 3. Installment Section
    const [installments, setInstallments] = useState<number>(0); // 0 = Recurring, 1..12 = Fixed installments

    // --- Effects ---

    // Effect to populate form when initialData changes or modal opens
    useEffect(() => {
        if (visible && initialData) {
            setName(initialData.name || '');
            setCategory(initialData.category || 'streaming');
            setAmount(initialData.amount ? initialData.amount.toString().replace('.', ',') : '');

            setServiceDurationType(initialData.service_duration_type || 'recurring');
            setServiceMonths(initialData.service_months ? initialData.service_months.toString() : '12');

            setPaymentMethod(initialData.payment_method || 'credit_card');
            setSelectedCardId(initialData.credit_card_id || '');
            setCardChargeDay(initialData.card_charge_day ? initialData.card_charge_day.toString() : '');

            setInstallments(initialData.payment_installments || 0);
        } else if (visible && !initialData) {
            resetForm();
        }
    }, [visible, initialData]);

    // Load Cards
    useEffect(() => {
        const fetchCards = async () => {
            if (!user) return;
            const { data } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
            if (data) {
                setCards(data);
                if (data.length > 0 && !selectedCardId) setSelectedCardId(data[0].id);
            }
        };
        fetchCards();
    }, [user]);

    // Auto-set charge day from card (Only if NOT editing or if user changes card)
    useEffect(() => {
        if (selectedCardId && cards.length > 0 && !initialData) {
            const card = cards.find(c => c.id === selectedCardId);
            if (card) {
                setCardChargeDay(card.due_day.toString());
            }
        }
    }, [selectedCardId, cards, initialData]);

    // Enforce business rules
    useEffect(() => {
        // Rule 1: Recurring service -> Recurring payments (installments = 0)
        if (serviceDurationType === 'recurring') {
            setInstallments(0);
        }
        // Rule: If fixed/lifetime, default to 1x if it was 0
        else if (installments === 0 && !initialData) {
            setInstallments(1);
        }
    }, [serviceDurationType, initialData]);

    // --- Helpers ---

    const getSummaryText = () => {
        const value = parseFloat(amount.replace(',', '.') || '0');
        if (isNaN(value) || value === 0) return 'Preencha o valor.';

        const methodLabel = paymentMethod === 'credit_card' ? 'Cartão' :
            paymentMethod === 'boleto' ? 'Boleto' :
                paymentMethod === 'pix' ? 'Pix' : 'Débito';

        const cardName = cards.find(c => c.id === selectedCardId)?.name || 'Cartão';

        const formatCurrency = (val: number) => {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        };

        if (paymentMethod === 'credit_card') {
            if (installments === 0) { // Recurring (Netflix style)
                return `${formatCurrency(value)} todo mês no ${cardName}.`;
            } else {
                const installmentValue = value / installments;
                return `${formatCurrency(value)} total em ${installments}x de ${formatCurrency(installmentValue)} no ${cardName}.`;
            }
        } else {
            // Non-credit card logic
            if (installments === 0) {
                return `${formatCurrency(value)} todo mês via ${methodLabel}.`;
            } else {
                const installmentValue = value / installments;
                return `${formatCurrency(value)} total em ${installments}x de ${formatCurrency(installmentValue)} via ${methodLabel}.`;
            }
        }
    };

    // ... inside component ...


    // ... inside handleSave ...
    const handleSave = async () => {
        console.log('--- Iniciando salvamento de assinatura ---');

        if (!name.trim()) {
            Alert.alert('Erro', 'Por favor, preencha o nome do serviço.');
            return;
        }

        const cleanAmount = amount.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
        const numericAmount = parseFloat(cleanAmount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert('Erro', 'Por favor, insira um valor válido maior que zero.');
            return;
        }

        if (paymentMethod === 'credit_card' && !selectedCardId) {
            Alert.alert('Erro', 'Selecione um cartão de crédito para continuar.');
            return;
        }

        const numericInstallments = installments;
        const installmentAmount = numericInstallments > 0 ? numericAmount / numericInstallments : numericAmount;

        const payload = {
            user_id: user?.id,
            name: name.trim(),
            category,
            amount: numericAmount,
            service_duration_type: serviceDurationType,
            service_months: serviceDurationType === 'fixed' ? parseInt(serviceMonths) : null,
            payment_method: paymentMethod,
            credit_card_id: paymentMethod === 'credit_card' ? selectedCardId : null,
            card_charge_day: paymentMethod === 'credit_card' ? parseInt(cardChargeDay) : parseInt(cardChargeDay || '5'),
            due_day: parseInt(cardChargeDay || '5'),
            payment_installments: installments,
            installment_amount: installmentAmount,
            current_installment: numericInstallments > 0 ? (initialData ? initialData.current_installment : 1) : null,
        };

        if (!user?.id) {
            Alert.alert('Erro', 'Usuário não autenticado. Tente fazer login novamente.');
            return;
        }

        setLoading(true);
        try {
            if (initialData && initialData.id) {
                await updateSubscription.mutateAsync({ id: initialData.id, ...payload });
                Alert.alert('Sucesso', 'Assinatura atualizada!');
            } else {
                await addSubscription.mutateAsync(payload);
                Alert.alert('Sucesso', 'Assinatura salva com sucesso!');
            }

            onSuccess();
            resetForm();
            onClose();

        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            Alert.alert('Erro ao Salvar', error.message || 'Ocorreu um erro desconhecido ao salvar a assinatura.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setAmount('');
        setServiceDurationType('recurring');
        setPaymentMethod('credit_card');
        setInstallments(0);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{initialData ? 'Editar Assinatura' : 'Nova Assinatura / Serviço'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>

                        {/* --- 1. SOBRE O SERVIÇO --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>1. Sobre o Serviço</Text>

                        <Text style={styles.label}>Nome (ex: Netflix, Curso Excel)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome do serviço"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={[styles.label, { color: theme.colors.text }]}>Duração do Serviço</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {[
                                { label: '♾️ Contínua', value: 'recurring' },
                                { label: '📅 Fixo', value: 'fixed' },
                                { label: '🔒 Vitalício', value: 'lifetime' }
                            ].map((d) => (
                                <TouchableOpacity
                                    key={d.value}
                                    onPress={() => setServiceDurationType(d.value as any)}
                                    style={[
                                        styles.chip,
                                        serviceDurationType === d.value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                >
                                    <Text style={[styles.chipText, serviceDurationType === d.value && { color: '#fff' }]}>{d.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {serviceDurationType === 'fixed' && (
                            <View>
                                <Text style={styles.label}>Tempo de Acesso (Meses)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={serviceMonths}
                                    onChangeText={setServiceMonths}
                                    keyboardType="numeric"
                                    placeholder="Ex: 12"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>
                        )}

                        <Text style={styles.label}>Categoria</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {['streaming', 'educacao', 'servicos', 'software', 'outro'].map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => setCategory(c)}
                                    style={[
                                        styles.chip,
                                        category === c && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                >
                                    <Text style={[styles.chipText, category === c && { color: '#fff' }]}>
                                        {c.charAt(0).toUpperCase() + c.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* --- 2. PAGAMENTO --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>2. Pagamento</Text>

                        <Text style={styles.label}>Valor Total (ou Mensal da Assinatura)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor="#94a3b8"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Forma de Pagamento</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {[
                                { label: '💳 Cartão', value: 'credit_card' },
                                { label: '📄 Boleto', value: 'boleto' },
                                { label: '⚡ Pix', value: 'pix' },
                                { label: '💰 Débito', value: 'debit' }
                            ].map((m) => (
                                <TouchableOpacity
                                    key={m.value}
                                    onPress={() => setPaymentMethod(m.value as any)}
                                    style={[
                                        styles.chip,
                                        paymentMethod === m.value && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                >
                                    <Text style={[styles.chipText, paymentMethod === m.value && { color: '#fff' }]}>{m.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {paymentMethod === 'credit_card' && (
                            <View>
                                <Text style={styles.label}>Selecionar Cartão</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                    {cards.map(card => (
                                        <TouchableOpacity
                                            key={card.id}
                                            onPress={() => setSelectedCardId(card.id)}
                                            style={[
                                                styles.chip,
                                                selectedCardId === card.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                            ]}
                                        >
                                            <Text style={[styles.chipText, selectedCardId === card.id && { color: '#fff' }]}>{card.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.label}>Dia da Cobrança (Fatura)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={cardChargeDay}
                                    onChangeText={setCardChargeDay}
                                    keyboardType="numeric"
                                />
                            </View>
                        )}

                        {paymentMethod !== 'credit_card' && (
                            <View>
                                <Text style={styles.label}>Dia do Vencimento</Text>
                                <TextInput
                                    style={styles.input}
                                    value={cardChargeDay} // Reusing state for due day
                                    onChangeText={setCardChargeDay}
                                    keyboardType="numeric"
                                    placeholder="Dia (1-31)"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>
                        )}


                        {/* --- 3. PARCELAMENTO --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>3. Parcelamento</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {[0, 1, 2, 3, 4, 5, 6, 10, 12].map((v) => (
                                <TouchableOpacity
                                    key={v}
                                    onPress={() => setInstallments(v)}
                                    disabled={serviceDurationType === 'recurring' && v !== 0}
                                    style={[
                                        styles.chip,
                                        installments === v && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                                        serviceDurationType === 'recurring' && v !== 0 && { opacity: 0.5 }
                                    ]}
                                >
                                    <Text style={[styles.chipText, installments === v && { color: '#fff' }]}>
                                        {v === 0 ? '♾️ Recorrente' : `${v}x`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {serviceDurationType === 'recurring' && (
                            <Text style={{ color: theme.colors.text, fontSize: 12, marginTop: -15, marginBottom: 20, fontStyle: 'italic' }}>
                                * Assinaturas contínuas são sempre recorrentes.
                            </Text>
                        )}

                        {/* --- RESUMO --- */}
                        <View style={{ backgroundColor: theme.colors.background, padding: 15, borderRadius: 8, marginBottom: 20 }}>
                            <Text style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 5 }}>RESUMO:</Text>
                            <Text style={{ color: theme.colors.text, lineHeight: 20 }}>
                                {getSummaryText()}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{initialData ? 'Salvar Alterações' : 'Salvar Assinatura'}</Text>}
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20,
    },
    container: {
        borderRadius: 16, padding: 20, width: '100%', maxHeight: '90%', backgroundColor: '#0f172a', // Slate 900
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
    },
    title: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: '#ffffff', // White
    },
    sectionTitle: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, marginTop: 10, marginBottom: 10, textTransform: 'uppercase'
    },
    label: {
        fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, marginBottom: 6, color: '#e2e8f0', // Slate 200
    },
    input: {
        borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontFamily: 'SpaceGrotesk-Regular', fontSize: 16,
        backgroundColor: '#1e293b', // Slate 800
        borderColor: '#475569', // Slate 600
        color: '#ffffff', // White
    },
    segmentedControl: {
        flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#475569',
    },
    segment: {
        flex: 1, paddingVertical: 10, alignItems: 'center',
    },
    segmentText: {
        fontFamily: 'SpaceGrotesk-Medium', fontSize: 14,
    },
    chip: {
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#475569', backgroundColor: '#1e293b', marginRight: 8, height: 45, justifyContent: 'center'
    },
    chipText: {
        color: '#ffffff', fontFamily: 'SpaceGrotesk-Medium', fontSize: 12,
    },
    button: {
        borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10
    },
    buttonText: {
        color: '#FFF', fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
    }
});

