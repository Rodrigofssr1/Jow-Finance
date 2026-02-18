import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { parseISO, compareDesc } from 'date-fns';

export type DiaryItemType = 'credit_card' | 'cash_flow' | 'loan' | 'subscription' | 'insurance' | 'investment' | 'installment';

export interface DiaryItem {
    id: string;
    type: DiaryItemType;
    label: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    status?: string;
    original_data: any;
}

export function useDiary() {
    const { user } = useAuth();

    // 1. Fetch from standard Transactions (cash_flow)
    const { data: transactions, isLoading: loadingTransactions } = useQuery({
        queryKey: ['diary_transactions', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user?.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // 2. Fetch from Installments (representa cada parcela de cartão individualmente)
    // NÃO buscamos credit_card_transactions separadamente para evitar duplicidade.
    // Cada compra já é representada pelas suas parcelas (1x = 1 parcela, 3x = 3 parcelas).
    const { data: installments, isLoading: loadingInstallments } = useQuery({
        queryKey: ['diary_installments', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('installments')
                .select('*, credit_card_transactions(description, category, installment_count, credit_card_id, credit_cards(name))')
                .eq('status', 'pending');
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // 4. Fetch from Loans
    const { data: loans, isLoading: loadingLoans } = useQuery({
        queryKey: ['diary_loans', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', user?.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // 5. Fetch from Subscriptions
    const { data: subscriptions, isLoading: loadingSubs } = useQuery({
        queryKey: ['diary_subs', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user?.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // 6. Fetch from Insurance
    const { data: insurances, isLoading: loadingInsurance } = useQuery({
        queryKey: ['diary_insurance', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('insurances')
                .select('*')
                .eq('user_id', user?.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    // 7. Fetch from Investments
    const { data: investments, isLoading: loadingInvestments } = useQuery({
        queryKey: ['diary_invest', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('investments')
                .select('*')
                .eq('user_id', user?.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!user
    });

    const isLoading = loadingTransactions || loadingInstallments || loadingLoans || loadingSubs || loadingInsurance || loadingInvestments;

    const diaryItems = useMemo(() => {
        if (isLoading) return [];

        const unified: DiaryItem[] = [];

        // Cash Flow
        (transactions || []).forEach(t => {
            const isInstallment = t.origin === 'credit_card_installment';
            unified.push({
                id: t.id,
                type: 'cash_flow',
                label: isInstallment ? 'Parcela Cartão' : t.type === 'income' ? 'Receita' : 'Despesa',
                description: t.description,
                amount: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
                date: t.date,
                category: t.category,
                status: t.paid ? 'Pago' : 'Pendente',
                original_data: t
            });
        });

        // Credit Card Installments (cada parcela = 1 entrada no diário)
        // Para compras à vista (1x), aparece "Parcela 1/1"
        // Para parceladas (3x), aparece "Parcela 1/3", "Parcela 2/3", "Parcela 3/3"
        (installments || []).forEach(i => {
            const parent = i.credit_card_transactions;
            const cardName = parent?.credit_cards?.name || '';
            const totalParcelas = parent?.installment_count || 1;
            unified.push({
                id: i.id,
                type: 'credit_card',
                label: totalParcelas > 1
                    ? `Parcela ${i.installment_number}/${totalParcelas}`
                    : 'Compra Cartão',
                description: `${parent?.description || 'Compra Cartão'}${cardName ? ` • ${cardName}` : ''}`,
                amount: -Math.abs(i.amount),
                date: i.due_date,
                category: parent?.category || 'Cartão',
                status: i.status === 'paid' ? 'Pago' : 'Pendente',
                original_data: i
            });
        });

        // Loans
        (loans || []).forEach(l => {
            unified.push({
                id: l.id,
                type: 'loan',
                label: 'Empréstimo',
                description: `Contratação: ${l.name}`,
                amount: Math.abs(l.original_amount),
                date: l.created_at,
                category: l.asset_type || 'Empréstimo',
                original_data: l
            });
            if (l.paid_installments < l.total_installments) {
                unified.push({
                    id: `${l.id}-next`,
                    type: 'loan',
                    label: `Parcela ${l.paid_installments + 1}/${l.total_installments}`,
                    description: `Pagamento: ${l.name}`,
                    amount: -Math.abs(l.monthly_payment),
                    date: l.next_due_date,
                    category: 'Dívidas',
                    status: 'Pendente',
                    original_data: l
                });
            }
        });

        // Subscriptions
        (subscriptions || []).forEach(s => {
            unified.push({
                id: s.id,
                type: 'subscription',
                label: 'Assinatura',
                description: s.name,
                amount: -Math.abs(s.amount),
                date: s.next_billing_date || s.created_at,
                category: s.category || 'Serviços',
                original_data: s
            });
        });

        // Insurance
        (insurances || []).forEach(i => {
            unified.push({
                id: i.id,
                type: 'insurance',
                label: 'Seguro',
                description: `${i.type.toUpperCase()} - ${i.insurer}`,
                amount: -Math.abs(i.premium_amount),
                date: i.due_date || i.created_at,
                category: 'Seguros',
                original_data: i
            });
        });

        // Investments
        (investments || []).forEach(inv => {
            unified.push({
                id: inv.id,
                type: 'investment',
                label: 'Investimento',
                description: inv.nome || inv.description || 'Investimento',
                amount: Math.abs(inv.current_value || inv.amount),
                date: inv.created_at,
                category: inv.categoria || 'Investimentos',
                original_data: inv
            });
        });

        return unified.sort((a, b) => compareDesc(parseISO(a.date), parseISO(b.date)));
    }, [isLoading, transactions, installments, loans, subscriptions, insurances, investments]);

    return { diaryItems, isLoading };
}
