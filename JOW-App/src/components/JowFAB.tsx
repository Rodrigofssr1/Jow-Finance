import React, { useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withDelay
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface JowFABProps {
    onPress?: () => void;
}

export const JowFAB = ({ onPress }: JowFABProps) => {
    const router = useRouter();
    const { theme } = useTheme();

    // Animações
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);

    useEffect(() => {
        // Entrada triunfal do Jow
        scale.value = withSpring(1, { damping: 12 });

        // Leve balanço para chamar atenção após 2 segundos
        const interval = setInterval(() => {
            rotation.value = withSequence(
                withTiming(10, { duration: 100 }),
                withTiming(-10, { duration: 100 }),
                withTiming(0, { duration: 100 })
            );
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { rotate: `${rotation.value}deg` }
            ]
        };
    });

    const handlePress = () => {
        // Feedback tátil visual
        scale.value = withSequence(
            withTiming(0.8, { duration: 100 }),
            withTiming(1, { duration: 100 })
        );

        // Ação customizada ou Navegar (Legacy fallback)
        setTimeout(() => {
            if (onPress) {
                onPress();
            } else {
                router.push('/chat');
            }
        }, 150);
    };

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                style={[styles.button, { shadowColor: theme.colors.primary }]}
            >
                <Image
                    source={require('../../assets/Jow.png')}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={[styles.border, { borderColor: '#FFFFFF' }]} />
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        zIndex: 9999,
    },
    button: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        backgroundColor: '#fff', // Fallback
    },
    image: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    border: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
    },
});
