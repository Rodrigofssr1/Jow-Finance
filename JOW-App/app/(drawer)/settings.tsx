/**
 * JOW - Configurações
 * 
 * Tela de configurações com toggle de tema e informações do app.
 */

import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Text, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { H4, Body, Caption, Label } from '../../src/components/Typography';
import { spacing, brandColors } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { resetAllUserData } from '../../src/lib/supabase';

// Versão do app
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

// Modal de Confirmação de Exclusão
const DeleteConfirmationModal = ({ visible, onClose, onConfirm, loading }: { visible: boolean; onClose: () => void; onConfirm: () => void; loading: boolean }) => {
    const [step, setStep] = useState(1);
    const [confirmText, setConfirmText] = useState('');
    const { theme } = useTheme();

    const handleReset = () => {
        setStep(1);
        setConfirmText('');
        onClose();
    };

    const isConfirmEnabled = confirmText === 'DELETAR';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleReset}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.error} />
                            <Body style={{ marginTop: 16 }}>Limpando dados...</Body>
                        </View>
                    ) : (
                        <>
                            {step === 1 ? (
                                <>
                                    <View style={styles.modalHeader}>
                                        <Ionicons name="warning" size={32} color={theme.colors.error} />
                                        <H4 style={{ marginTop: 8, color: theme.colors.error }}>Tem certeza?</H4>
                                    </View>
                                    <Body style={styles.modalText}>
                                        Você está prestes a apagar TODOS os seus dados financeiros (transações, contas, histórico). Esta ação é <Text style={{ fontWeight: 'bold' }}>irreversível</Text>.
                                    </Body>
                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.background }]} onPress={handleReset}>
                                            <Body>Cancelar</Body>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                                            onPress={() => setStep(2)}
                                        >
                                            <Body style={{ color: 'white' }}>Sim, limpar tudo</Body>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <View style={styles.modalHeader}>
                                        <Ionicons name="trash-bin" size={32} color={theme.colors.error} />
                                        <H4 style={{ marginTop: 8 }}>Confirmação Final</H4>
                                    </View>
                                    <Body style={styles.modalText}>
                                        Para confirmar, digite <Text style={{ fontWeight: 'bold' }}>DELETAR</Text> abaixo:
                                    </Body>
                                    <TextInput
                                        style={[styles.input, { borderColor: theme.colors.divider, color: theme.colors.text }]}
                                        placeholder="DELETAR"
                                        placeholderTextColor={theme.colors.textSecondary}
                                        value={confirmText}
                                        onChangeText={setConfirmText}
                                        autoCapitalize="characters"
                                    />
                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.background }]} onPress={handleReset}>
                                            <Body>Cancelar</Body>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, { backgroundColor: isConfirmEnabled ? theme.colors.error : theme.colors.textTertiary, opacity: isConfirmEnabled ? 1 : 0.7 }]}
                                            onPress={onConfirm}
                                            disabled={!isConfirmEnabled}
                                        >
                                            <Body style={{ color: isConfirmEnabled ? 'white' : theme.colors.text }}>Confirmar Exclusão</Body>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default function Settings() {
    const { theme, isDarkMode } = useTheme();
    const { signOut, user } = useAuth();
    const router = useRouter();
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirm = window.confirm("Tem certeza que deseja sair da conta?");
            if (confirm) {
                await signOut();
            }
        } else {
            Alert.alert(
                "Sair da conta",
                "Tem certeza que deseja sair?",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Sair",
                        style: "destructive",
                        onPress: async () => {
                            await signOut();
                        }
                    }
                ]
            );
        }
    };

    const handleDeleteAllData = async () => {
        if (!user?.id) return;

        setIsDeleting(true);
        try {
            const result = await resetAllUserData(user.id);
            setIsDeleting(false);

            if (result.success) {
                setIsDeleteModalVisible(false);
                Alert.alert("Sucesso", "✅ Dados limpos com sucesso!", [
                    {
                        text: "OK",
                        onPress: () => router.replace('/') // Redireciona para Dashboard (root)
                    }
                ]);
            } else {
                Alert.alert("Erro", "Falha ao limpar dados. Tente novamente.");
            }
        } catch (error) {
            setIsDeleting(false);
            Alert.alert("Erro", "Ocorreu um erro inesperado.");
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Seção Aparência */}
                <View style={styles.section}>
                    <Label style={styles.sectionTitle}>APARÊNCIA</Label>

                    <Card>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconContainer}>
                                    <Ionicons
                                        name={isDarkMode ? 'moon' : 'sunny'}
                                        size={22}
                                        color={theme.colors.primary}
                                    />
                                </View>
                                <View>
                                    <Body>Modo Escuro</Body>
                                    <Caption>
                                        {isDarkMode ? 'Ativado' : 'Desativado'}
                                    </Caption>
                                </View>
                            </View>
                            <ThemeToggle size="medium" />
                        </View>
                    </Card>
                </View>

                {/* Seção Sobre */}
                <View style={styles.section}>
                    <Label style={styles.sectionTitle}>SOBRE</Label>

                    <Card>
                        <View style={styles.aboutContent}>
                            {/* Nome do App */}
                            <View style={styles.aboutRow}>
                                <View style={styles.settingInfo}>
                                    <View style={[styles.iconContainer, { backgroundColor: brandColors.indigo + '20' }]}>
                                        <Ionicons
                                            name="wallet"
                                            size={22}
                                            color={brandColors.indigo}
                                        />
                                    </View>
                                    <View>
                                        <Body>JOW - Just Organize Wealth</Body>
                                        <Caption>Sua gestão financeira pessoal</Caption>
                                    </View>
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                            {/* Versão */}
                            <View style={styles.aboutRow}>
                                <View style={styles.settingInfo}>
                                    <View style={[styles.iconContainer, { backgroundColor: brandColors.emerald + '20' }]}>
                                        <Ionicons
                                            name="information-circle"
                                            size={22}
                                            color={brandColors.emerald}
                                        />
                                    </View>
                                    <View>
                                        <Body>Versão</Body>
                                        <Caption>{APP_VERSION} ({BUILD_NUMBER})</Caption>
                                    </View>
                                </View>
                            </View>

                            {/* Divider */}
                            <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />

                            {/* Fase */}
                            <View style={styles.aboutRow}>
                                <View style={styles.settingInfo}>
                                    <View style={[styles.iconContainer, { backgroundColor: brandColors.amber + '20' }]}>
                                        <Ionicons
                                            name="construct"
                                            size={22}
                                            color={brandColors.amber}
                                        />
                                    </View>
                                    <View>
                                        <Body>Fase de Desenvolvimento</Body>
                                        <Caption>Fase 3 - Autenticação</Caption>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </Card>

                </View>

                {/* ZONA DE PERIGO */}
                <View style={[styles.section, { marginTop: spacing[4] }]}>
                    <Label style={{ ...styles.sectionTitle, color: theme.colors.error }}>⚠️ ZONA DE PERIGO</Label>

                    <Card style={{ borderColor: theme.colors.error, borderWidth: 1, backgroundColor: theme.colors.error + '10' }}>
                        <TouchableOpacity
                            style={styles.dangerButton}
                            onPress={() => setIsDeleteModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: theme.colors.error + '20' }]}>
                                <Ionicons
                                    name="trash-outline"
                                    size={22}
                                    color={theme.colors.error}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Body style={{ color: theme.colors.error, fontWeight: 'bold' }}>Limpar todos os dados</Body>
                                <Caption style={{ marginTop: 2 }}>Apaga transações, cartões e histórico. Irreversível.</Caption>
                            </View>
                        </TouchableOpacity>
                    </Card>
                </View>

                <DeleteConfirmationModal
                    visible={isDeleteModalVisible}
                    onClose={() => setIsDeleteModalVisible(false)}
                    onConfirm={handleDeleteAllData}
                    loading={isDeleting}
                />

                {/* Botão de Logout */}
                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: theme.colors.surface }]}
                    onPress={handleLogout}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
                    <Text style={[styles.logoutText, { color: theme.colors.error }]}>Sair da conta</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <Caption style={styles.footerText}>
                        Desenvolvido com 💜 para organizar suas finanças
                    </Caption>
                </View>
            </ScrollView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing[5],
        paddingBottom: spacing[10],
    },
    section: {
        marginBottom: spacing[6],
    },
    sectionTitle: {
        marginBottom: spacing[3],
        marginLeft: spacing[1],
        letterSpacing: 1,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing[3],
    },
    aboutContent: {
        gap: 0,
    },
    aboutRow: {
        paddingVertical: spacing[2],
    },
    divider: {
        height: 1,
        marginVertical: spacing[2],
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[4],
        borderRadius: 12,
        marginBottom: spacing[6],
        gap: spacing[2],
    },
    logoutText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
    },
    footer: {
        alignItems: 'center',
        paddingTop: 0,
    },
    footerText: {
        textAlign: 'center',
    },

    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing[1],
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing[4],
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        padding: spacing[6],
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: spacing[4],
    },
    modalText: {
        textAlign: 'center',
        marginBottom: spacing[6],
        lineHeight: 22,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 8,
        padding: spacing[3],
        marginBottom: spacing[6],
        fontSize: 16,
        textAlign: 'center',
        fontFamily: 'Inter-Regular',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing[3],
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: spacing[3],
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        padding: spacing[4],
        alignItems: 'center',
    }
});
