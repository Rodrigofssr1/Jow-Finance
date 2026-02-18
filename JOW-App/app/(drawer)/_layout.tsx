/**
 * JOW - Drawer Layout
 * 
 * Configuração do Drawer Navigator com Expo Router.
 */

import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useTheme } from '../../src/contexts/ThemeContext';
import { CustomDrawerContent } from '../../src/navigation/CustomDrawerContent';

export default function DrawerLayout() {
    const { theme } = useTheme();

    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: theme.colors.background,
                },
                headerTintColor: theme.colors.text,
                headerTitleStyle: {
                    fontFamily: 'SpaceGrotesk-Bold',
                    fontSize: 20,
                },
                drawerStyle: {
                    backgroundColor: theme.colors.drawerBackground,
                    width: 280,
                },
            }}
        >
            <Drawer.Screen
                name="index"
                options={{
                    drawerItemStyle: { display: 'none' },
                    headerShown: false,
                }}
            />
            {/* Chat route removed from Drawer to enforce Modal usage */}
            <Drawer.Screen
                name="cash-flow"
                options={{
                    title: 'Fluxo de Caixa',
                    headerTitle: 'Relatório Executivo',
                    drawerLabel: 'Fluxo de Caixa',
                }}
            />
            <Drawer.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    headerTitle: 'JOW',
                }}
            />
            <Drawer.Screen
                name="debts"
                options={{
                    title: 'Gestão de Dívidas',
                    headerTitle: 'Minhas Dívidas',
                }}
            />
            <Drawer.Screen
                name="my-assets"
                options={{
                    title: 'Meus Bens',
                    headerTitle: 'Meus Bens',
                    drawerLabel: 'Meus Bens',
                }}
            />
            <Drawer.Screen
                name="diary"
                options={{
                    title: 'Diário Financeiro',
                    headerTitle: 'Diário & Relatórios',
                }}
            />
            <Drawer.Screen
                name="settings"
                options={{
                    title: 'Configurações',
                }}
            />
        </Drawer>
    );
}
