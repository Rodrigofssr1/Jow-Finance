import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useInvestments() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const QUERY_KEY = ['investments', user?.id];

    const { data: investments, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!user) return [];
            try {
                const { data, error } = await supabase
                    .from('investments')
                    .select('amount, current_value')
                    .eq('user_id', user.id);

                if (error) {
                    // Silent fail if table doesn't exist yet to avoid crashes
                    console.log('Error fetching investments (table might be missing):', error.message);
                    return [];
                }
                return data || [];
            } catch (e) {
                return [];
            }
        },
        enabled: !!user,
    });

    const totalInvested = (investments || []).reduce((acc: number, curr: any) => {
        const val = Number(curr.current_value) || Number(curr.amount) || 0;
        return acc + val;
    }, 0);

    return { investments, totalInvested, isLoading, error };
}
