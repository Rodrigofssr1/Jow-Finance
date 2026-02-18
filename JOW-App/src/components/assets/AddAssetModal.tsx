import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Switch, Image } from 'react-native';
// ImagePiker removed
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { useAssets } from '../../hooks/useAssets';

interface AddAssetModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    initialData?: any;
}

type AcquisitionType = 'cash' | 'financed' | 'consortium';

// Helper: parse BR decimal input to number
const parseBR = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
};

// Helper: format number to BR currency display (no R$)
const formatBR = (val: number): string => {
    if (!val || val === 0) return '';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const AddAssetModal = ({ visible, onClose, onSuccess, initialData }: AddAssetModalProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const { addAsset, updateAsset } = useAssets();

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState('imovel_residencial');
    const [purchaseValue, setPurchaseValue] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [acquisitionDate, setAcquisitionDate] = useState(new Date());
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');


    // Acquisition
    const [acquisitionType, setAcquisitionType] = useState<AcquisitionType>('cash');

    // Insurance
    const [hasInsurance, setHasInsurance] = useState(false);
    const [selectedInsurance, setSelectedInsurance] = useState<string | null>(null);
    const [insurances, setInsurances] = useState<any[]>([]);

    // === ACQUISITION COSTS STATE ===
    // Imóveis
    const [itbiPercentage, setItbiPercentage] = useState('');
    const [notaryFees, setNotaryFees] = useState('');
    const [brokeragePercentage, setBrokeragePercentage] = useState('');
    const [isLaudemio, setIsLaudemio] = useState(false);
    const [bankAppraisalFee, setBankAppraisalFee] = useState('');

    // Veículos
    const [ipvaAmount, setIpvaAmount] = useState('');
    const [vehicleTransferTax, setVehicleTransferTax] = useState('');
    const [vehicleInspectionFee, setVehicleInspectionFee] = useState('');
    const [hasAgent, setHasAgent] = useState(false);
    const [vehicleAgentFee, setVehicleAgentFee] = useState('');

    // Outros
    const [otherCosts, setOtherCosts] = useState('');

    // === DERIVED: Asset category for dynamic form ===
    const assetCategory = useMemo(() => {
        if (type.startsWith('imovel')) return 'imovel';
        if (type.startsWith('veiculo')) return 'veiculo';
        return 'outro';
    }, [type]);

    // === CALCULATIONS ===
    const purchaseNum = parseBR(purchaseValue);

    const itbiAmount = useMemo(() => {
        const pct = parseBR(itbiPercentage);
        return pct > 0 && purchaseNum > 0 ? purchaseNum * pct / 100 : 0;
    }, [itbiPercentage, purchaseNum]);

    const brokerageAmount = useMemo(() => {
        const pct = parseBR(brokeragePercentage);
        return pct > 0 && purchaseNum > 0 ? purchaseNum * pct / 100 : 0;
    }, [brokeragePercentage, purchaseNum]);

    const laudemioAmount = useMemo(() => {
        return isLaudemio && purchaseNum > 0 ? purchaseNum * 0.05 : 0;
    }, [isLaudemio, purchaseNum]);

    const totalAcquisitionCost = useMemo(() => {
        if (assetCategory === 'imovel') {
            return itbiAmount
                + parseBR(notaryFees)
                + brokerageAmount
                + laudemioAmount
                + parseBR(bankAppraisalFee);
        }
        if (assetCategory === 'veiculo') {
            return parseBR(ipvaAmount)
                + parseBR(vehicleTransferTax)
                + parseBR(vehicleInspectionFee)
                + (hasAgent ? parseBR(vehicleAgentFee) : 0);
        }
        return parseBR(otherCosts);
    }, [assetCategory, itbiAmount, notaryFees, brokerageAmount, laudemioAmount, bankAppraisalFee, ipvaAmount, vehicleTransferTax, vehicleInspectionFee, hasAgent, vehicleAgentFee, otherCosts]);

    const totalInvestment = purchaseNum + totalAcquisitionCost;

    const costPercentage = purchaseNum > 0 ? (totalAcquisitionCost / purchaseNum * 100) : 0;

    // ITBI warning
    const itbiPct = parseBR(itbiPercentage);
    const showItbiWarning = itbiPct > 0 && (itbiPct < 2 || itbiPct > 3);

    useEffect(() => {
        if (visible && user) {
            fetchInsurances();
        }
    }, [visible, user]);

    // Populate Form for Edit
    useEffect(() => {
        if (visible && initialData) {
            setName(initialData.name || '');
            setType(initialData.type || 'imovel_residencial');
            setPurchaseValue(initialData.purchase_value?.toString().replace('.', ',') || '');
            setCurrentValue(initialData.current_value?.toString().replace('.', ',') || '');
            setAcquisitionDate(initialData.acquisition_date ? new Date(initialData.acquisition_date) : new Date());
            setDescription(initialData.description || '');
            setLocation(initialData.location || '');
            setAcquisitionType(initialData.acquisition_type || 'cash');

            if (initialData.insurance_id) {
                setHasInsurance(true);
                setSelectedInsurance(initialData.insurance_id);
            }


            // Populate acquisition costs if editing
            const costs = initialData.acquisition_costs;
            if (costs) {
                setItbiPercentage(costs.itbi_percentage ? costs.itbi_percentage.toString().replace('.', ',') : '');
                setNotaryFees(costs.notary_total_fees ? formatBR(costs.notary_total_fees) : '');
                setBrokeragePercentage(costs.brokerage_percentage ? costs.brokerage_percentage.toString().replace('.', ',') : '');
                setIsLaudemio((costs.laudemio_amount || 0) > 0);
                setBankAppraisalFee(costs.bank_appraisal_fee ? formatBR(costs.bank_appraisal_fee) : '');
                setIpvaAmount(costs.ipva_amount ? formatBR(costs.ipva_amount) : '');
                setVehicleTransferTax(costs.vehicle_transfer_tax ? formatBR(costs.vehicle_transfer_tax) : '');
                setVehicleInspectionFee(costs.vehicle_inspection_fee ? formatBR(costs.vehicle_inspection_fee) : '');
                setHasAgent((costs.vehicle_agent_fee || 0) > 0);
                setVehicleAgentFee(costs.vehicle_agent_fee ? formatBR(costs.vehicle_agent_fee) : '');
                setOtherCosts(costs.other_costs ? formatBR(costs.other_costs) : '');
            }
        } else if (visible && !initialData) {
            resetForm();
        }
    }, [visible, initialData]);

    const fetchInsurances = async () => {
        const { data } = await supabase.from('insurances').select('id, insurer, type').eq('user_id', user?.id);
        if (data) setInsurances(data);
    };



    const buildCostsPayload = () => {
        if (totalAcquisitionCost <= 0) return null;

        const base: any = {
            total_acquisition_cost: totalAcquisitionCost,
            total_investment: totalInvestment,
        };

        if (assetCategory === 'imovel') {
            if (itbiAmount > 0) {
                base.itbi_percentage = parseBR(itbiPercentage);
                base.itbi_amount = itbiAmount;
            }
            if (parseBR(notaryFees) > 0) base.notary_total_fees = parseBR(notaryFees);
            if (brokerageAmount > 0) {
                base.brokerage_percentage = parseBR(brokeragePercentage);
                base.brokerage_amount = brokerageAmount;
            }
            if (laudemioAmount > 0) base.laudemio_amount = laudemioAmount;
            if (parseBR(bankAppraisalFee) > 0) base.bank_appraisal_fee = parseBR(bankAppraisalFee);
        } else if (assetCategory === 'veiculo') {
            if (parseBR(ipvaAmount) > 0) base.ipva_amount = parseBR(ipvaAmount);
            if (parseBR(vehicleTransferTax) > 0) base.vehicle_transfer_tax = parseBR(vehicleTransferTax);
            if (parseBR(vehicleInspectionFee) > 0) base.vehicle_inspection_fee = parseBR(vehicleInspectionFee);
            if (hasAgent && parseBR(vehicleAgentFee) > 0) base.vehicle_agent_fee = parseBR(vehicleAgentFee);
        } else {
            if (parseBR(otherCosts) > 0) base.other_costs = parseBR(otherCosts);
        }

        return base;
    };

    const handleSave = async () => {
        if (!name || !purchaseValue || !currentValue) {
            Alert.alert('Erro', 'Preencha os campos obrigatórios: Nome, Valor de Compra e Valor Atual.');
            return;
        }

        const parsedPurchase = parseBR(purchaseValue);
        const parsedCurrent = parseBR(currentValue);

        if (isNaN(parsedPurchase) || parsedPurchase <= 0) {
            Alert.alert('Erro', 'Valor de Compra inválido.');
            return;
        }
        if (isNaN(parsedCurrent) || parsedCurrent <= 0) {
            Alert.alert('Erro', 'Valor Atual inválido.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
            return;
        }

        setLoading(true);
        try {
            const assetData: any = {
                name,
                type,
                purchase_value: parsedPurchase,
                current_value: parsedCurrent,
                acquisition_date: format(acquisitionDate, 'yyyy-MM-dd'),
                description: description || null,
                location: location || null,
                acquisition_type: acquisitionType,
                insurance_id: hasInsurance ? selectedInsurance : null,
                _acquisitionCosts: buildCostsPayload(),
                // Removida lógica de image_url manual pois usamos vídeos 3D automáticos
            };

            let savedAssetId = initialData?.id;

            if (initialData && initialData.id) {
                await updateAsset.mutateAsync({ id: initialData.id, ...assetData });
                Alert.alert('Sucesso', 'Bem atualizado!');
            } else {
                const result = await addAsset.mutateAsync(assetData);
                savedAssetId = result.id;
                const msg = acquisitionType === 'cash'
                    ? 'Bem cadastrado e saída registrada automaticamente no Dashboard!'
                    : 'Bem cadastrado com sucesso!';
                Alert.alert('Sucesso', msg);
            }



            resetForm();
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('[AddAssetModal] ERRO AO SALVAR:', error);
            const errorMsg = error?.message || error?.toString() || 'Erro desconhecido';
            Alert.alert(
                'Erro ao Salvar',
                `Não foi possível salvar o bem.\n\nDetalhes: ${errorMsg}`,
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setType('imovel_residencial');
        setPurchaseValue('');
        setCurrentValue('');
        setAcquisitionDate(new Date());
        setDescription('');
        setLocation('');
        setAcquisitionType('cash');
        setHasInsurance(false);
        setSelectedInsurance(null);
        // Reset costs
        setItbiPercentage('');
        setNotaryFees('');
        setBrokeragePercentage('');
        setIsLaudemio(false);
        setBankAppraisalFee('');
        setIpvaAmount('');
        setVehicleTransferTax('');
        setVehicleInspectionFee('');
        setHasAgent(false);
        setVehicleAgentFee('');
        setOtherCosts('');
    };

    const assetTypes = [
        { label: 'Imóvel Residencial', value: 'imovel_residencial' },
        { label: 'Imóvel Comercial', value: 'imovel_comercial' },
        { label: 'Carro', value: 'veiculo_carro' },
        { label: 'Moto', value: 'veiculo_moto' },
        { label: 'Eletrônico', value: 'eletro_eletronico' },
        { label: 'Joia', value: 'joia' },
        { label: 'Outro', value: 'outro' },
    ];

    const acquisitionTypes: { label: string; value: AcquisitionType; icon: string }[] = [
        { label: 'À Vista', value: 'cash', icon: 'cash-outline' },
        { label: 'Financiado', value: 'financed', icon: 'card-outline' },
        { label: 'Consórcio', value: 'consortium', icon: 'people-outline' },
    ];

    // =================================================================
    // RENDER: Section 5 - Acquisition Costs (Dynamic by asset category)
    // =================================================================
    const renderAcquisitionCosts = () => {
        const sectionColor = '#10b981'; // emerald

        return (
            <>
                <Text style={[styles.sectionTitle, { color: sectionColor }]}>5. Custos de Aquisição</Text>

                {/* ===== IMÓVEL ===== */}
                {assetCategory === 'imovel' && (
                    <View>
                        {/* ITBI */}
                        <Text style={styles.label}>ITBI (Imposto Municipal)</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: 2,00"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={itbiPercentage}
                                    onChangeText={setItbiPercentage}
                                />
                                <Text style={styles.hint}>% sobre valor de compra</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.input, styles.calculatedField]}>
                                    <Text style={{ color: '#10b981', fontFamily: 'SpaceGrotesk-Bold', fontSize: 15 }}>
                                        R$ {formatBR(itbiAmount) || '0,00'}
                                    </Text>
                                </View>
                                <Text style={styles.hint}>Valor calculado</Text>
                            </View>
                        </View>
                        {showItbiWarning && (
                            <View style={styles.warningBox}>
                                <Ionicons name="warning" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                                <Text style={styles.warningText}>Geralmente entre 2% e 3%. Confira na prefeitura.</Text>
                            </View>
                        )}

                        {/* Cartório */}
                        <Text style={styles.label}>Despesas Totais com Cartório</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 5.000,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={notaryFees}
                            onChangeText={setNotaryFees}
                        />
                        <Text style={[styles.hint, { marginTop: -12, marginBottom: 12 }]}>Inclui escritura, registro e certidões</Text>

                        {/* Corretagem */}
                        <Text style={styles.label}>Corretagem (opcional)</Text>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: 5,00"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={brokeragePercentage}
                                    onChangeText={setBrokeragePercentage}
                                />
                                <Text style={styles.hint}>Geralmente 5% a 6%</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={[styles.input, styles.calculatedField]}>
                                    <Text style={{ color: '#10b981', fontFamily: 'SpaceGrotesk-Bold', fontSize: 15 }}>
                                        R$ {formatBR(brokerageAmount) || '0,00'}
                                    </Text>
                                </View>
                                <Text style={styles.hint}>Valor calculado</Text>
                            </View>
                        </View>

                        {/* Laudêmio */}
                        <View style={[styles.switchRow, { marginBottom: 12 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#e2e8f0', fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 }}>Laudêmio</Text>
                                <Text style={styles.hint}>Imóvel em área de marinha?</Text>
                            </View>
                            <Switch
                                value={isLaudemio}
                                onValueChange={setIsLaudemio}
                                trackColor={{ false: '#475569', true: '#10b981' }}
                                thumbColor="#ffffff"
                            />
                        </View>
                        {isLaudemio && (
                            <View style={[styles.infoBox, { borderColor: '#10b981', marginBottom: 16 }]}>
                                <Text style={{ color: '#e2e8f0', fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 }}>
                                    Laudêmio (5%): <Text style={{ color: '#10b981', fontFamily: 'SpaceGrotesk-Bold' }}>R$ {formatBR(laudemioAmount)}</Text>
                                </Text>
                            </View>
                        )}

                        {/* Avaliação Bancária (só financiado) */}
                        {acquisitionType === 'financed' && (
                            <>
                                <Text style={styles.label}>Avaliação Bancária</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: 3.500,00"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={bankAppraisalFee}
                                    onChangeText={setBankAppraisalFee}
                                />
                                <Text style={[styles.hint, { marginTop: -12, marginBottom: 12 }]}>Taxa cobrada pelo banco</Text>
                            </>
                        )}
                    </View>
                )}

                {/* ===== VEÍCULO ===== */}
                {assetCategory === 'veiculo' && (
                    <View>
                        {/* Alerta IPVA */}
                        {/* IPVA */}
                        <Text style={styles.label}>IPVA (proporcional ao ano)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 2.500,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={ipvaAmount}
                            onChangeText={setIpvaAmount}
                        />
                        <Text style={[styles.hint, { marginTop: -12, marginBottom: 12 }]}>Imposto anual — informe o valor pago na aquisição</Text>

                        {/* Transferência */}
                        <Text style={styles.label}>Taxa de Transferência (Detran)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 280,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={vehicleTransferTax}
                            onChangeText={setVehicleTransferTax}
                        />
                        <Text style={[styles.hint, { marginTop: -12, marginBottom: 12 }]}>Geralmente R$ 230 a R$ 290</Text>

                        {/* Vistoria */}
                        <Text style={styles.label}>Vistoria Veicular</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 150,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={vehicleInspectionFee}
                            onChangeText={setVehicleInspectionFee}
                        />
                        <Text style={[styles.hint, { marginTop: -12, marginBottom: 12 }]}>Geralmente R$ 100 a R$ 200</Text>

                        {/* Despachante */}
                        <View style={[styles.switchRow, { marginBottom: 8 }]}>
                            <Text style={{ color: '#e2e8f0', fontFamily: 'SpaceGrotesk-Medium' }}>Despachante</Text>
                            <Switch
                                value={hasAgent}
                                onValueChange={setHasAgent}
                                trackColor={{ false: '#475569', true: '#10b981' }}
                                thumbColor="#ffffff"
                            />
                        </View>
                        {hasAgent && (
                            <TextInput
                                style={[styles.input, { marginTop: 4 }]}
                                placeholder="Ex: 300,00"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={vehicleAgentFee}
                                onChangeText={setVehicleAgentFee}
                            />
                        )}
                    </View>
                )}

                {/* ===== OUTROS ===== */}
                {assetCategory === 'outro' && (
                    <View>
                        <Text style={styles.label}>Outros Custos (opcional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 500,00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={otherCosts}
                            onChangeText={setOtherCosts}
                        />
                        <Text style={[styles.hint, { marginTop: -12, marginBottom: 12 }]}>Seguro, embalagem especial, etc.</Text>
                    </View>
                )}

                {/* ===== RESUMO DE CUSTOS ===== */}
                {totalAcquisitionCost > 0 && (
                    <View style={[styles.costsSummary, { borderColor: sectionColor }]}>
                        <View style={styles.costsSummaryRow}>
                            <Text style={styles.costsSummaryLabel}>Total Custos</Text>
                            <Text style={[styles.costsSummaryValue, { color: '#f59e0b' }]}>
                                R$ {formatBR(totalAcquisitionCost)}
                            </Text>
                        </View>
                        <View style={[styles.costsSummaryRow, { marginTop: 8 }]}>
                            <Text style={styles.costsSummaryLabel}>Investimento Total</Text>
                            <Text style={[styles.costsSummaryValue, { color: '#10b981' }]}>
                                R$ {formatBR(totalInvestment)}
                            </Text>
                        </View>
                        <View style={[styles.costsBadge, { backgroundColor: sectionColor + '20' }]}>
                            <Text style={{ color: sectionColor, fontFamily: 'SpaceGrotesk-Bold', fontSize: 12 }}>
                                Custos = {costPercentage.toFixed(1)}% do valor de compra
                            </Text>
                        </View>
                    </View>
                )}
            </>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{initialData?.id ? 'Editar Bem' : 'Novo Bem'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>
                        {/* --- 1. IDENTIFICAÇÃO DO BEM --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>1. Identificação do Bem</Text>

                        <Text style={styles.label}>Nome do Bem (ex: Apartamento Centro)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome do bem"
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={styles.label}>Tipo de Ativo</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {assetTypes.map((t) => (
                                <TouchableOpacity
                                    key={t.value}
                                    onPress={() => setType(t.value)}
                                    style={[
                                        styles.typeChip,
                                        {
                                            backgroundColor: type === t.value ? theme.colors.primary : '#1e293b',
                                            borderColor: type === t.value ? theme.colors.primary : '#475569'
                                        }
                                    ]}
                                >
                                    <Text style={{ color: '#ffffff', fontSize: 13, fontFamily: 'SpaceGrotesk-Medium' }}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>



                        {/* --- 2. VALORES E DATAS --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>2. Valores e Datas</Text>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Valor Compra (R$)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0,00"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={purchaseValue}
                                    onChangeText={setPurchaseValue}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Valor Atual (R$)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0,00"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={currentValue}
                                    onChangeText={setCurrentValue}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Data de Aquisição (DD/MM/AAAA)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="DD/MM/AAAA"
                            placeholderTextColor="#94a3b8"
                            value={format(acquisitionDate, 'dd/MM/yyyy')}
                            onChangeText={(text) => {
                                const parts = text.split('/');
                                if (parts.length === 3) {
                                    const day = parseInt(parts[0]);
                                    const month = parseInt(parts[1]) - 1;
                                    const year = parseInt(parts[2]);
                                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                                        setAcquisitionDate(new Date(year, month, day));
                                    }
                                }
                            }}
                        />

                        {/* --- 3. FORMA DE AQUISIÇÃO --- */}
                        <Text style={[styles.sectionTitle, { color: '#f59e0b' }]}>3. Forma de Aquisição</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {acquisitionTypes.map((at) => (
                                <TouchableOpacity
                                    key={at.value}
                                    onPress={() => setAcquisitionType(at.value)}
                                    style={[
                                        styles.acquisitionChip,
                                        {
                                            backgroundColor: acquisitionType === at.value ? '#f59e0b' : '#1e293b',
                                            borderColor: acquisitionType === at.value ? '#f59e0b' : '#475569'
                                        }
                                    ]}
                                >
                                    <Ionicons
                                        name={at.icon as any}
                                        size={16}
                                        color={acquisitionType === at.value ? '#0f172a' : '#94a3b8'}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={{
                                        color: acquisitionType === at.value ? '#0f172a' : '#ffffff',
                                        fontSize: 13,
                                        fontFamily: 'SpaceGrotesk-Bold'
                                    }}>
                                        {at.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Cash: Auto expense info */}
                        {acquisitionType === 'cash' && (
                            <View style={[styles.infoBox, { borderColor: '#34d399' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="checkmark-circle" size={18} color="#34d399" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#e2e8f0', fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, flex: 1 }}>
                                        O valor será registrado automaticamente como saída no Dashboard.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Financed/Consortium: Redirect to debts */}
                        {(acquisitionType === 'financed' || acquisitionType === 'consortium') && (
                            <View style={[styles.infoBox, { borderColor: '#f59e0b' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                    <Text style={{ fontSize: 16, marginRight: 8 }}>💡</Text>
                                    <Text style={{ color: '#e2e8f0', fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, flex: 1 }}>
                                        Cadastre o financiamento deste bem na aba{' '}
                                        <Text style={{ color: '#f59e0b', fontFamily: 'SpaceGrotesk-Bold' }}>Dívidas {'>'} Empréstimos</Text>
                                        {' '}para acompanhar as parcelas.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* --- 4. DETALHES --- */}
                        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>4. Detalhes</Text>

                        <View style={[styles.switchRow, { borderBottomColor: '#334155', borderBottomWidth: 1, paddingBottom: 12 }]}>
                            <Text style={{ color: '#e2e8f0', fontFamily: 'SpaceGrotesk-Medium' }}>Possui Seguro?</Text>
                            <Switch
                                value={hasInsurance}
                                onValueChange={setHasInsurance}
                                trackColor={{ false: '#475569', true: theme.colors.primary }}
                                thumbColor="#ffffff"
                            />
                        </View>

                        {hasInsurance && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
                                {insurances.length > 0 ? insurances.map((ins) => (
                                    <TouchableOpacity
                                        key={ins.id}
                                        onPress={() => setSelectedInsurance(ins.id)}
                                        style={[
                                            styles.selectionChip,
                                            {
                                                backgroundColor: selectedInsurance === ins.id ? theme.colors.primary : '#1e293b',
                                                borderColor: selectedInsurance === ins.id ? theme.colors.primary : '#475569'
                                            }
                                        ]}
                                    >
                                        <Text style={{ color: '#ffffff', fontSize: 12 }}>{ins.insurer} ({ins.type})</Text>
                                    </TouchableOpacity>
                                )) : <Text style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>Nenhum seguro encontrado.</Text>}
                            </ScrollView>
                        )}

                        <Text style={[styles.label, { marginTop: 12 }]}>Detalhes / Localização</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Placa, Endereço, Nº Série, Observações..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            value={location}
                            onChangeText={setLocation}
                        />

                        {/* --- 5. CUSTOS DE AQUISIÇÃO (Dynamic) --- */}
                        {renderAcquisitionCosts()}

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>{loading ? 'Salvando...' : 'Salvar Bem'}</Text>
                        </TouchableOpacity>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        borderRadius: 16,
        padding: 24,
        width: '100%',
        backgroundColor: '#0f172a',
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 20,
        color: '#ffffff',
    },
    sectionTitle: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
        marginTop: 8,
        marginBottom: 16,
        textTransform: 'uppercase'
    },
    label: {
        fontFamily: 'SpaceGrotesk-Medium',
        fontSize: 14,
        marginBottom: 8,
        color: '#e2e8f0',
    },
    hint: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 11,
        color: '#64748b',
        marginTop: -4,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 16,
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        color: '#ffffff',
    },
    calculatedField: {
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        borderColor: '#10b981',
        borderStyle: 'dashed',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 8,
    },
    acquisitionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        marginRight: 10,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    selectionChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 8,
    },
    infoBox: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
        backgroundColor: '#1e293b',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f59e0b15',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    warningText: {
        color: '#fbbf24',
        fontFamily: 'SpaceGrotesk-Medium',
        fontSize: 12,
    },
    costsSummary: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginVertical: 16,
        backgroundColor: '#1e293b',
    },
    costsSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    costsSummaryLabel: {
        color: '#94a3b8',
        fontFamily: 'SpaceGrotesk-Medium',
        fontSize: 14,
    },
    costsSummaryValue: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    costsBadge: {
        marginTop: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'center',
    },
    button: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    buttonText: {
        color: '#FFF',
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    imageUploadContainer: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        overflow: 'hidden',
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadBadge: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
});
