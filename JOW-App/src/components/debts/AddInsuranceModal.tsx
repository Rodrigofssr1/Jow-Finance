import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface AddInsuranceModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export const AddInsuranceModal = ({ visible, onClose, onSuccess, initialData }: AddInsuranceModalProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [type, setType] = useState('vida');
    const [period, setPeriod] = useState('mensal');
    const [insurer, setInsurer] = useState('');
    const [premiumAmount, setPremiumAmount] = useState('');
    const [policyNumber, setPolicyNumber] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [coverage, setCoverage] = useState('');

    // Payment Logic
    const [paymentMethod, setPaymentMethod] = useState('credit_card');
    const [cards, setCards] = useState<{ id: string, name: string }[]>([]);
    const [selectedCard, setSelectedCard] = useState('');
    const [chargeDay, setChargeDay] = useState('1');

    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

    React.useEffect(() => {
        const fetchCards = async () => {
            if (!user) return;
            const { data } = await supabase.from('credit_cards').select('id, name').eq('user_id', user.id);
            if (data) {
                setCards(data);
                if (data.length > 0 && !selectedCard) setSelectedCard(data[0].id);
            }
        };
        fetchCards();
    }, [user]);

    // Effect to populate form when initialData changes or modal opens
    React.useEffect(() => {
        if (visible && initialData) {
            setType(initialData.type || 'vida');
            setPeriod(initialData.renewal_period || 'mensal');
            setInsurer(initialData.insurer || '');
            setPremiumAmount(initialData.premium_amount ? initialData.premium_amount.toString().replace('.', ',') : '');
            setPolicyNumber(initialData.policy_number || '');

            // Format format YYYY-MM-DD to DD/MM/YYYY for display
            if (initialData.due_date) {
                const [year, month, day] = initialData.due_date.split('-');
                setDueDate(`${day}/${month}/${year}`);
            } else {
                setDueDate('');
            }

            setCoverage(initialData.coverage || '');
            setPaymentMethod(initialData.payment_method || 'credit_card');
            setSelectedCard(initialData.credit_card_id || '');
            setChargeDay(initialData.charge_day ? initialData.charge_day.toString() : '1');

        } else if (visible && !initialData) {
            resetForm();
        }
    }, [visible, initialData]);

    const resetForm = () => {
        setInsurer('');
        setPolicyNumber('');
        setCoverage('');
        setPremiumAmount('');
        setDueDate('');
        setPaymentMethod('credit_card');
        setType('vida');
        setPeriod('mensal');
        setChargeDay('1');
        // keep cards loaded
        if (cards.length > 0) setSelectedCard(cards[0].id);
    };

    const handleSave = async () => {
        if (!insurer || !premiumAmount || !dueDate) {
            Alert.alert('Erro', 'Preencha seguradora, valor e vencimento.');
            return;
        }

        if (paymentMethod === 'credit_card' && cards.length === 0) {
            Alert.alert('Atenção', 'Cadastre um cartão de crédito primeiro.');
            return;
        }

        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!dateRegex.test(dueDate)) {
            Alert.alert('Erro', 'Data inválida. Use DD/MM/AAAA');
            return;
        }

        setLoading(true);
        try {
            const [day, month, year] = dueDate.split('/');
            const isoDate = `${year}-${month}-${day}`;

            const payload = {
                user_id: user?.id,
                type,
                insurer,
                premium_amount: parseFloat(premiumAmount.replace(',', '.')),
                policy_number: policyNumber,
                due_date: isoDate,
                payment_method: paymentMethod,
                credit_card_id: paymentMethod === 'credit_card' ? selectedCard : null,
                charge_day: paymentMethod === 'credit_card' ? parseInt(chargeDay) : null,
                coverage: coverage || null,
                renewal_period: period,
            };

            let error;

            if (initialData && initialData.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('insurances')
                    .update(payload)
                    .eq('id', initialData.id);
                error = updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('insurances')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            // Trigger update immediately
            onSuccess();

            Alert.alert('Sucesso', initialData ? 'Seguro atualizado!' : 'Seguro salvo com sucesso!', [
                {
                    text: 'OK', onPress: () => {
                        resetForm();
                        onClose();
                    }
                }
            ]);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{initialData ? 'Editar Seguro' : 'Novo Seguro'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>

                        {/* --- 1. DETALHES DO SEGURO --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>1. Detalhes do Seguro</Text>

                        <Text style={styles.label}>Tipo de Seguro</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {['vida', 'auto', 'residencial', 'saude', 'outros'].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    onPress={() => setType(t)}
                                    style={[
                                        styles.chip,
                                        type === t && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                >
                                    <Text style={[styles.chipText, type === t && { color: '#fff' }]}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Período de Renovação</Text>
                        <View style={[styles.segmentedControl, { marginBottom: 16 }]}>
                            <TouchableOpacity
                                style={[styles.segment, period === 'mensal' && { backgroundColor: theme.colors.primary }]}
                                onPress={() => setPeriod('mensal')}
                            >
                                <Text style={[styles.segmentText, { color: period === 'mensal' ? '#FFF' : theme.colors.text }]}>Mensal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, period === 'anual' && { backgroundColor: theme.colors.primary }]}
                                onPress={() => setPeriod('anual')}
                            >
                                <Text style={[styles.segmentText, { color: period === 'anual' ? '#FFF' : theme.colors.text }]}>Anual</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Seguradora (ex: Porto Seguro)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome da Seguradora"
                            placeholderTextColor="#94a3b8"
                            value={insurer}
                            onChangeText={setInsurer}
                        />

                        <Text style={styles.label}>Nº da Apólice (Opcional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1234.5678.90"
                            placeholderTextColor="#94a3b8"
                            value={policyNumber}
                            onChangeText={setPolicyNumber}
                        />

                        {/* --- 2. PAGAMENTO E COBERTURA --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>2. Pagamento e Cobertura</Text>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Valor Prêmio</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor="#94a3b8"
                                    value={premiumAmount}
                                    onChangeText={setPremiumAmount}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Vencimento</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="DD/MM/AAAA"
                                    placeholderTextColor="#94a3b8"
                                    value={dueDate}
                                    onChangeText={text => {
                                        let v = text.replace(/\D/g, '');
                                        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                                        if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5);
                                        if (v.length > 10) v = v.slice(0, 10);
                                        setDueDate(v);
                                    }}
                                    keyboardType="numeric"
                                    maxLength={10}
                                />
                            </View>
                        </View>


                        <Text style={[styles.label, { marginTop: 10 }]}>Forma de Pagamento</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {[
                                { label: '💳 Cartão', value: 'credit_card' },
                                { label: '📄 Boleto', value: 'boleto' },
                                { label: '💰 Débito', value: 'debit' },
                                { label: '⚡ Pix', value: 'pix' }
                            ].map((m) => (
                                <TouchableOpacity
                                    key={m.value}
                                    onPress={() => setPaymentMethod(m.value)}
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
                            <>
                                <Text style={styles.label}>Qual Cartão?</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                    {cards.map(card => (
                                        <TouchableOpacity
                                            key={card.id}
                                            onPress={() => setSelectedCard(card.id)}
                                            style={[
                                                styles.chip,
                                                selectedCard === card.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                            ]}
                                        >
                                            <Text style={[styles.chipText, selectedCard === card.id && { color: '#fff' }]}>💳 {card.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={styles.label}>Dia da Cobrança no Cartão</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                    {days.map(d => (
                                        <TouchableOpacity
                                            key={`charge-${d}`}
                                            onPress={() => setChargeDay(d)}
                                            style={[
                                                styles.dayChip,
                                                chargeDay === d && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                            ]}
                                        >
                                            <Text style={[styles.dayText, chargeDay === d && { color: '#fff' }]}>{d}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        <Text style={styles.label}>Resumo da Cobertura (Opcional)</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="Guincho 24h, Danos terceiros..."
                            placeholderTextColor="#94a3b8"
                            value={coverage}
                            onChangeText={setCoverage}
                            multiline
                        />

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{initialData ? 'Salvar Alterações' : 'Salvar Seguro'}</Text>}
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
    row: {
        flexDirection: 'row', marginBottom: 20,
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
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#475569', backgroundColor: '#1e293b', marginRight: 8,
    },
    chipText: {
        color: '#ffffff', fontFamily: 'SpaceGrotesk-Medium', fontSize: 12,
    },
    dayChip: {
        width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#475569',
    },
    dayText: {
        color: '#ffffff', fontFamily: 'SpaceGrotesk-Medium', fontSize: 14,
    },
    button: {
        borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10
    },
    buttonText: {
        color: '#FFF', fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
    }
});
