/**
 * JOW - CustomDrawerContent
 * 
 * Componente customizado do Drawer com 8 itens de menu.
 * Dashboard e Configurações ativos, outros desabilitados (Fase 1).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { H3, Body, Caption } from '../components/Typography';
import { Avatar } from '../components/Avatar';
import { spacing, borderRadius } from '../theme';
import { useTransactionModal } from '../context/TransactionModalContext';

interface DrawerItem {
    name: string;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
    enabled: boolean;
}

const drawerItems: DrawerItem[] = [
    { name: 'Dashboard', route: '/dashboard', icon: 'home', enabled: true },
    { name: 'Fluxo de Caixa', route: '/cash-flow', icon: 'stats-chart', enabled: true },
    { name: 'Investimentos', route: '/investments', icon: 'pie-chart', enabled: false },
    { name: 'Planejamento', route: '/planning', icon: 'calendar', enabled: false },
    { name: 'Gestão de Dívidas', route: '/debts', icon: 'card', enabled: true },
    { name: 'Patrimônio', route: '/my-assets', icon: 'wallet', enabled: true },
    { name: 'Diário & Relatórios', route: '/diary', icon: 'document-text', enabled: true },
    { name: 'Configurações', route: '/settings', icon: 'settings', enabled: true },
];

export function CustomDrawerContent(props: DrawerContentComponentProps) {
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { openModal } = useTransactionModal();

    const handleItemPress = (item: DrawerItem) => {
        if (!item.enabled) return;
        router.push(item.route as any);
    };

    const isActive = (route: string) => pathname === route;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.drawerBackground }]}>
            {/* Header do Drawer */}
            <View style={styles.header}>
                <Avatar size={56} />
                <View style={styles.headerText}>
                    <H3>JOW</H3>
                    <Caption>Just Organize Wealth</Caption>
                </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

            {/* Menu Items */}
            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                {drawerItems.map((item) => {
                    const active = isActive(item.route);
                    const disabled = !item.enabled;

                    return (
                        <TouchableOpacity
                            key={item.route}
                            onPress={() => handleItemPress(item)}
                            disabled={disabled}
                            activeOpacity={0.7}
                            style={[
                                styles.menuItem,
                                {
                                    backgroundColor: active
                                        ? theme.colors.drawerActiveItem
                                        : theme.colors.drawerInactiveItem,
                                    opacity: disabled ? 0.4 : 1,
                                },
                            ]}
                        >
                            <Ionicons
                                name={active ? item.icon : `${item.icon}-outline` as any}
                                size={24}
                                color={active ? theme.colors.primary : theme.colors.textSecondary}
                                style={styles.menuIcon}
                            />
                            <Body
                                color={active ? theme.colors.primary : theme.colors.text}
                                style={active ? styles.menuTextActive : undefined}
                            >
                                {item.name}
                            </Body>
                            {disabled && (
                                <Ionicons
                                    name="lock-closed"
                                    size={14}
                                    color={theme.colors.textTertiary}
                                    style={styles.lockIcon}
                                />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <Caption>Fase 1 - Setup & Tema</Caption>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: spacing[12],
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing[5],
        paddingBottom: spacing[5],
    },
    headerText: {
        marginLeft: spacing[4],
    },
    divider: {
        height: 1,
        marginHorizontal: spacing[5],
        marginBottom: spacing[3],
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: spacing[3],
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[4],
        borderRadius: borderRadius.lg,
        marginBottom: spacing[1],
    },
    menuIcon: {
        marginRight: spacing[3],
    },
    menuTextActive: {
        fontWeight: '600',
    },
    lockIcon: {
        marginLeft: 'auto',
    },
    footer: {
        padding: spacing[5],
        alignItems: 'center',
    },
});
