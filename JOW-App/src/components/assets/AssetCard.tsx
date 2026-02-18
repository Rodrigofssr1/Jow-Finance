import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../../types';
import { format } from 'date-fns';

interface AssetCardProps {
    item: Asset;
    onPress?: () => void;
    onLongPress?: () => void;
    deleting?: boolean;
}

export const AssetCard = ({ item, onPress, onLongPress, deleting }: AssetCardProps) => {
    const { theme } = useTheme();

    const getIcon = (type: string) => {
        switch (type) {
            case 'imovel_residencial': return 'home';
            case 'imovel_comercial': return 'business';
            case 'veiculo_carro': return 'car-sport';
            case 'veiculo_moto': return 'bicycle';
            case 'eletro_eletronico': return 'laptop-outline';
            case 'joia': return 'diamond';
            case 'obra_arte': return 'color-palette';
            case 'colecionavel': return 'cube';
            default: return 'wallet';
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'imovel_residencial': return 'Imóvel Residencial';
            case 'imovel_comercial': return 'Imóvel Comercial';
            case 'veiculo_carro': return 'Carro';
            case 'veiculo_moto': return 'Moto';
            case 'eletro_eletronico': return 'Eletrônico';
            case 'joia': return 'Joia';
            case 'obra_arte': return 'Obra de Arte';
            case 'colecionavel': return 'Colecionável';
            default: return 'Outro';
        }
    };

    const appreciation = item.current_value - item.purchase_value;
    const appreciationPercent = item.purchase_value > 0
        ? (appreciation / item.purchase_value) * 100
        : 0;
    const isPositive = appreciation >= 0;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={deleting}
            style={[
                styles.card,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                deleting && { opacity: 0.5 }
            ]}
        >
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Ionicons name={getIcon(item.type) as any} size={20} color={theme.colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
                        <Text style={[styles.type, { color: theme.colors.text + '80' }]}>
                            {getTypeLabel(item.type)}
                        </Text>
                    </View>
                </View>
                {/* Badges */}
                <View style={{ flexDirection: 'row' }}>
                    {item.debt_id && (
                        <View style={[styles.badge, { backgroundColor: '#FF9800' + '20', marginRight: 4 }]}>
                            <Ionicons name="cash-outline" size={12} color="#FF9800" />
                        </View>
                    )}
                    {item.insurance_id && (
                        <View style={[styles.badge, { backgroundColor: '#4RAF50' + '20' }]}>
                            <Ionicons name="shield-checkmark-outline" size={12} color="#4RAF50" />
                        </View>
                    )}
                    {deleting && (
                        <View style={{ marginLeft: 8 }}>
                            <ActivityIndicator size="small" color={theme.colors.error} />
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.body}>
                <View>
                    <Text style={[styles.label, { color: theme.colors.text + '80' }]}>Valor Atual</Text>
                    <Text style={[styles.value, { color: theme.colors.text }]}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.current_value)}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.label, { color: theme.colors.text + '80' }]}>Compra</Text>
                    <Text style={[styles.subValue, { color: theme.colors.text + '80' }]}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.purchase_value)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons
                            name={isPositive ? "trending-up" : "trending-down"}
                            size={12}
                            color={isPositive ? theme.colors.success : theme.colors.error}
                        />
                        <Text style={{
                            fontSize: 12,
                            fontWeight: 'bold',
                            color: isPositive ? theme.colors.success : theme.colors.error,
                            marginLeft: 4
                        }}>
                            {Math.abs(appreciationPercent).toFixed(1)}%
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    name: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 16,
    },
    type: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 12,
    },
    badge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
    },
    value: {
        fontFamily: 'SpaceGrotesk-Bold',
        fontSize: 20,
    },
    subValue: {
        fontFamily: 'SpaceGrotesk-Regular',
        fontSize: 14,
        textDecorationLine: 'line-through',
    },
});
