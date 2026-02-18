import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Asset } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeIn,
    Layout,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { formatCurrency } from '../../utils/format';
import { useFuelLogs } from '../../hooks/useFuelLogs';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset3DView } from './Asset3DView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = Platform.OS === 'web' && SCREEN_WIDTH > 1024;
const COLUMN_COUNT = IS_DESKTOP ? 3 : 2;
const GAP = IS_DESKTOP ? 32 : 20;
const PADDING = 24;
const ITEM_WIDTH = (SCREEN_WIDTH - (PADDING * 2) - (COLUMN_COUNT - 1) * GAP) / COLUMN_COUNT;

interface AssetShowcaseProps {
    assets: Asset[];
    onEdit?: (asset: Asset) => void;
    onDelete?: (id: string) => void;
    onSell?: (asset: Asset) => void;
    onViewDetails: (asset: Asset) => void;
    deletingId?: string | null;
}

const FuelBar = ({ asset, theme }: { asset: Asset; theme: any }) => {
    const { getMonthlyStats } = useFuelLogs(asset.id);
    const { totalCost } = getMonthlyStats();

    const LIMIT = 1000;
    const percentage = Math.min((totalCost / LIMIT) * 100, 100);

    // Cores Neon
    const neonColor = totalCost < (LIMIT * 0.5) ? '#10B981' : totalCost < (LIMIT * 0.8) ? '#F59E0B' : '#EF4444';
    const glowColor = totalCost < (LIMIT * 0.5) ? 'rgba(16, 185, 129, 0.6)' : totalCost < (LIMIT * 0.8) ? 'rgba(245, 158, 11, 0.6)' : 'rgba(239, 68, 68, 0.6)';

    if (totalCost === 0) {
        return (
            <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontFamily: 'SpaceGrotesk-Medium' }}>
                    Tanque pronto para uso ⛽
                </Text>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontFamily: 'SpaceGrotesk-Medium', letterSpacing: 1 }}>COMBUSTÍVEL</Text>
                <Text style={{ fontSize: 10, color: neonColor, fontFamily: 'SpaceGrotesk-Bold' }}>{formatCurrency(totalCost)}</Text>
            </View>
            <View style={styles.fuelTrack}>
                <View style={[
                    styles.fuelFill,
                    {
                        width: `${percentage}%`,
                        backgroundColor: neonColor,
                        shadowColor: glowColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 1,
                        shadowRadius: 8,
                        elevation: 5
                    }
                ]} />
            </View>
        </View>
    );
};

const AssetGridCard = ({ asset, onViewDetails, theme }: {
    asset: Asset,
    onViewDetails: (a: Asset) => void,
    theme: any
}) => {
    const isVehicle = asset.type.startsWith('veiculo');
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: withSpring(scale.value) },
                { translateY: withSpring(translateY.value) }
            ],
        };
    });

    const handlePressIn = () => {
        scale.value = 1.02;
        translateY.value = -8;
    };

    const handlePressOut = () => {
        scale.value = 1;
        translateY.value = 0;
    };

    return (
        <Animated.View
            layout={Layout}
            entering={FadeIn}
            style={[styles.cardContainer, animatedStyle]}
        >
            <TouchableOpacity
                onPress={() => onViewDetails(asset)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                style={styles.touchable}
            >
                {/* Iluminação Spot de Topo */}
                <LinearGradient
                    colors={['rgba(255,255,255,0.15)', 'transparent']}
                    style={styles.spotLight}
                />

                <View style={styles.imageWrapper}>
                    {asset.image_url ? (
                        <Image source={{ uri: asset.image_url }} style={styles.image} resizeMode="contain" />
                    ) : (
                        <Asset3DView assetType={asset.type} iconSize={120} />
                    )}

                    {/* Badge de Variação com Glow - Reposicionado para não sobrepor imagem se for grande */}
                    <View style={[styles.variationBadge, { shadowColor: '#10B981' }]}>
                        <Ionicons name="trending-up" size={10} color="#10B981" />
                        <Text style={styles.variationText}>+2.5%</Text>
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={styles.assetName} numberOfLines={1}>
                        {asset.name.toUpperCase()}
                    </Text>
                    <Text style={styles.assetValue}>
                        {formatCurrency(asset.current_value)}
                    </Text>

                    {isVehicle && <FuelBar asset={asset} theme={theme} />}
                </View>
            </TouchableOpacity>

            {/* Reflexo no Chão */}
            <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'transparent']}
                style={styles.reflection}
            />
        </Animated.View>
    );
};

export const AssetShowcase = ({ assets, onViewDetails }: AssetShowcaseProps) => {
    const { theme } = useTheme();

    return (
        <View style={styles.grid}>
            {assets.map((asset: Asset) => (
                <AssetGridCard
                    key={asset.id}
                    asset={asset}
                    onViewDetails={onViewDetails}
                    theme={theme}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between', // Garante distribuição uniforme
        paddingBottom: 40,
    },
    cardContainer: {
        width: '48%', // Fixo para 2 colunas
        marginBottom: 24,
        minWidth: 150, // Garante tamanho mínimo em telas muito pequenas
    },
    touchable: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderTopWidth: 2,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
        overflow: 'hidden',
        padding: 16,
        height: 320, // Altura FIXA para uniformidade
        justifyContent: 'space-between', // Distribui conteúdo verticalmente
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 5,
            },
            web: {
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
            }
        })
    },
    spotLight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    imageWrapper: {
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    variationBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
    variationText: {
        color: '#10B981',
        fontSize: 10,
        fontFamily: 'SpaceGrotesk-Bold',
    },
    content: {
        marginTop: 8,
        flex: 1,
        justifyContent: 'flex-start'
    },
    assetName: {
        fontSize: 13,
        fontFamily: 'SpaceGrotesk-Medium',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginBottom: 4,
    },
    assetValue: {
        fontSize: 22, // Levemente menor para garantir que caiba
        fontFamily: 'SpaceGrotesk-Light',
        color: '#FFFFFF',
    },
    fuelTrack: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    fuelFill: {
        height: '100%',
        borderRadius: 2,
    },
    reflection: {
        height: 30,
        width: '80%',
        alignSelf: 'center',
        marginTop: 8,
        borderRadius: 20,
        transform: [{ scaleY: -1 }],
        opacity: 0.2,
    },
});
