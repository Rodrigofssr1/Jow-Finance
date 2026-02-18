import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as Speech from 'expo-speech';
import { GeminiService, AIResponseData } from '../services/ai/gemini';
import { TransactionInitialData } from '../components/transactions/AddTransactionModal';
import { useTransactionModal } from '../context/TransactionModalContext';

export type Message = {
    id: string;
    message: string;
    sender: 'user' | 'jow';
    created_at: string;
    metadata?: any;
};

export const useChat = () => {
    const { user } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Use global transaction modal context
    const { openModal } = useTransactionModal();

    // Helper to parse message content and metadata
    const parseMessage = (rawMessage: any): Message => {
        let text = rawMessage.message;
        let metadata = {};

        if (text && text.includes('|||')) {
            const parts = text.split('|||');
            text = parts[0].trim();
            try {
                metadata = JSON.parse(parts[1]);
            } catch (e) {
                console.error('Error parsing metadata:', e);
            }
        }

        return {
            id: rawMessage.id,
            message: text,
            sender: rawMessage.sender,
            created_at: rawMessage.created_at,
            metadata: metadata
        };
    };

    // Carregar mensagens do Supabase
    const fetchMessages = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (data) {
                setMessages(data.map(parseMessage));
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        }
    }, [user]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const speak = (text: string) => {
        Speech.stop();
        setIsSpeaking(true);
        Speech.speak(text, {
            language: 'pt-BR',
            rate: 1.0,
            pitch: 1.0,
            onDone: () => setIsSpeaking(false),
            onStopped: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false),
        });
    };

    const persistMessage = async (text: string, sender: 'user' | 'jow', metadata?: any) => {
        if (!user) return;

        const fullContent = metadata ? `${text} ||| ${JSON.stringify(metadata)}` : text;

        const tempMsg: Message = {
            id: Date.now().toString(),
            message: text,
            sender: sender,
            created_at: new Date().toISOString(),
            metadata: metadata
        };
        setMessages(prev => [tempMsg, ...prev]);

        try {
            await supabase.from('conversations').insert([{
                user_id: user.id,
                message: fullContent,
                sender: sender
            }]);
        } catch (e) {
            console.error('Erro persistencia msg:', e);
        }

        if (sender === 'jow') speak(text);
    };

    const handleAction = async (action: string, params: any) => {
        if (action === 'openAssetForm') {
            router.push({
                pathname: '/(drawer)/my-assets',
                params: {
                    openModal: 'true',
                    type: params.type,
                    prefillValue: params.value?.toString() || params.prefillFuel?.toString(),
                    prefillDescription: params.description
                }
            });
        } else if (action === 'openDebtForm') {
            router.push({
                pathname: '/(drawer)/debts',
                params: {
                    tab: params.type === 'financing' ? 'loans' : 'loans', // Assuming financing goes to loans tab for now
                    openModal: 'true',
                    prefillAmount: params.amount?.toString(),
                    prefillCreditor: params.creditor,
                    prefillType: params.type
                }
            });
        } else if (action === 'openCreditCardForm') {
            router.push({
                pathname: '/(drawer)/debts',
                params: {
                    tab: 'cards',
                    openModal: 'true',
                    prefillExpense: JSON.stringify(params.linkedExpense)
                }
            });
        } else if (action === 'registerIncome') {
            try {
                setLoading(true);
                const { error } = await supabase.from('transactions').insert([{
                    user_id: user?.id,
                    type: 'income',
                    amount: params.amount,
                    category: 'outros',
                    description: params.description || 'Entrada',
                    date: new Date().toISOString(),
                    paid: true
                }]);

                if (error) throw error;
                await queryClient.invalidateQueries({ queryKey: ['transactions'] });
                await persistMessage(`✅ Entrada de R$ ${params.amount} registrada!`, 'jow');
            } catch (e) {
                console.error(e);
                await persistMessage(`❌ Erro ao registrar entrada.`, 'jow');
            } finally {
                setLoading(false);
            }
        } else if (action === 'registerCardExpense') {
            try {
                setLoading(true);
                // Register expense linked to card (invoice)
                const { error } = await supabase.from('transactions').insert([{
                    user_id: user?.id,
                    type: 'expense',
                    amount: params.amount,
                    description: params.description,
                    category: params.category || 'outros',
                    date: new Date().toISOString(),
                    credit_card_id: params.cardId,
                    installments_count: params.installments,
                    paid: false // Credit card expenses are paid when bill is paid
                }]);

                if (error) throw error;
                await queryClient.invalidateQueries({ queryKey: ['transactions'] });
                await persistMessage(`✅ Compra lançada no cartão!`, 'jow');
            } catch (e) {
                console.error(e);
                await persistMessage(`❌ Erro ao lançar no cartão.`, 'jow');
            } finally {
                setLoading(false);
            }
        } else if (action === 'registerExpense') {
            // Register simple expense without asset
            try {
                setLoading(true);
                const { error } = await supabase.from('transactions').insert([{
                    user_id: user?.id,
                    type: 'expense',
                    amount: params.amount,
                    category: params.type === 'fuel' ? 'transporte' : (params.category || 'outros'),
                    description: params.type === 'fuel' ? 'Abastecimento' : (params.description || 'Despesa'),
                    date: new Date().toISOString(),
                    paid: true
                }]);

                if (error) throw error;

                await queryClient.invalidateQueries({ queryKey: ['transactions'] });
                await persistMessage(`✅ Despesa de R$ ${params.amount} registrada com sucesso!`, 'jow');
            } catch (e) {
                console.error(e);
                await persistMessage(`❌ Erro ao registrar despesa.`, 'jow');
            } finally {
                setLoading(false);
            }
        }
    };

    const sendMessage = async (text: string) => {
        if (!user || !text.trim()) return;

        setLoading(true);
        await persistMessage(text, 'user');

        try {
            const aiResponse = await GeminiService.processMessage(text);

            if (aiResponse) {
                const scanned = aiResponse.scanned || {};
                const intent = scanned.intent || aiResponse.automation?.type;
                const cleanAmount = scanned.amount || 0;

                // --- PRIORITY 1: DEBT CREATION (Empréstimo/Financiamento) ---
                if (intent === 'debt_creation' || intent === 'suggest_debt') {
                    const creditor = scanned.creditor || 'Banco';
                    const type = scanned.asset_type_reference === 'financing' ? 'financing' : 'loan';
                    const description = scanned.description || (type === 'financing' ? 'Financiamento' : 'Empréstimo');

                    const suggestions = [
                        {
                            label: `📉 Cadastrar Dívida`,
                            action: 'openDebtForm',
                            params: { amount: cleanAmount, creditor, type, description }
                        },
                        {
                            label: `⬆️ Registrar só Entrada (+)`,
                            action: 'registerIncome',
                            params: { amount: cleanAmount, description: `Entrada: ${description}` }
                        }
                    ];

                    await persistMessage(
                        `💰 Detectei que você pegou ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanAmount)}. Isso gera uma dívida. Quer cadastrar para controlar as parcelas?`,
                        'jow',
                        { suggestions }
                    );
                    return;
                }

                // --- PRIORITY 2: JEWELRY (Joias) ---
                if (intent === 'jewelry_acquisition' || intent === 'suggest_jewelry') {
                    const description = scanned.description || 'Joia';

                    const suggestions = [
                        {
                            label: `💎 Cadastrar Joia (Bem)`,
                            action: 'openAssetForm',
                            params: { type: 'Joia', value: cleanAmount, description }
                        },
                        {
                            label: `💸 Registrar só Despesa`,
                            action: 'registerExpense',
                            params: { amount: cleanAmount, category: 'personal', description }
                        }
                    ];

                    await persistMessage(
                        `✨ Que chique! Detectei a compra de ${description} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cleanAmount)}). Joias são patrimônio. Quer cadastrar em "Meus Bens"?`,
                        'jow',
                        { suggestions }
                    );
                    return;
                }

                // --- PRIORITY 3: ASSET EXPENSE CHECK (Vehicle/Real Estate) ---
                if (intent === 'expense' && scanned.asset_type_reference) {
                    const assetType = scanned.asset_type_reference;
                    const { data: assets } = await supabase.from('assets').select('id, type').eq('user_id', user.id);
                    const hasAsset = assets?.some(a =>
                        assetType === 'vehicle' ? ['veiculo', 'moto'].includes(a.type) :
                            assetType === 'real_estate' ? ['imovel', 'apartamento'].includes(a.type) : false
                    );

                    if (!hasAsset) {
                        const suggestedAssetType = assetType === 'vehicle' ? 'Carro' : 'Imóvel';
                        const suggestions = [
                            { label: `Cadastrar ${suggestedAssetType}`, action: 'openAssetForm', params: { type: suggestedAssetType } },
                            { label: `Só Despesa`, action: 'registerExpense', params: { amount: cleanAmount, category: scanned.category } }
                        ];
                        await persistMessage(`Não vi nenhum ${suggestedAssetType} no seu perfil. Quer cadastrar?`, 'jow', { suggestions });
                        return;
                    }
                }

                // --- PRIORITY 4: GENERAL TRANSACTION (Unified Flow) ---
                const isTransaction =
                    intent === 'register_transaction' ||
                    intent === 'credit_card_expense' ||
                    intent === 'transaction' ||
                    (intent === 'expense' && !scanned.asset_type_reference);

                if (isTransaction) {
                    const amount = scanned.amount ? String(scanned.amount) : '';
                    const description = scanned.description || '';
                    const installments = scanned.installments ? String(scanned.installments) : '1';
                    const category = scanned.category || 'outros';

                    // Infer payment method
                    const isCredit = parseInt(installments) > 1 || intent === 'credit_card_expense' || scanned.payment_method === 'credit';
                    const paymentMethod = isCredit ? 'credit' : 'cash';

                    openModal({
                        amount,
                        description,
                        category,
                        installments,
                        paymentMethod,
                        cardId: scanned.card_id
                    });

                    const confirmationMsg: Message = {
                        id: Date.now().toString(),
                        message: "Abri o formulário para você conferir.",
                        sender: 'jow',
                        created_at: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, confirmationMsg]);

                    if (!aiResponse.automation?.params?.no_speak) {
                        speak("Abri o formulário para você conferir.");
                    }
                    return;
                }

                // --- FALLBACK ---
                if (aiResponse.message) {
                    await persistMessage(aiResponse.message, 'jow');
                    if (!aiResponse.automation?.params?.no_speak) {
                        speak(aiResponse.message);
                    }
                } else {
                    await persistMessage("Entendi, mas não tenho certeza do que fazer.", 'jow');
                }

            } else {
                await persistMessage("Não consegui processar.", 'jow');
            }
        } catch (error: any) {
            console.error('Erro no fluxo de chat:', error);
            await persistMessage("Ops, tive um problema técnico.", 'jow');
        } finally {
            setLoading(false);
        }
    };

    return {
        messages,
        loading,
        isSpeaking,
        sendMessage,
        speak,
        handleAction
    };
};
