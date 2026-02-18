import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface ChatFABProps {
    onPress: () => void;
}

export const ChatFAB = ({ onPress }: ChatFABProps) => {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        zIndex: 9999, // Ensure it's on top
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});
