/**
 * JOW - Root Layout
 * 
 * Layout principal que carrega fontes e envolve o app com ThemeProvider.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold
} from '@expo-google-fonts/space-grotesk';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold
} from '@expo-google-fonts/inter';
import {
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold
} from '@expo-google-fonts/jetbrains-mono';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Image } from 'react-native';

import { useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ChatModal } from '../src/components/chat/ChatModal';
import { useState } from 'react';

// Impedir que a splash screen suma automaticamente
SplashScreen.preventAutoHideAsync();

import { Platform } from 'react-native';

// GLOBAL WEB STYLES FOR DARK MODE INPUTS
if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
    select, input, textarea {
      background-color: #1e293b !important; /* slate-800 */
      color: white !important;
      border-radius: 8px; /* rounded-lg */
    }
    input, textarea {
       border: none !important; /* Avoid double borders with RN styles */
    }
    select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 1rem center;
      background-size: 1.5em 1.5em;
      padding-right: 2.5rem !important;
      border: none !important; /* Avoid double borders */
    }
    select option {
      background-color: #1e293b !important;
      color: white !important;
    }
    /* Placeholder override */
    ::placeholder {
      color: #94a3b8 !important; /* slate-400 */
      opacity: 1;
    }
    `;
    document.head.appendChild(style);
}

function RootLayoutContent() {
    const { theme, isDarkMode, isLoading: themeLoading } = useTheme();
    const { session, loading: authLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const [isChatVisible, setIsChatVisible] = useState(false);

    const [fontsLoaded] = useFonts({
        SpaceGrotesk: SpaceGrotesk_400Regular,
        'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
        'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
        'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
        Inter: Inter_400Regular,
        'Inter-Medium': Inter_500Medium,
        'Inter-SemiBold': Inter_600SemiBold,
        'Inter-Bold': Inter_700Bold,
        JetBrainsMono: JetBrainsMono_400Regular,
        'JetBrainsMono-Medium': JetBrainsMono_500Medium,
        'JetBrainsMono-SemiBold': JetBrainsMono_600SemiBold,
    });

    useEffect(() => {
        if (fontsLoaded && !themeLoading && !authLoading) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, themeLoading, authLoading]);

    useEffect(() => {
        if (authLoading) return;

        const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

        if (!session && !inAuthGroup) {
            router.replace('/login');
        } else if (session && inAuthGroup) {
            router.replace('/(drawer)/dashboard');
        }
    }, [session, authLoading, segments]);

    // Mostrar loading enquanto fontes, tema e auth carregam
    if (!fontsLoaded || themeLoading || authLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    // Determine visibility of Jow FAB
    const currentRoute = (segments || []).join('/');
    const segmentList = (segments || []) as string[];

    // Explicitly hide FAB if:
    // 1. On Login/Register screens
    // 2. On Chat screen (route explicitly /chat)
    // 3. User is not authenticated
    // 4. Chat Modal is currently OPEN (prevent overlay loop)
    const isAuthScreen = segmentList.includes('login') || segmentList.includes('register');
    const isChatRoute = currentRoute.includes('chat');

    const hideFab = isAuthScreen || isChatRoute || !session || isChatVisible;

    const handleJowPress = () => {
        setIsChatVisible(true);
    };

    return (
        <>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <View style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
                    <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="register" options={{ headerShown: false }} />
                </Stack>

                {!hideFab && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={handleJowPress}
                        activeOpacity={0.8}
                    >
                        <Image
                            source={require('../assets/Jow.png')}
                            style={styles.fabImage}
                        />
                    </TouchableOpacity>
                )}

                <ChatModal
                    visible={isChatVisible}
                    onClose={() => setIsChatVisible(false)}
                />
            </View>
        </>
    );
}

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 0,
            refetchOnWindowFocus: true,
        },
    },
});

import { JowMentorProvider } from '../src/context/JowMentorContext';

import { TransactionModalProvider, useTransactionModal } from '../src/context/TransactionModalContext';
import { AddTransactionModal } from '../src/components/transactions/AddTransactionModal';

const GlobalTransactionModal = () => {
    const { isVisible, initialData, closeModal } = useTransactionModal();
    const queryClient = useQueryClient();

    return (
        <AddTransactionModal
            visible={isVisible}
            onClose={closeModal}
            initialData={initialData}
            onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
                queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
            }}
        />
    );
};

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={styles.container}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <AuthProvider>
                        <JowMentorProvider>
                            <TransactionModalProvider>
                                <RootLayoutContent />
                                <GlobalTransactionModal />
                            </TransactionModalProvider>
                        </JowMentorProvider>
                    </AuthProvider>
                </ThemeProvider>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6366F1', // Indigo 500
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 999
    },
    fabImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
    }
});
