import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useSubscriptions() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const QUERY_KEY = ['subscriptions', user?.id];

    const { data: subscriptions, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const addSubscription = useMutation({
        mutationFn: async (newSub: any) => {
            if (!user) throw new Error('User not authenticated');
            const { data, error } = await supabase
                .from('subscriptions')
                .insert([{ ...newSub, user_id: user.id }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Subscriptions generate transactions?
            queryClient.invalidateQueries({ queryKey: ['patrimony'] });
        },
    });

    const updateSubscription = useMutation({
        mutationFn: async ({ id, ...updates }: any) => {
            if (!user) throw new Error('User not authenticated');
            const { data, error } = await supabase
                .from('subscriptions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['patrimony'] });
        },
    });

    return { subscriptions, isLoading, error, addSubscription, updateSubscription };
}
