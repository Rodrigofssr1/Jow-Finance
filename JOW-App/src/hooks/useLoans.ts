import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useJowMentor } from '../context/JowMentorContext';

export function useLoans() {
    const { user } = useAuth();
    const { analyzeAction } = useJowMentor();
    const queryClient = useQueryClient();
    const QUERY_KEY = ['loans', user?.id];

    const { data: loans, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('loans')
                .select('id, name, original_amount, total_installments, paid_installments, monthly_payment, interest_rate, amortization_system, asset_type, next_due_date, down_payment, asset_value')
                .eq('user_id', user.id);

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Calculate total remaining loan debt
    // For PRICE: remaining = (total - paid) * monthly_payment (approximation, since all payments are equal)
    // For SAC: remaining balance = PV - (paid_installments * amortization), where amortization = PV / n
    // A more precise method would track actual remaining_balance in DB, but for now this heuristic works.
    const totalDebt = (loans || []).reduce((acc, curr) => {
        const remaining = (curr.total_installments || 0) - (curr.paid_installments || 0);
        if (remaining <= 0) return acc;

        if (curr.amortization_system === 'SAC') {
            // SAC: remaining principal = original_amount - (paid * amortization)
            const amortization = (curr.original_amount || 0) / (curr.total_installments || 1);
            const remainingPrincipal = Math.max(0, (curr.original_amount || 0) - (curr.paid_installments || 0) * amortization);
            return acc + remainingPrincipal;
        }

        // PRICE: approximate remaining balance
        // More accurate: PV * ((1+i)^n - (1+i)^k) / ((1+i)^n - 1), but without guaranteed rate, use simple calc
        const rate = (curr.interest_rate || 0) / 100;
        if (rate > 0 && curr.original_amount) {
            const n = curr.total_installments || 1;
            const k = curr.paid_installments || 0;
            // Outstanding balance after k payments: PV * ((1+i)^n - (1+i)^k) / ((1+i)^n - 1)
            const factor1 = Math.pow(1 + rate, n);
            const factorK = Math.pow(1 + rate, k);
            const balance = curr.original_amount * (factor1 - factorK) / (factor1 - 1);
            return acc + Math.max(0, balance);
        }

        // Fallback: simple remaining * monthly_payment
        return acc + Math.max(0, remaining * (curr.monthly_payment || 0));
    }, 0);

    const addLoan = useMutation({
        mutationFn: async (newLoan: any) => {
            if (!user) throw new Error('User not authenticated');
            const { data, error } = await supabase
                .from('loans')
                .insert([{ ...newLoan, user_id: user.id }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['loans'] });
            queryClient.invalidateQueries({ queryKey: ['patrimony'] });
            // Trigger Jow Mentor Analysis
            analyzeAction('debt', variables);
        },
    });

    return { loans, totalDebt, isLoading, error, addLoan };
}
