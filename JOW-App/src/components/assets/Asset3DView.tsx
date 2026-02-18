import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Mapeamento de vídeos para os tipos do banco de dados
const ASSET_ANIMATIONS: Record<string, any> = {
    'veiculo_carro': require('../../../assets/animations/delorean.mp4'),
    'veiculo_moto': require('../../../assets/animations/moto.mp4'),
    'imovel_residencial': require('../../../assets/animations/casa.mp4'),
    'imovel_comercial': require('../../../assets/animations/casa.mp4'),
};

import { Asset } from 'expo-asset';

interface Asset3DViewProps {
    assetType: string;
    iconSize?: number;
}

export const Asset3DView: React.FC<Asset3DViewProps> = React.memo(({ assetType, iconSize = 80 }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const videoSource = ASSET_ANIMATIONS[assetType];
    const webVideoUri = React.useMemo(() => {
        if (Platform.OS === 'web' && videoSource) {
            try {
                return Asset.fromModule(videoSource).uri;
            } catch (err) {
                console.error('Erro ao resolver Asset URI:', err);
                return undefined;
            }
        }
        return undefined;
    }, [videoSource]);

    const videoDimensions = React.useMemo(() => ({
        width: iconSize * 1.5,
        height: iconSize * 1.3,
    }), [iconSize]);

    const fallbackSize = React.useMemo(() => ({
        width: iconSize,
        height: iconSize,
    }), [iconSize]);

    const getIconForType = (type: string): any => {
        switch (type) {
            case 'veiculo_carro': return 'car-sport';
            case 'veiculo_moto': return 'bicycle';
            case 'imovel_residencial': return 'home';
            case 'imovel_comercial': return 'business';
            case 'eletro_eletronico': return 'laptop-outline';
            case 'joia': return 'diamond';
            case 'obra_arte': return 'color-palette';
            case 'colecionavel': return 'cube';
            default: return 'wallet';
        }
    };

    const combinedWebVideoStyle = React.useMemo(() => ({
        ...styles.webVideo,
        ...videoDimensions,
    }), [videoDimensions]);

    if (!videoSource || hasError) {
        return (
            <View style={[styles.fallbackContainer, fallbackSize]}>
                <Ionicons
                    name={getIconForType(assetType)}
                    size={iconSize * 0.6}
                    color="rgba(255,255,255,0.4)"
                />
            </View>
        );
    }

    return (
        <View style={styles.videoContainer}>
            {isLoading && (
                <ActivityIndicator
                    size="small"
                    color="rgba(255,255,255,0.3)"
                    style={styles.loader}
                />
            )}

            {Platform.OS === 'web' ? (
                <View style={styles.webContainer}>
                    <video
                        src={webVideoUri}
                        style={combinedWebVideoStyle as any}
                        autoPlay
                        loop
                        muted
                        playsInline
                        onLoadedData={() => setIsLoading(false)}
                        onError={(e) => {
                            console.error('Erro ao carregar vídeo Web (onError):', e);
                            setHasError(true);
                        }}
                    />
                </View>
            ) : (
                <Video
                    source={videoSource}
                    style={[styles.video, videoDimensions]}
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay
                    isMuted={true}
                    useNativeControls={false}
                    onLoad={() => setIsLoading(false)}
                    onError={(e) => {
                        console.error('Erro ao carregar vídeo Mobile:', e);
                        setHasError(true);
                        setIsLoading(false);
                    }}
                />
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    videoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    video: {
        backgroundColor: 'transparent',
    },
    loader: {
        position: 'absolute',
        zIndex: 1,
    },
    fallbackContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    webContainer: {
        backgroundColor: 'transparent',
        borderRadius: 20,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    webVideo: {
        objectFit: 'contain',
        backgroundColor: 'transparent',
        opacity: 1,
    }
});
