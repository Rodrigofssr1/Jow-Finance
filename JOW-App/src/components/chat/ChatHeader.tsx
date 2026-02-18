import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Body, Caption, H4 } from '../Typography';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { spacing } from '../../theme';

export const ChatHeader = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.divider }]}>
            <View style={styles.leftContent}>
                <TouchableOpacity
                    onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                    style={styles.menuButton}
                >
                    <Ionicons name="menu" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <View style={styles.avatarContainer}>
                    <Image
                        source={require('../../../assets/Jow.png')}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: theme.colors.primary
                        }}
                    />
                    <View style={styles.statusBatch} />
                </View>

                <View>
                    <H4 style={{ fontSize: 16, marginBottom: 0 }}>JOW</H4>
                    <Caption style={{ color: theme.colors.success }}>Online</Caption>
                </View>
            </View>

            <View style={styles.rightContent}>
                {/* Future actions: Clear chat, Settings */}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing[4],
        borderBottomWidth: 1,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3]
    },
    menuButton: {
        marginRight: spacing[2]
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBatch: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#34D399', // Emerald
        borderWidth: 2,
        borderColor: '#0F172A', // Should match background, but hardcoded for now or use theme
    },
    rightContent: {
        flexDirection: 'row',
    }
});
