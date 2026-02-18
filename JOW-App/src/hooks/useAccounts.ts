import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useAccounts() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const QUERY_KEY = ['accounts', user?.id];

    const { data: accounts, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Helper to calculate total cash balance
    const totalBalance = (accounts || []).reduce((acc, curr) => acc + (Number(curr.balance) || 0), 0);

    return { accounts, totalBalance, isLoading, error };
}
