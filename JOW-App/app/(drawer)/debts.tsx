import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { CreditCardsTab } from '../../src/components/debts/CreditCardsTab';
import { LoansTab } from '../../src/components/debts/LoansTab';
import { SubscriptionsTab } from '../../src/components/debts/SubscriptionsTab';
import { InsurancesTab } from '../../src/components/debts/InsurancesTab';

// Modal Imports
import { AddCreditCardModal } from '../../src/components/debts/AddCreditCardModal';
import { AddLoanModal } from '../../src/components/debts/AddLoanModal';
import { AddSubscriptionModal } from '../../src/components/debts/AddSubscriptionModal';
import { AddInsuranceModal } from '../../src/components/debts/AddInsuranceModal';
import { AddTransactionModal } from '../../src/components/transactions/AddTransactionModal';

export default function DebtsScreen() {
    const { theme } = useTheme();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingItem, setEditingItem] = useState<any>(null); // New state for editing
    const [transactionModalVisible, setTransactionModalVisible] = useState(false);
    const [preSelectedCardId, setPreSelectedCardId] = useState<string | undefined>(undefined);

    const params = useLocalSearchParams();

    // Effect to handle deep linking
    useFocusEffect(
        useCallback(() => {
            if (params.tab) {
                const tabMap: { [key: string]: number } = {
                    'cards': 0,
                    'loans': 1,
                    'subscriptions': 2,
                    'insurances': 3
                };
                if (tabMap[params.tab as string] !== undefined) {
                    setActiveTab(tabMap[params.tab as string]);
                }
            }
            if (params.openModal === 'true') {
                setModalVisible(true);
            }
        }, [params])
    );

    const tabs = [
        { id: 0, label: 'Cartões', icon: 'card-outline' },
        { id: 1, label: 'Empréstimos', icon: 'cash-outline' },
        { id: 2, label: 'Assinaturas', icon: 'calendar-outline' },
        { id: 3, label: 'Seguros', icon: 'shield-checkmark-outline' },
    ];

    const handleSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
        setModalVisible(false);
        setEditingItem(null); // Reset editing item
    };

    const handleClose = () => {
        setModalVisible(false);
        setEditingItem(null); // Reset on close
        router.setParams({ openModal: undefined, prefillExpense: undefined });
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setModalVisible(true);
    };

    const handleRegisterPurchase = (cardId: string) => {
        console.log("[DEBUG] Opening Transaction Modal from Cards Tab for card:", cardId);
        setPreSelectedCardId(cardId);
        setTransactionModalVisible(true);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 0: return <CreditCardsTab refreshTrigger={refreshTrigger} onEdit={handleEdit} onRegisterPurchase={handleRegisterPurchase} />;
            case 1: return <LoansTab refreshTrigger={refreshTrigger} onEdit={handleEdit} />;
            case 2: return <SubscriptionsTab refreshTrigger={refreshTrigger} onEdit={handleEdit} />;
            case 3: return <InsurancesTab refreshTrigger={refreshTrigger} onEdit={handleEdit} />;
            default: return null;
        }
    };

    const renderModal = () => {
        switch (activeTab) {
            case 0: return <AddCreditCardModal visible={modalVisible} onClose={handleClose} onSuccess={handleSuccess} initialData={editingItem} />;
            case 1: return <AddLoanModal visible={modalVisible} onClose={handleClose} onSuccess={handleSuccess} initialData={editingItem} />;
            case 2: return <AddSubscriptionModal visible={modalVisible} onClose={handleClose} onSuccess={handleSuccess} initialData={editingItem} />;
            case 3: return <AddInsuranceModal visible={modalVisible} onClose={handleClose} onSuccess={handleSuccess} initialData={editingItem} />;
            default: return null;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* Header Box */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                {/* Scrollable Tabs */}
                <View style={{ flex: 1, marginRight: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {tabs.map((tab) => (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 8,
                                    paddingHorizontal: 16,
                                    marginRight: 10,
                                    borderRadius: 20,
                                    backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.card,
                                    borderWidth: 1,
                                    borderColor: activeTab === tab.id ? theme.colors.primary : theme.colors.border,
                                }}
                            >
                                <Ionicons
                                    name={tab.icon as any}
                                    size={18}
                                    color={activeTab === tab.id ? '#FFF' : theme.colors.text}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={{
                                    color: activeTab === tab.id ? '#FFF' : theme.colors.text,
                                    fontFamily: 'SpaceGrotesk-Medium',
                                    fontSize: 14
                                }}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Fixed "Add" Button in Header */}
                <TouchableOpacity
                    onPress={() => {
                        setEditingItem(null); // Ensure clean state for adding
                        setModalVisible(true);
                    }}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.colors.primary,
                        justifyContent: 'center',
                        alignItems: 'center',
                        elevation: 3,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                    }}
                >
                    <Ionicons name="add" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={{ flex: 1 }}>
                {renderContent()}
            </View>

            {/* Modals are rendered here but controlled by visible prop */}
            {renderModal()}

            <AddTransactionModal
                visible={transactionModalVisible}
                onClose={() => {
                    setTransactionModalVisible(false);
                    setPreSelectedCardId(undefined); // Limpa o cardId ao fechar
                }}
                initialData={preSelectedCardId ? {
                    cardId: preSelectedCardId,
                    paymentMethod: 'credit'
                } : null}
                onSuccess={() => {
                    // Invalidar queries de invoices para forçar refresh do total da fatura
                    queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
                    queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
                    handleSuccess();
                    setPreSelectedCardId(undefined); // Limpa após salvar
                }}
            />
        </SafeAreaView>
    );
}
