import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl, Alert, Platform } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Asset } from '../../src/types';
import { AssetCard } from '../../src/components/assets/AssetCard';
import { AddAssetModal } from '../../src/components/assets/AddAssetModal';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useAssets } from '../../src/hooks/useAssets';
import { AssetShowcase } from '../../src/components/assets/AssetShowcase';
import { LinearGradient } from 'expo-linear-gradient';
import { AssetDetailModal } from '../../src/components/assets/AssetDetailModal';

export default function AssetsScreen() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [filter, setFilter] = useState('todos');
    const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const { deleteAsset, fetchAssetCosts } = useAssets();

    const handleEditAsset = async (item: Asset) => {
        // Load acquisition costs for this asset before opening modal
        const costs = await fetchAssetCosts(item.id);
        setSelectedAsset({ ...item, acquisition_costs: costs || undefined } as any);
        setModalVisible(true);
    };

    const handleViewDetails = async (item: Asset) => {
        const costs = await fetchAssetCosts(item.id);
        setSelectedAsset({ ...item, acquisition_costs: costs || undefined } as any);
        setDetailModalVisible(true);
    };

    // Totals
    const [totalAssets, setTotalAssets] = useState(0);
    const [totalDebt, setTotalDebt] = useState(0);
    const [netWorth, setNetWorth] = useState(0);

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        try {
            if (!user) return;
            const { data: assetsData, error: assetsError } = await supabase
                .from('assets')
                .select('*, debt:debt_id(original_amount, paid_installments, total_installments, monthly_payment)')
                .eq('user_id', user.id)
                .order('current_value', { ascending: false });

            if (assetsError) throw assetsError;

            const assetsList = assetsData || [];
            const totalVal = assetsList.reduce((acc, curr) => acc + (curr.current_value || 0), 0);

            let debtVal = 0;
            assetsList.forEach((a: any) => {
                if (a.debt) {
                    const remaining = (a.debt.total_installments - a.debt.paid_installments) * a.debt.monthly_payment;
                    if (remaining > 0) debtVal += remaining;
                }
            });

            setAssets(assetsList);
            setTotalAssets(totalVal);
            setTotalDebt(debtVal);
            setNetWorth(totalVal - debtVal);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const handleDeleteAsset = async (asset: Asset) => {
        const isWeb = Platform.OS === 'web';

        const performDelete = async (deleteTransaction: boolean = false) => {
            try {
                setDeletingId(asset.id);
                await deleteAsset.mutateAsync({ id: asset.id, deleteTransaction });

                if (isWeb) {
                    // For web, we might not have Alert accessible or working same way
                    console.log('Bem excluído com sucesso');
                } else {
                    Alert.alert('Sucesso', deleteTransaction ? 'Bem e transação vinculada excluídos.' : 'Bem excluído.');
                }

                fetchAssets();
            } catch (e: any) {
                if (isWeb) {
                    alert(`Erro ao excluir: ${e.message}`);
                } else {
                    Alert.alert('Erro', e.message);
                }
            } finally {
                setDeletingId(null);
            }
        };

        if (asset.acquisition_transaction_id) {
            if (isWeb) {
                const confirmed = window.confirm(
                    `Deseja excluir "${asset.name}"?\n\nEste bem possui uma transação de saída vinculada. Clique em OK para excluir TUDO ou Cancelar para não fazer nada.\n\n(Para manter a transação e excluir só o bem, use o modo Mobile ou contate suporte).`
                );
                if (confirmed) await performDelete(true);
            } else {
                Alert.alert(
                    'Excluir Bem',
                    `Deseja excluir "${asset.name}"?\n\nEste bem possui uma transação de saída vinculada no caixa. O que deseja fazer?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Excluir Tudo',
                            style: 'destructive',
                            onPress: () => performDelete(true),
                        },
                        {
                            text: 'Só o Bem',
                            onPress: () => performDelete(false),
                        },
                    ]
                );
            }
        } else {
            if (isWeb) {
                const confirmed = window.confirm(`Deseja excluir "${asset.name}"?`);
                if (confirmed) await performDelete();
            } else {
                Alert.alert(
                    'Excluir Bem',
                    `Deseja excluir "${asset.name}"?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Excluir',
                            style: 'destructive',
                            onPress: () => performDelete(),
                        },
                    ]
                );
            }
        }
    };

    const router = useRouter();
    const params = useLocalSearchParams();

    // Fetch assets on focus - NO params/router in deps to avoid infinite loop
    useFocusEffect(
        useCallback(() => {
            fetchAssets();
        }, [fetchAssets])
    );

    // Handle deep-link params separately
    useEffect(() => {
        if (params.openModal === 'true') {
            const newAssetData = {
                name: typeof params.nome === 'string' ? params.nome : '',
                type: typeof params.asset_type === 'string' ? params.asset_type : 'outro',
                purchase_value: params.valor ? Number(params.valor) : 0,
                current_value: params.valor ? Number(params.valor) : 0,
            };

            setSelectedAsset(newAssetData as any);
            setModalVisible(true);
            router.setParams({ openModal: undefined, nome: undefined, valor: undefined, asset_type: undefined });
        }
    }, [params.openModal]);

    const filteredAssets = filter === 'todos'
        ? assets
        : assets.filter(a => {
            if (filter === 'imoveis') return a.type.startsWith('imovel');
            if (filter === 'veiculos') return a.type.startsWith('veiculo');
            return a.type === filter;
        });

    const filters = [
        { id: 'todos', label: 'Todos' },
        { id: 'imoveis', label: 'Imóveis' },
        { id: 'veiculos', label: 'Veículos' },
        { id: 'eletro_eletronico', label: 'Eletrônicos' },
        { id: 'joia', label: 'Joias' },
    ];

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            style={{ flex: 1 }}
        >
            <View style={{ flex: 1 }}>
                {/* Header Title & Add Button */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                    <View>
                        <Text style={{ color: theme.colors.text, fontSize: 20, fontFamily: 'SpaceGrotesk-Bold' }}>Meus Bens</Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Gestão de Patrimônio</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedAsset(undefined);
                            setModalVisible(true);
                        }}
                        style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
                    >
                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ Adicionar</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAssets} />}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* Header Summary Cards */}
                    <View style={[styles.headerContainer, { backgroundColor: 'rgba(255, 255, 255, 0.05)', marginTop: 16 }]}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, { color: theme.colors.text + '80' }]}>Total em Bens</Text>
                            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAssets)}
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryLabel, { color: theme.colors.text + '80' }]}>Patrimônio Líquido</Text>
                            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netWorth)}
                            </Text>
                        </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                        {filters.map((f) => (
                            <TouchableOpacity
                                key={f.id}
                                onPress={() => setFilter(f.id)}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: filter === f.id ? theme.colors.primary : 'rgba(255, 255, 255, 0.05)',
                                        borderColor: filter === f.id ? theme.colors.primary : 'rgba(255, 255, 255, 0.1)',
                                        borderWidth: 1
                                    }
                                ]}
                            >
                                <Text style={{ color: filter === f.id ? '#FFF' : theme.colors.text }}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* View Toggle */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: 2 }}>
                            <TouchableOpacity
                                onPress={() => setViewMode('list')}
                                style={{ padding: 6, borderRadius: 6, backgroundColor: viewMode === 'list' ? 'rgba(255, 255, 255, 0.1)' : 'transparent' }}
                            >
                                <Ionicons name="list" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setViewMode('grid')}
                                style={{ padding: 6, borderRadius: 6, backgroundColor: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.1)' : 'transparent' }}
                            >
                                <Ionicons name="grid" size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Assets List or Grid */}
                    <View style={{ paddingHorizontal: 16 }}>
                        {viewMode === 'grid' ? (
                            <AssetShowcase
                                assets={filteredAssets}
                                onViewDetails={handleViewDetails}
                            />
                        ) : (
                            filteredAssets.map((item) => (
                                <AssetCard
                                    key={item.id}
                                    item={item}
                                    onPress={() => handleViewDetails(item)}
                                    onLongPress={() => handleDeleteAsset(item)}
                                    deleting={deletingId === item.id}
                                />
                            ))
                        )}

                        {filteredAssets.length === 0 && !loading && (
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Ionicons name="wallet-outline" size={48} color={theme.colors.text + '40'} />
                                <Text style={{ color: theme.colors.text + '80', marginTop: 10 }}>Nenhum ativo encontrado.</Text>
                                <TouchableOpacity onPress={() => { setSelectedAsset(undefined); setModalVisible(true); }} style={{ marginTop: 16 }}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Cadastrar primeiro bem</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* FAB */}
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.colors.primary, zIndex: 999 }]}
                    onPress={() => { setSelectedAsset(undefined); setModalVisible(true); }}
                >
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>

                <AddAssetModal
                    visible={modalVisible}
                    onClose={() => { setModalVisible(false); setSelectedAsset(undefined); }}
                    onSuccess={fetchAssets}
                    initialData={selectedAsset}
                />

                <AssetDetailModal
                    visible={detailModalVisible}
                    asset={selectedAsset || null}
                    onClose={() => setDetailModalVisible(false)}
                    onEdit={handleEditAsset}
                    onSell={(asset) => Alert.alert('Em breve', 'Funcionalidade de venda')}
                    onDelete={handleDeleteAsset}
                />
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        padding: 24,
        margin: 16,
        borderRadius: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 10,
    },
    summaryLabel: {
        fontSize: 12,
        marginBottom: 4,
        fontFamily: 'SpaceGrotesk-Regular',
    },
    summaryValue: {
        fontSize: 20,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
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
