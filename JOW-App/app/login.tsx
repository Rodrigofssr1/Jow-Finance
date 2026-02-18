import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();
    const { theme, isDarkMode } = useTheme();
    const colors = theme.colors;

    const handleLogin = async () => {
        if (!email || !password) {
            if (Platform.OS === 'web') {
                window.alert('Por favor, preencha todos os campos.');
            } else {
                Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            }
            return;
        }

        setLoading(true);
        const { error } = await signIn(email, password);
        setLoading(false);

        if (error) {
            console.error('Erro no login:', error); // DEBUG LOG

            const isInvalidCreds = error.message === 'Invalid login credentials' || error.message.includes('Invalid login credentials');
            const message = isInvalidCreds ? 'Email ou senha incorretos.' : error.message;

            if (Platform.OS === 'web') {
                window.alert(message);
            } else {
                if (isInvalidCreds) {
                    Alert.alert('Erro', message, [
                        { text: 'Tentar novamente' }
                    ]);
                } else {
                    Alert.alert('Erro no Login', message);
                }
            }
            setPassword(''); // Clear password on error
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Bem-vindo de volta</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Entre para acessar suas finanças
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="seu@email.com"
                                placeholderTextColor={colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Senha</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Sua senha"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Entrar</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                            Não tem uma conta?
                        </Text>
                        <Link href="/register" asChild>
                            <TouchableOpacity>
                                <Text style={[styles.link, { color: colors.primary }]}>Criar conta</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontFamily: 'SpaceGrotesk-Bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
    },
    button: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Inter-Bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        marginTop: 16,
    },
    footerText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
    },
    link: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
    },
});
