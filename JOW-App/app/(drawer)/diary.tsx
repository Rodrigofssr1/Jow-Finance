import React, { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { View, StyleSheet, TouchableOpacity, SectionList, TextInput, ActivityIndicator, Share, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import { H2, H3, Body, Caption } from '../../src/components/Typography';
import { spacing, borderRadius } from '../../src/theme';
import { useDiary, DiaryItem } from '../../src/hooks/useDiary';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { useTransactionModal } from '../../src/context/TransactionModalContext';
import { AddLoanModal } from '../../src/components/debts/AddLoanModal';
import { AddSubscriptionModal } from '../../src/components/debts/AddSubscriptionModal';
import { AddInsuranceModal } from '../../src/components/debts/AddInsuranceModal';
import { AddAssetModal } from '../../src/components/assets/AddAssetModal';
import { supabase } from '../../src/lib/supabase';
import { showAlert, showConfirm, showAlertWithButtons } from '../../src/utils/platformAlert';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function DiaryScreen() {
    const { theme } = useTheme();
    const { diaryItems, isLoading } = useDiary();
    const { openModal } = useTransactionModal();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal states for editing
    const [loanModalVisible, setLoanModalVisible] = useState(false);
    const [subModalVisible, setSubModalVisible] = useState(false);
    const [insModalVisible, setInsModalVisible] = useState(false);
    const [assetModalVisible, setAssetModalVisible] = useState(false);
    const [selectedData, setSelectedData] = useState<any>(null);

    const filteredItems = useMemo(() => {
        return diaryItems.filter(item => {
            const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'todos' || item.type === filterType;

            // Date Filter
            let matchesDate = true;
            const itemDate = new Date(item.date.split('T')[0]);

            if (startDate.length === 10) {
                const [d, m, y] = startDate.split('/');
                const start = new Date(`${y}-${m}-${d}`);
                if (itemDate < start) matchesDate = false;
            }

            if (endDate.length === 10) {
                const [d, m, y] = endDate.split('/');
                const end = new Date(`${y}-${m}-${d}`);
                if (itemDate > end) matchesDate = false;
            }

            return matchesSearch && matchesType && matchesDate;
        });
    }, [diaryItems, searchQuery, filterType, startDate, endDate]);

    const groupedItems = useMemo(() => {
        const groups: { [key: string]: DiaryItem[] } = {};
        filteredItems.forEach(item => {
            const dateStr = item.date.split('T')[0];
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(item);
        });

        return Object.keys(groups).map(date => {
            let title = format(parseISO(date), "dd 'de' MMMM", { locale: ptBR });
            if (isToday(parseISO(date))) title = 'HOJE';
            else if (isYesterday(parseISO(date))) title = 'ONTEM';

            return {
                title,
                data: groups[date]
            };
        });
    }, [filteredItems]);

    const handleEdit = (item: DiaryItem) => {
        switch (item.type) {
            case 'cash_flow':
                openModal(item.original_data);
                break;
            case 'credit_card':
                // For now, Credit Card transactions share AddTransactionModal or are view-only
                openModal({ ...item.original_data, isCreditCard: true });
                break;
            case 'loan':
                setSelectedData(item.original_data);
                setLoanModalVisible(true);
                break;
            case 'subscription':
                setSelectedData(item.original_data);
                setSubModalVisible(true);
                break;
            case 'insurance':
                setSelectedData(item.original_data);
                setInsModalVisible(true);
                break;
            case 'investment':
                setSelectedData(item.original_data);
                setAssetModalVisible(true);
                break;
            default:
                showAlert('Info', 'Edição para este tipo em breve.');
        }
    };

    const handleDelete = async (item: DiaryItem) => {
        const performDelete = async (table: string, id: string) => {
            try {
                // Determine the correct field name for the ID if not 'id'
                const idField = table === 'installments' ? 'id' : 'id';

                const { error } = await supabase.from(table).delete().eq(idField, id);
                if (error) throw error;

                // CRITICAL: Invalidate queries to refresh UI
                queryClient.invalidateQueries({ queryKey: ['diary_transactions'] });
                queryClient.invalidateQueries({ queryKey: ['diary_installments'] });
                queryClient.invalidateQueries({ queryKey: ['diary_loans'] });
                queryClient.invalidateQueries({ queryKey: ['diary_subs'] });
                queryClient.invalidateQueries({ queryKey: ['diary_insurance'] });
                queryClient.invalidateQueries({ queryKey: ['diary_invest'] });

                showAlert('Sucesso', 'Item removido com sucesso.');
            } catch (error: any) {
                showAlert('Erro', error.message);
                console.error('Delete error:', error);
            }
        };

        // Compras de cartão agora vêm da tabela installments (type: 'credit_card')
        if (item.type === 'credit_card') {
            const parent = item.original_data?.credit_card_transactions;
            const totalParcelas = parent?.installment_count || 1;
            const parentTxId = item.original_data?.credit_card_transaction_id;

            if (totalParcelas > 1) {
                // Compra parcelada: perguntar se exclui parcela individual ou toda a compra
                showAlertWithButtons(
                    'Excluir Parcelamento',
                    'Deseja excluir apenas esta parcela ou todo o registro da compra?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Apenas esta parcela',
                            style: 'default',
                            onPress: () => performDelete('installments', item.id)
                        },
                        {
                            text: 'Toda a Compra',
                            style: 'destructive',
                            onPress: () => parentTxId ? performDelete('credit_card_transactions', parentTxId) : performDelete('installments', item.id)
                        }
                    ]
                );
            } else {
                // Compra à vista (1x): confirmar exclusão direta
                showAlertWithButtons(
                    'Excluir Compra',
                    `Deseja excluir "${parent?.description || item.description}"?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Excluir',
                            style: 'destructive',
                            onPress: () => parentTxId ? performDelete('credit_card_transactions', parentTxId) : performDelete('installments', item.id)
                        }
                    ]
                );
            }
            return;
        }

        if (item.type === 'loan') {
            showAlertWithButtons(
                'Excluir Empréstimo',
                'Deseja excluir este empréstimo? Isso removerá todo o histórico vinculado.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir Empréstimo', style: 'destructive', onPress: () => performDelete('loans', item.id) }
                ]
            );
            return;
        }

        // Default deletion
        const confirmed = await showConfirm(
            'Excluir',
            `Deseja realmente excluir "${item.description}"?`
        );

        if (!confirmed) return;

        let table = '';
        switch (item.type) {
            case 'cash_flow': table = 'transactions'; break;
            case 'subscription': table = 'subscriptions'; break;
            case 'insurance': table = 'insurances'; break;
            case 'investment': table = 'investments'; break;
            // credit_card é tratado acima com lógica específica de parcelas
        }

        if (table) {
            performDelete(table, item.id);
        }
    };

    const handleExport = async () => {
        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; background: #fff; color: #333; }
                        h1 { color: #4850e5; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
                        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
                        .income { color: #22c55e; }
                        .expense { color: #ef4444; }
                        .footer { margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>Relatório JOW - Diário Financeiro</h1>
                    <p>Período: ${startDate || 'Início'} até ${endDate || 'Hoje'}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Descrição</th>
                                <th>Categoria</th>
                                <th>Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredItems.map(i => `
                                <tr>
                                    <td>${format(parseISO(i.date), 'dd/MM/yyyy')}</td>
                                    <td>${i.label}</td>
                                    <td>${i.description}</td>
                                    <td>${i.category}</td>
                                    <td class="${i.amount >= 0 ? 'income' : 'expense'}">
                                        ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.amount)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">Gerado automaticamente pelo JOW Finance.</div>
                </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                const { uri } = await Print.printToFileAsync({ html });
                window.open(uri, '_blank');
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            showAlert('Erro ao exportar PDF');
            console.error(error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'cash_flow': return 'swap-horizontal';
            case 'credit_card': return 'card';
            case 'loan': return 'trending-down';
            case 'subscription': return 'repeat';
            case 'insurance': return 'shield-checkmark';
            case 'investment': return 'trending-up';
            default: return 'document-text';
        }
    };

    const renderItem = ({ item }: { item: DiaryItem }) => (
        <View style={[styles.itemCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name={getIcon(item.type)} size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.itemInfo}>
                <H3 numberOfLines={1}>{item.description}</H3>
                <Caption>{item.label} • {item.category}</Caption>
            </View>
            <View style={styles.itemValues}>
                <Body color={item.amount >= 0 ? theme.colors.success : theme.colors.error} style={styles.amountText}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                </Body>
                <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                        <Ionicons name="pencil" size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <H2>Diário Financeiro</H2>
                    <TouchableOpacity onPress={handleExport} style={[styles.exportBtn, { borderColor: theme.colors.border }]}>
                        <Ionicons name="download-outline" size={18} color={theme.colors.text} />
                        <Caption style={{ marginLeft: 4 }}>Exportar</Caption>
                    </TouchableOpacity>
                </View>

                <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Buscar transações..."
                        placeholderTextColor={theme.colors.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <View style={styles.dateFilterContainer}>
                    <View style={[styles.dateInput, { backgroundColor: theme.colors.card }]}>
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.textTertiary} />
                        <TextInput
                            style={[styles.datePickerInput, { color: theme.colors.text }]}
                            placeholder="Início: DD/MM/AAAA"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={startDate}
                            onChangeText={text => {
                                let v = text.replace(/\D/g, '');
                                if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                                if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5);
                                if (v.length > 10) v = v.slice(0, 10);
                                setStartDate(v);
                            }}
                            keyboardType="numeric"
                            maxLength={10}
                        />
                    </View>
                    <View style={[styles.dateInput, { backgroundColor: theme.colors.card }]}>
                        <Ionicons name="calendar-outline" size={16} color={theme.colors.textTertiary} />
                        <TextInput
                            style={[styles.datePickerInput, { color: theme.colors.text }]}
                            placeholder="Fim: DD/MM/AAAA"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={endDate}
                            onChangeText={text => {
                                let v = text.replace(/\D/g, '');
                                if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                                if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5);
                                if (v.length > 10) v = v.slice(0, 10);
                                setEndDate(v);
                            }}
                            keyboardType="numeric"
                            maxLength={10}
                        />
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
                    {['todos', 'cash_flow', 'credit_card', 'loan', 'subscription', 'insurance', 'investment'].map(type => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setFilterType(type)}
                            style={[
                                styles.filterChip,
                                filterType === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            ]}
                        >
                            <Caption color={filterType === type ? '#FFF' : theme.colors.textSecondary}>
                                {type === 'todos' ? 'Todos' :
                                    type === 'cash_flow' ? 'Fluxo' :
                                        type === 'credit_card' ? 'Cartão' :
                                            type === 'loan' ? 'Empréstimos' :
                                                type === 'subscription' ? 'Assinaturas' :
                                                    type === 'insurance' ? 'Seguros' : 'Investimentos'}
                            </Caption>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <SectionList
                    sections={groupedItems}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Caption style={styles.sectionTitle}>{title}</Caption>
                            <View style={[styles.sectionDivider, { backgroundColor: theme.colors.border + '40' }]} />
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    stickySectionHeadersEnabled={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={48} color={theme.colors.text + '20'} />
                            <Body color={theme.colors.textSecondary}>Nenhuma movimentação encontrada.</Body>
                        </View>
                    }
                />
            )}

            {/* Editing Modals */}
            <AddLoanModal visible={loanModalVisible} onClose={() => setLoanModalVisible(false)} onSuccess={() => { }} initialData={selectedData} />
            <AddSubscriptionModal visible={subModalVisible} onClose={() => setSubModalVisible(false)} onSuccess={() => { }} initialData={selectedData} />
            <AddInsuranceModal visible={insModalVisible} onClose={() => setInsModalVisible(false)} onSuccess={() => { }} initialData={selectedData} />
            <AddAssetModal visible={assetModalVisible} onClose={() => setAssetModalVisible(false)} onSuccess={() => { }} initialData={selectedData} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: spacing[4],
        paddingHorizontal: spacing[4],
        paddingBottom: spacing[4],
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[4],
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1.5],
        borderRadius: borderRadius.md,
        borderWidth: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[3],
        height: 44,
        borderRadius: borderRadius.lg,
        marginBottom: spacing[3],
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing[2],
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 14,
    },
    dateFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing[3],
    },
    dateInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[2],
        height: 38,
        borderRadius: borderRadius.md,
        marginHorizontal: spacing[1],
    },
    datePickerInput: {
        flex: 1,
        marginLeft: spacing[2],
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 12,
    },
    filterBar: {
        paddingBottom: spacing[2],
    },
    filterChip: {
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1.5],
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        marginRight: spacing[2],
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: spacing[4],
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing[6],
        marginBottom: spacing[3],
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginRight: spacing[3],
    },
    sectionDivider: {
        flex: 1,
        height: 1,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing[3],
        borderRadius: borderRadius.lg,
        marginBottom: spacing[2],
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing[3],
    },
    itemInfo: {
        flex: 1,
    },
    itemValues: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontFamily: 'JetBrainsMono-Bold',
        fontSize: 14,
        marginBottom: 4,
    },
    itemActions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: spacing[3],
        padding: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
});
