import { useQueryClient } from '@tanstack/react-query';
import { useAssets } from './useAssets';
import { useAccounts } from './useAccounts';
import { useLoans } from './useLoans';
import { useCreditCards } from './useCreditCards';
import { useInvestments } from './useInvestments';
import { useTransactionsQuery } from './useTransactionsQuery';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useDashboardData() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch all data using hooks
    const { data: assets, isLoading: loadingAssets } = useAssets();
    const { totalDebt: totalLoans, isLoading: loadingLoans } = useLoans();
    const { totalBill: totalCreditCards, isLoading: loadingCards } = useCreditCards();
    const { totalInvested: totalInvestments, isLoading: loadingInvestments } = useInvestments();

    // 2. Fetch Transactions & Calculate Monthly Flows
    const { transactions, isLoading: loadingTransactions } = useTransactionsQuery();

    // Calculate Monthly Flow
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const transactionsThisMonth = (transactions || []).filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const incomeMonth = transactionsThisMonth
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const expenseMonth = transactionsThisMonth
        .filter(t => t.type === 'expense' && !t.credit_card_id)
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Unpaid Expenses (All time liabilities)
    const totalUnpaidExpenses = (transactions || [])
        .filter(t => t.type === 'expense' && !t.paid)
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // 3. Calculate Available Cash
    // Available = All Income - All Expenses
    // Note: DB constraint only allows 'income' and 'expense' types.
    // Investment aportes/resgates are tracked in the investments table, not as transaction types.
    const totalAllTimeIncome = (transactions || [])
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const totalAllTimeExpense = (transactions || [])
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Available = Income - Expense (simple and correct with current DB schema)
    const totalCash = totalAllTimeIncome - totalAllTimeExpense;

    const totalAssetsValue = (assets || []).reduce((acc, curr) => acc + (Number(curr.current_value) || 0), 0);

    const totalBensDireitos = totalAssetsValue + totalCash + totalInvestments;
    const totalObrigacoes = totalUnpaidExpenses + totalLoans + totalCreditCards;

    const netWorth = totalBensDireitos - totalObrigacoes;

    // 4. Trend Calculation
    const monthResult = incomeMonth - expenseMonth;
    const previousNetWorth = netWorth - monthResult;
    const trend = previousNetWorth !== 0 ? (monthResult / Math.abs(previousNetWorth)) * 100 : 0;

    const isLoading = loadingAssets || loadingLoans || loadingCards || loadingInvestments || loadingTransactions;

    // 5. Realtime Listener
    useEffect(() => {
        if (!user) return;

        const channel = supabase.channel('global_dashboard_changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log('Change detected:', payload.table);
                if (payload.table === 'assets') queryClient.invalidateQueries({ queryKey: ['assets'] });
                if (payload.table === 'accounts') queryClient.invalidateQueries({ queryKey: ['accounts'] });
                if (payload.table === 'transactions') queryClient.invalidateQueries({ queryKey: ['transactions'] });
                if (payload.table === 'loans') queryClient.invalidateQueries({ queryKey: ['loans'] });
                if (payload.table === 'credit_cards') queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
                if (payload.table === 'investments') queryClient.invalidateQueries({ queryKey: ['investments'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);

    // Refetch all (Pull to Refresh)
    const refetchAll = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['assets'] }),
            queryClient.invalidateQueries({ queryKey: ['accounts'] }),
            queryClient.invalidateQueries({ queryKey: ['transactions'] }),
            queryClient.invalidateQueries({ queryKey: ['loans'] }),
            queryClient.invalidateQueries({ queryKey: ['credit_cards'] }),
            queryClient.invalidateQueries({ queryKey: ['investments'] })
        ]);
    };

    return {
        netWorth,
        totalAssets: totalAssetsValue,
        totalCash,
        totalInvestments,
        totalLoans,
        totalCreditCards,
        totalUnpaidExpenses,
        trend,
        incomeMonth,
        expenseMonth,
        isLoading,
        refetchAll
    };
}
