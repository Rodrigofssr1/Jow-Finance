import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    Dimensions,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Asset } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { useFuelLogs } from '../../hooks/useFuelLogs';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset3DView } from './Asset3DView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AssetDetailModalProps {
    visible: boolean;
    onClose: () => void;
    asset: Asset | null;
    onEdit: (asset: Asset) => void;
    onSell: (asset: Asset) => void;
    onDelete?: (asset: Asset) => void;
}

export const AssetDetailModal = ({ visible, onClose, asset, onEdit, onSell, onDelete }: AssetDetailModalProps) => {
    const { theme } = useTheme();
    const { fuelLogs, getMonthlyStats } = useFuelLogs(asset?.id);
    const monthlyStats = getMonthlyStats();

    if (!asset) return null;

    const isVehicle = asset.type.startsWith('veiculo');
    const acquisitionCosts = asset.acquisition_costs || { total_acquisition_cost: 0 };
    const totalInvested = asset.purchase_value + (acquisitionCosts.total_acquisition_cost || 0);
    const profit = asset.current_value - totalInvested;
    const profitPercent = (profit / totalInvested) * 100;
    const isPositive = profit >= 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                    {/* Header Fixed */}
                    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Detalhes do Bem</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Image/Preview Section */}
                        <View style={styles.mediaSection}>
                            {asset.image_url ? (
                                <Image source={{ uri: asset.image_url }} style={styles.mainImage} resizeMode="cover" />
                            ) : (
                                <View style={styles.placeholderGradient}>
                                    <Asset3DView assetType={asset.type} iconSize={120} />
                                </View>
                            )}
                        </View>

                        {/* Title Section */}
                        <View style={styles.section}>
                            <Text style={[styles.assetName, { color: theme.colors.text }]}>{asset.name}</Text>
                            <Text style={[styles.assetType, { color: theme.colors.textSecondary }]}>
                                {asset.type.replace('_', ' ').toUpperCase()} | {asset.acquisition_type === 'financed' ? 'Financiado' : 'À Vista'}
                            </Text>
                        </View>

                        {/* Financial Cards */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                                <Text style={styles.statLabel}>INVESTIDO</Text>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {formatCurrency(totalInvested)}
                                </Text>
                                <Text style={styles.statSubText}>
                                    Compra + {formatCurrency(acquisitionCosts.total_acquisition_cost || 0)} custos
                                </Text>
                            </View>

                            <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                                <Text style={styles.statLabel}>VALOR ATUAL</Text>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {formatCurrency(asset.current_value)}
                                </Text>
                                <View style={styles.profitBadge}>
                                    <Ionicons
                                        name={isPositive ? "trending-up" : "trending-down"}
                                        size={12}
                                        color={isPositive ? theme.colors.success : theme.colors.error}
                                    />
                                    <Text style={[styles.profitText, { color: isPositive ? theme.colors.success : theme.colors.error }]}>
                                        {isPositive ? '+' : ''}{formatCurrency(profit)} ({profitPercent.toFixed(1)}%)
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Fuel Stats (Vehicles) */}
                        {isVehicle && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={{ width: 20, alignItems: 'center' }}>
                                        <Ionicons name="water-outline" size={20} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>COMBUSTÍVEL</Text>
                                </View>
                                <View style={[styles.infoBox, { backgroundColor: theme.colors.card }]}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Média Mensal</Text>
                                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                                            {formatCurrency(monthlyStats.totalCost)}
                                        </Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Último Abastecimento</Text>
                                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                                            {fuelLogs.length > 0 ? formatDate(fuelLogs[0].date) : 'N/A'}
                                        </Text>
                                    </View>
                                    {/* Mini Graph Placeholder or List */}
                                    {fuelLogs.length > 0 && (
                                        <View style={styles.miniList}>
                                            {fuelLogs.slice(0, 3).map((log, idx) => (
                                                <View key={log.id} style={styles.miniListItem}>
                                                    <Text style={styles.miniListDate}>{formatDate(log.date)}</Text>
                                                    <Text style={[styles.miniListValue, { color: theme.colors.text }]}>{formatCurrency(log.total_cost)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Extra Details */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>DETALHES</Text>
                            </View>
                            <View style={[styles.infoBox, { backgroundColor: theme.colors.card }]}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Data de Aquisição</Text>
                                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{formatDate(asset.acquisition_date)}</Text>
                                </View>
                                {asset.location && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Localização</Text>
                                        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{asset.location}</Text>
                                    </View>
                                )}
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Seguro Ativo</Text>
                                    <Text style={[styles.infoValue, { color: asset.insurance_id ? theme.colors.success : theme.colors.textSecondary }]}>
                                        {asset.insurance_id ? 'Sim' : 'Não'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                onPress={() => { onClose(); onEdit(asset); }}
                                style={[styles.actionBtn, { borderColor: theme.colors.primary, borderWidth: 1 }]}
                            >
                                <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                                <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { onClose(); onSell(asset); }}
                                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                            >
                                <Ionicons name="cash" size={18} color="#FFF" />
                                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Vender</Text>
                            </TouchableOpacity>
                            {onDelete && (
                                <TouchableOpacity
                                    onPress={() => { onClose(); onDelete(asset); }}
                                    style={[styles.actionBtn, { borderColor: theme.colors.error, borderWidth: 1, backgroundColor: 'rgba(239,68,68,0.1)' }]}
                                >
                                    <Ionicons name="trash" size={18} color={theme.colors.error} />
                                    <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Excluir</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    container: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.9,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 8,
    },
    headerTitle: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 18,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    mediaSection: {
        width: '100%',
        height: 240,
        backgroundColor: '#000',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    placeholderGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: {
        padding: 20,
    },
    assetName: {
        fontSize: 28,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    assetType: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk-Medium',
        letterSpacing: 1,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        gap: 10,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'SpaceGrotesk-Bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    statSubText: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    profitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    profitText: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk-Bold',
        letterSpacing: 1,
    },
    infoBox: {
        padding: 16,
        borderRadius: 20,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'SpaceGrotesk-Regular',
    },
    infoValue: {
        fontSize: 14,
        fontFamily: 'SpaceGrotesk-Medium',
    },
    miniList: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
        gap: 8,
    },
    miniListItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    miniListDate: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
    },
    miniListValue: {
        fontSize: 12,
        fontFamily: 'SpaceGrotesk-Medium',
    },
    actionRow: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionBtnText: {
        fontSize: 16,
        fontFamily: 'SpaceGrotesk-Bold',
    },
});
