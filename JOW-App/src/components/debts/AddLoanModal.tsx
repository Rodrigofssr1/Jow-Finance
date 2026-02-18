import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { calculatePricePayment, calculateSACPayment } from '../../utils/finance';
import { useLoans } from '../../hooks/useLoans';
import { useQueryClient } from '@tanstack/react-query';


interface AddLoanModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export const AddLoanModal = ({ visible, onClose, onSuccess, initialData }: AddLoanModalProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Type State
    const [isFinancing, setIsFinancing] = useState(false);

    // Common Fields
    const [name, setName] = useState('');
    const [originalAmount, setOriginalAmount] = useState('');
    const [monthlyPayment, setMonthlyPayment] = useState('');
    const [totalInstallments, setTotalInstallments] = useState('');
    const [paidInstallments, setPaidInstallments] = useState('0');
    const [interestRate, setInterestRate] = useState('');
    const [amortizationSystem, setAmortizationSystem] = useState<'PRICE' | 'SAC'>('PRICE');
    const [moneyReceived, setMoneyReceived] = useState(false);

    // Asset Linking (Financing only)
    const [availableAssets, setAvailableAssets] = useState<any[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    // Effect to populate form when initialData changes or modal opens
    React.useEffect(() => {
        if (visible && initialData) {
            const isFin = !!initialData.asset_type;
            setIsFinancing(isFin);

            setName(initialData.name || '');
            setOriginalAmount(initialData.original_amount ? initialData.original_amount.toString().replace('.', ',') : '');
            setMonthlyPayment(initialData.monthly_payment ? initialData.monthly_payment.toString().replace('.', ',') : '');
            setTotalInstallments(initialData.total_installments ? initialData.total_installments.toString() : '');
            setPaidInstallments(initialData.paid_installments ? initialData.paid_installments.toString() : '0');
            setInterestRate(initialData.interest_rate ? initialData.interest_rate.toString().replace('.', ',') : '');
            setAmortizationSystem(initialData.amortization_system || 'PRICE');
            setMoneyReceived(false);
            setSelectedAssetId(null);
        } else if (visible && !initialData) {
            resetForm();
        }
    }, [visible, initialData]);

    // Fetch available assets when switching to financing mode
    React.useEffect(() => {
        if (visible && isFinancing && user) {
            fetchAvailableAssets();
        }
    }, [visible, isFinancing, user]);

    const fetchAvailableAssets = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('assets')
            .select('id, name, purchase_value, type, acquisition_type')
            .eq('user_id', user.id)
            .in('acquisition_type', ['financed', 'consortium'])
            .is('debt_id', null)
            .order('name');

        setAvailableAssets(data || []);
    };

    const handleSelectAsset = (assetId: string) => {
        setSelectedAssetId(assetId);
        const asset = availableAssets.find(a => a.id === assetId);
        if (asset) {
            setName(`Financiamento - ${asset.name}`);
            setOriginalAmount(asset.purchase_value.toString().replace('.', ','));
        }
    };

    const resetForm = () => {
        setName('');
        setOriginalAmount('');
        setMonthlyPayment('');
        setTotalInstallments('');
        setPaidInstallments('0');
        setInterestRate('');
        setAmortizationSystem('PRICE');
        setIsFinancing(false);
        setMoneyReceived(false);
        setSelectedAssetId(null);
        setAvailableAssets([]);
    };

    // Auto-Calculate Payment (only for new loans)
    React.useEffect(() => {
        const amount = parseFloat(originalAmount.replace(',', '.') || '0');
        const months = parseInt(totalInstallments || '0');
        const rate = parseFloat(interestRate.replace(',', '.') || '0');

        if (amount > 0 && months > 0 && !initialData) {
            let payment = 0;
            if (rate >= 0) {
                if (amortizationSystem === 'PRICE') {
                    payment = calculatePricePayment(amount, rate, months);
                } else {
                    payment = calculateSACPayment(amount, rate, months, 1);
                }
                setMonthlyPayment(payment.toFixed(2).replace('.', ','));
            }
        }
    }, [originalAmount, totalInstallments, interestRate, amortizationSystem, initialData]);

    const { addLoan } = useLoans();
    const queryClient = useQueryClient();

    const handleSave = async () => {
        if (!name || !originalAmount || !monthlyPayment || !totalInstallments) {
            Alert.alert('Erro', 'Preencha os campos obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const loanData = {
                user_id: user?.id,
                name,
                original_amount: parseFloat(originalAmount.replace(',', '.')),
                monthly_payment: parseFloat(monthlyPayment.replace(',', '.')),
                total_installments: parseInt(totalInstallments),
                paid_installments: parseInt(paidInstallments) || 0,
                interest_rate: interestRate ? parseFloat(interestRate.replace(',', '.')) : null,
                amortization_system: amortizationSystem,
                asset_type: isFinancing ? 'outro' : null,
                next_due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
            };

            const loan = await addLoan.mutateAsync(loanData);

            // Link the selected asset to this loan
            if (isFinancing && selectedAssetId && loan) {
                const { error: linkError } = await supabase
                    .from('assets')
                    .update({
                        debt_id: loan.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', selectedAssetId)
                    .eq('user_id', user?.id);

                if (linkError) {
                    console.error('Erro ao vincular bem:', linkError);
                } else {
                    queryClient.invalidateQueries({ queryKey: ['assets'] });
                }
            }

            // Transaction for Loan (Money Received)
            if (!isFinancing && moneyReceived && loan) {
                const { data: accounts } = await supabase.from('accounts').select('id').eq('user_id', user?.id).limit(1);
                let targetAccountId = accounts && accounts.length > 0 ? accounts[0].id : null;

                if (!targetAccountId) {
                    const { data: newAccount } = await supabase.from('accounts').insert({
                        user_id: user?.id,
                        name: 'Minha Conta',
                        type: 'checking_account',
                        balance: 0
                    }).select();
                    if (newAccount && newAccount[0]) targetAccountId = newAccount[0].id;
                }

                if (targetAccountId) {
                    const { error: txError } = await supabase.from('transactions').insert([{
                        user_id: user?.id,
                        description: `Empréstimo: ${name}`,
                        amount: parseFloat(originalAmount.replace(',', '.')),
                        type: 'income',
                        category: 'Empréstimos',
                        account_id: targetAccountId,
                        date: new Date().toISOString(),
                        paid: true,
                    }]);
                    if (!txError) {
                        queryClient.invalidateQueries({ queryKey: ['transactions'] });
                        queryClient.invalidateQueries({ queryKey: ['accounts'] });
                    }
                }
            }

            Alert.alert('Sucesso', isFinancing
                ? selectedAssetId
                    ? 'Financiamento salvo e vinculado ao bem!'
                    : 'Financiamento salvo!'
                : 'Empréstimo salvo!'
            );

            onSuccess();
            onClose();

        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Erro desconhecido ao salvar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{initialData ? 'Editar Passivo' : 'Novo Passivo'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>

                        {/* --- 1. SOBRE O PASSIVO --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>1. Sobre o Passivo</Text>

                        <Text style={styles.label}>Tipo de Dívida</Text>
                        <View style={styles.segmentedControl}>
                            <TouchableOpacity
                                style={[styles.segment, !isFinancing && { backgroundColor: theme.colors.primary }]}
                                onPress={() => setIsFinancing(false)}
                            >
                                <Text style={[styles.segmentText, { color: !isFinancing ? '#FFF' : theme.colors.text }]}>Empréstimo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.segment, isFinancing && { backgroundColor: theme.colors.primary }]}
                                onPress={() => setIsFinancing(true)}
                            >
                                <Text style={[styles.segmentText, { color: isFinancing ? '#FFF' : theme.colors.text }]}>Financiamento</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Asset Linking - Financing Only */}
                        {isFinancing && !initialData && (
                            <View style={[styles.assetLinkBox, { borderColor: '#f59e0b' }]}>
                                <Text style={{ color: '#f59e0b', fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, marginBottom: 10 }}>
                                    BEM FINANCIADO
                                </Text>

                                {availableAssets.length > 0 ? (
                                    <>
                                        <Text style={styles.label}>Vincular a um bem cadastrado:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                            {availableAssets.map((asset) => (
                                                <TouchableOpacity
                                                    key={asset.id}
                                                    onPress={() => handleSelectAsset(asset.id)}
                                                    style={[
                                                        styles.assetChip,
                                                        {
                                                            backgroundColor: selectedAssetId === asset.id ? '#f59e0b' : '#1e293b',
                                                            borderColor: selectedAssetId === asset.id ? '#f59e0b' : '#475569'
                                                        }
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={asset.type?.startsWith('imovel') ? 'home' : asset.type?.startsWith('veiculo') ? 'car-sport' : 'cube'}
                                                        size={14}
                                                        color={selectedAssetId === asset.id ? '#0f172a' : '#94a3b8'}
                                                        style={{ marginRight: 6 }}
                                                    />
                                                    <Text style={{
                                                        color: selectedAssetId === asset.id ? '#0f172a' : '#ffffff',
                                                        fontSize: 12,
                                                        fontFamily: 'SpaceGrotesk-Medium'
                                                    }}>
                                                        {asset.name} - R$ {Number(asset.purchase_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                        {selectedAssetId && (
                                            <TouchableOpacity onPress={() => { setSelectedAssetId(null); setName(''); setOriginalAmount(''); }}>
                                                <Text style={{ color: '#94a3b8', fontSize: 11, textDecorationLine: 'underline' }}>Limpar seleção</Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                ) : (
                                    <Text style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                                        Nenhum bem marcado como "Financiado" ou "Consórcio" disponível para vínculo.
                                        Cadastre o bem primeiro em Meus Bens.
                                    </Text>
                                )}
                            </View>
                        )}

                        <Text style={styles.label}>Nome (ex: {isFinancing ? 'Financiamento - Casa Própria' : 'Empréstimo Pessoal'})</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />

                        {/* --- 2. DETALHES FINANCEIROS --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>2. Detalhes Financeiros</Text>

                        <Text style={styles.label}>Valor {isFinancing ? 'Financiado' : 'do Empréstimo'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor="#94a3b8"
                            value={originalAmount}
                            onChangeText={setOriginalAmount}
                            keyboardType="numeric"
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Taxa Mensal (%)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ex: 1.5"
                                    placeholderTextColor="#94a3b8"
                                    value={interestRate}
                                    onChangeText={setInterestRate}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Sistema</Text>
                                <View style={styles.segmentedControl}>
                                    <TouchableOpacity
                                        style={[styles.segment, amortizationSystem === 'PRICE' && { backgroundColor: theme.colors.primary }]}
                                        onPress={() => setAmortizationSystem('PRICE')}
                                    >
                                        <Text style={[styles.segmentText, { color: amortizationSystem === 'PRICE' ? '#FFF' : theme.colors.text }]}>Price</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.segment, amortizationSystem === 'SAC' && { backgroundColor: theme.colors.primary }]}
                                        onPress={() => setAmortizationSystem('SAC')}
                                    >
                                        <Text style={[styles.segmentText, { color: amortizationSystem === 'SAC' ? '#FFF' : theme.colors.text }]}>SAC</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* --- 3. PRAZO E PAGAMENTO --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>3. Prazo e Pagamento</Text>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Total Parcelas</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ex: 48"
                                    placeholderTextColor="#94a3b8"
                                    value={totalInstallments}
                                    onChangeText={setTotalInstallments}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Pagas</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ex: 12"
                                    placeholderTextColor="#94a3b8"
                                    value={paidInstallments}
                                    onChangeText={setPaidInstallments}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Valor da Parcela (Mensal)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor="#94a3b8"
                            value={monthlyPayment}
                            onChangeText={setMonthlyPayment}
                            keyboardType="numeric"
                        />

                        {/* Money Received Toggle - Loan only, new only */}
                        {!isFinancing && !initialData && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
                                <Text style={{ color: '#e2e8f0', marginRight: 10 }}>O dinheiro já entrou na conta?</Text>
                                <TouchableOpacity
                                    onPress={() => setMoneyReceived(!moneyReceived)}
                                    style={{
                                        backgroundColor: moneyReceived ? theme.colors.primary : '#334155',
                                        padding: 8, borderRadius: 6
                                    }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 12 }}>{moneyReceived ? 'SIM' : 'NÃO'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{initialData ? 'Salvar Alterações' : 'Salvar Passivo'}</Text>}
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
        borderRadius: 16, padding: 20, width: '100%', maxHeight: '90%', backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
    },
    title: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: '#ffffff',
    },
    sectionTitle: {
        fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, marginTop: 10, marginBottom: 10, textTransform: 'uppercase'
    },
    segmentedControl: {
        flexDirection: 'row', marginBottom: 20, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#475569',
    },
    segment: {
        flex: 1, paddingVertical: 10, alignItems: 'center',
    },
    segmentText: {
        fontFamily: 'SpaceGrotesk-Medium', fontSize: 14,
    },
    label: {
        fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, marginBottom: 6, color: '#e2e8f0',
    },
    input: {
        borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontFamily: 'SpaceGrotesk-Regular', fontSize: 16,
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        color: '#ffffff',
    },
    row: {
        flexDirection: 'row', marginBottom: 20,
    },
    button: {
        borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10
    },
    buttonText: {
        color: '#FFF', fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
    },
    assetLinkBox: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        backgroundColor: '#1e293b',
    },
    assetChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 8,
    },
});
