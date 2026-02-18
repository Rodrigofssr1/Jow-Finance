import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useCreditCards } from '../../hooks/useCreditCards';

interface AddCreditCardModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // Data to edit
}

const CARD_COLORS = [
    '#8B5CF6', // Purple (Default)
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#EF4444', // Red
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
];

export const AddCreditCardModal = ({ visible, onClose, onSuccess, initialData }: AddCreditCardModalProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [limit, setLimit] = useState('');
    const [dueDay, setDueDay] = useState('20');
    const [lastFourDigits, setLastFourDigits] = useState('');
    const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);

    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

    // Effect to populate form when initialData changes or modal opens
    React.useEffect(() => {
        if (visible && initialData) {
            setName(initialData.name || '');
            setLimit(initialData.limit_amount ? initialData.limit_amount.toString().replace('.', ',') : '');
            setDueDay(initialData.due_day ? initialData.due_day.toString() : '20');
            setLastFourDigits(initialData.last_four_digits || '');
            setSelectedColor(initialData.color || CARD_COLORS[0]);
        } else if (visible && !initialData) {
            resetForm();
        }
    }, [visible, initialData]);

    const resetForm = () => {
        setName('');
        setLimit('');
        setDueDay('20');
        setLastFourDigits('');
        setSelectedColor(CARD_COLORS[0]);
    };

    const { addCreditCard, updateCreditCard } = useCreditCards();

    const handleSave = async () => {
        console.log('--- Iniciando handleSave ---');
        console.log('Estado atual:', { name, limit, dueDay, selectedColor, lastFourDigits });

        // Validações básicas
        if (!name.trim()) {
            Alert.alert('Erro', 'Preencha o nome do cartão.');
            return;
        }
        if (!limit) {
            Alert.alert('Erro', 'Preencha o limite do cartão.');
            return;
        }
        if (!lastFourDigits || lastFourDigits.length !== 4) {
            Alert.alert('Erro', 'Informe os últimos 4 dígitos do cartão.');
            return;
        }

        setLoading(true);
        try {
            // Verificação de duplicidade (Nome + 4 dígitos)
            // Apenas se estiver criando um novo ou se mudou os dados sensíveis na edição
            const needsDuplicityCheck = !initialData ||
                (initialData.name.toLowerCase() !== name.trim().toLowerCase()) ||
                (initialData.last_four_digits !== lastFourDigits);

            if (needsDuplicityCheck && user) {
                const { data: existingCards, error: checkError } = await supabase
                    .from('credit_cards')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('last_four_digits', lastFourDigits)
                    .ilike('name', name.trim());

                if (checkError) throw checkError;

                if (existingCards && existingCards.length > 0) {
                    Alert.alert('Erro', `Você já possui um cartão "${name}" terminado em ${lastFourDigits} cadastrado.`);
                    setLoading(false);
                    return;
                }
            }

            console.log('Calculando fechamento...');
            let closingDayInt = parseInt(dueDay) - 10;
            if (closingDayInt <= 0) closingDayInt += 30;

            // Robust number parsing: removes all dots, then replaces comma with dot
            const cleanLimitValue = limit.replace(/\./g, '').replace(',', '.');
            const numericLimit = parseFloat(cleanLimitValue);

            if (isNaN(numericLimit) || numericLimit <= 0) {
                console.log('Erro: Valor de limite inválido', { limit, cleanLimitValue });
                Alert.alert('Erro', 'Por favor, insira um valor de limite válido.');
                setLoading(false);
                return;
            }

            const payload = {
                name: name.trim(),
                last_four_digits: lastFourDigits,
                limit_amount: numericLimit,
                due_day: parseInt(dueDay),
                closing_day: closingDayInt,
                color: selectedColor,
                current_bill: initialData?.current_bill || 0,
                next_bill: initialData?.next_bill || 0
            };

            console.log('Payload preparado para Supabase:', payload);
            console.log('Operação:', initialData?.id ? 'UPDATE' : 'INSERT');

            if (initialData && initialData.id) {
                console.log('Executando updateCreditCard para ID:', initialData.id);
                await updateCreditCard.mutateAsync({ id: initialData.id, ...payload });
                console.log('Sucesso: Cartão atualizado');
                Alert.alert('Sucesso', 'Cartão atualizado!');
            } else {
                console.log('Executando addCreditCard');
                await addCreditCard.mutateAsync(payload);
                console.log('Sucesso: Cartão salvo');
                Alert.alert('Sucesso', 'Cartão salvo com sucesso!');
            }

            console.log('Finalizando fluxo de sucesso. Fechando modal.');
            onSuccess();
            resetForm();
            onClose();

        } catch (error: any) {
            console.error('ERRO CRÍTICO EM HANDLESAVE:', error);
            Alert.alert('Erro', error.message || 'Ocorreu um erro ao salvar o cartão.');
        } finally {
            console.log('Encerrando handleSave (finally)');
            setLoading(false);
        }
    };

    const Wrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
    const wrapperProps = Platform.OS === 'web'
        ? { style: styles.overlay }
        : { behavior: Platform.OS === "ios" ? "padding" : "height", style: styles.overlay } as any;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <Wrapper {...wrapperProps}>
                <View style={[styles.container, { backgroundColor: '#1e293b' }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{initialData ? 'Editar Cartão' : 'Novo Cartão'}</Text>
                        <Pressable onPress={onClose} style={[{ padding: 5 }, Platform.OS === 'web' && { cursor: 'pointer' } as any]}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={{ maxHeight: Platform.OS === 'web' ? 600 : '90%' }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >

                        <Text style={styles.label}>COR DO CARTÃO</Text>
                        <View style={styles.colorRow}>
                            {CARD_COLORS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => setSelectedColor(color)}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.selectedColor
                                    ]}
                                />
                            ))}
                        </View>

                        <Text style={styles.label}>NOME DO CARTÃO</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Nubank Rosa"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>ÚLTIMOS 4 DÍGITOS</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: 1234"
                                    placeholderTextColor="#94a3b8"
                                    value={lastFourDigits}
                                    onChangeText={(text) => setLastFourDigits(text.replace(/[^0-9]/g, '').slice(0, 4))}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>LIMITE TOTAL (R$)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0,00"
                                    placeholderTextColor="#94a3b8"
                                    value={limit}
                                    onChangeText={text => setLimit(text.replace(/[^0-9.,]/g, ''))}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>


                        <Text style={styles.label}>DIA DE VENCIMENTO</Text>
                        <Text style={styles.helperText}>O fechamento será calculado automaticamente (10 dias antes).</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector} keyboardShouldPersistTaps="handled">
                            {days.map(d => (
                                <TouchableOpacity
                                    key={`due-${d}`}
                                    onPress={() => setDueDay(d)}
                                    style={[
                                        styles.dayChip,
                                        dueDay === d && { backgroundColor: selectedColor, borderColor: selectedColor }
                                    ]}
                                >
                                    <Text style={[styles.dayText, dueDay === d && { color: '#fff' }]}>{d}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                {
                                    backgroundColor: selectedColor,
                                    opacity: (loading || !name || !limit || lastFourDigits.length < 4) ? 0.6 : (pressed ? 0.8 : 1)
                                },
                                Platform.OS === 'web' && { cursor: 'pointer' } as any
                            ]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Salvar Cartão</Text>}
                        </Pressable>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </Wrapper>
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20,
    },
    container: {
        borderRadius: 24, padding: 24, width: '100%',
        maxWidth: 500, alignSelf: 'center',
        zIndex: 1000,
        borderWidth: 1, borderColor: '#334155'
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
    },
    title: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: '#ffffff',
    },
    label: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, marginBottom: 8, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase'
    },
    helperText: {
        fontFamily: 'Inter-Regular', fontSize: 12, color: '#64748b', marginBottom: 12
    },
    input: {
        borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24, fontFamily: 'SpaceGrotesk-Medium', fontSize: 16,
        backgroundColor: '#0f172a', // Slate 900
        borderColor: '#334155', // Slate 700
        color: '#ffffff', // White
    },
    colorRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24
    },
    colorOption: {
        width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent'
    },
    selectedColor: {
        borderColor: '#ffffff', borderWidth: 2, transform: [{ scale: 1.1 }]
    },
    daySelector: {
        flexDirection: 'row', marginBottom: 24
    },
    dayChip: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
    },
    dayText: {
        color: '#ffffff',
        fontFamily: 'SpaceGrotesk-Medium',
        fontSize: 14,
    },
    button: {
        borderRadius: 12, padding: 16, alignItems: 'center',
        marginTop: 8
    },
    buttonText: {
        color: '#FFF', fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
    }
});
