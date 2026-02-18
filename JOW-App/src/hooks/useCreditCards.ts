import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useCreditCards() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const QUERY_KEY = ['credit_cards', user?.id];

    const { data: cards, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('credit_cards')
                .select('*') // Select all fields including new 'color'
                .eq('user_id', user.id)
                .order('name'); // Order by name for consistency

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Calculate total bill from all cards
    const totalBill = (cards || []).reduce((acc, curr) => acc + (Number(curr.current_bill) || 0), 0);

    const addCreditCard = useMutation({
        mutationFn: async (newCard: any) => {
            if (!user) throw new Error('User not authenticated');
            const { data, error } = await supabase
                .from('credit_cards')
                .insert([{ ...newCard, last_four_digits: newCard.last_four_digits || '0000', user_id: user.id }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
            queryClient.invalidateQueries({ queryKey: ['patrimony'] });
        },
    });

    const updateCreditCard = useMutation({
        mutationFn: async ({ id, ...updates }: any) => {
            if (!user) throw new Error('User not authenticated');
            const { data, error } = await supabase
                .from('credit_cards')
                .update({ ...updates, last_four_digits: updates.last_four_digits })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
            queryClient.invalidateQueries({ queryKey: ['patrimony'] });
        },
    });

    const deleteCreditCard = useMutation({
        mutationFn: async (id: string) => {
            if (!user) throw new Error('User not authenticated');

            // 🔥 DELETAR EM CASCATA (ordem crítica!)
            console.log('🗑️ [DELETE] Iniciando exclusão do cartão:', id);

            // 1. Buscar todas as transações deste cartão
            const { data: transactions } = await supabase
                .from('credit_card_transactions')
                .select('id')
                .eq('credit_card_id', id);

            // 2. Deletar parcelas vinculadas às transações
            if (transactions && transactions.length > 0) {
                const txIds = transactions.map(t => t.id);
                const { error: instError } = await supabase
                    .from('installments')
                    .delete()
                    .in('credit_card_transaction_id', txIds);
                if (instError) {
                    console.error('❌ Erro ao deletar parcelas:', instError);
                    throw instError;
                }
                console.log('✅ Parcelas deletadas');
            }

            // 3. Deletar transações do cartão
            const { error: txError } = await supabase
                .from('credit_card_transactions')
                .delete()
                .eq('credit_card_id', id);
            if (txError) {
                console.error('❌ Erro ao deletar transações:', txError);
                throw txError;
            }
            console.log('✅ Transações deletadas');

            // 4. Deletar faturas do cartão
            const { error: invError } = await supabase
                .from('credit_card_invoices')
                .delete()
                .eq('card_id', id);
            if (invError) {
                console.error('❌ Erro ao deletar faturas:', invError);
                throw invError;
            }
            console.log('✅ Faturas deletadas');

            // 5. Finalmente, deletar o cartão
            const { error: cardError } = await supabase
                .from('credit_cards')
                .delete()
                .eq('id', id);
            if (cardError) {
                console.error('❌ Erro ao deletar cartão:', cardError);
                throw cardError;
            }
            console.log('✅ Cartão deletado com sucesso!');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
            queryClient.invalidateQueries({ queryKey: ['patrimony'] });
        },
    });

    return { cards: cards || [], totalBill, isLoading, error, addCreditCard, updateCreditCard, deleteCreditCard };
}
