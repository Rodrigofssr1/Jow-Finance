import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useJowMentor } from '../context/JowMentorContext';

export function useTransactionsQuery() {
    const { user } = useAuth();
    const { analyzeAction } = useJowMentor();
    const queryClient = useQueryClient();
    const QUERY_KEY = ['transactions', user?.id];

    // Fetch all transactions (optimized for recent months if needed, but for now fetching all for correct calc)
    // Or fetch summary stats directly using RPC if available, but raw query allows flexible filtering.
    const { data: transactions, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const addTransaction = useMutation({
        mutationFn: async (newTransaction: any) => {
            if (!user) throw new Error('User not authenticated');
            const { data, error } = await supabase
                .from('transactions')
                .insert([{ ...newTransaction, user_id: user.id }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Transactions update account balances
            queryClient.invalidateQueries({ queryKey: ['patrimony'] });
            // Trigger Jow Mentor Analysis
            analyzeAction('transaction', variables);
        },
    });

    return { transactions, isLoading, error, addTransaction };
}
