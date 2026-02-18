import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useFocusEffect } from 'expo-router';

export type DashboardData = {
    disponivel: number;
    investido: number;
    entradasMes: number;
    saidasMes: number;
    loading: boolean;
};

export const useTransactions = () => {
    const { user } = useAuth();
    const [data, setData] = useState<DashboardData>({
        disponivel: 0,
        investido: 0,
        entradasMes: 0,
        saidasMes: 0,
        loading: true,
    });

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;

        try {
            const today = new Date();
            const startMonth = startOfMonth(today).toISOString();
            const endMonth = endOfMonth(today).toISOString();

            // 1. Buscar todas as transações para calcular saldo total
            // (Em produção, idealmente teríamos uma tabela de 'balances' ou 'accounts', 
            // mas para este MVP calcularemos sob demanda)
            const { data: allTransactions, error: allError } = await supabase
                .from('transactions')
                .select('type, amount, category')
                .eq('user_id', user.id);

            if (allError) throw allError;

            // 2. Calcular métricas
            let totalIncome = 0;
            let totalExpense = 0;
            let monthIncome = 0;
            let monthExpense = 0;
            let totalInvested = 0;

            allTransactions?.forEach(t => {
                const amount = Number(t.amount);
                const isThisMonth = true; // Simplificação: O Supabase retorna datas ISO, precisaríamos filtrar por data. 
                // Para performance, o ideal seria duas queries, mas faremos filtro no JS por enquanto ou query específica.
                // Ajustando query acima para pegar tudo é OK para MVP de poucos dados.

                // Mas espere, precisamos saber a data da transação para 'entradasMes'.
                // Vamos refazer a query para trazer a data.
            });

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }, [user]);

    // Refazendo a lógica para ser mais robusta
    const refreshData = async () => {
        if (!user) return;
        // Não setar loading=true aqui para evitar "piscar" a tela toda vez que volta
        // setData(prev => ({ ...prev, loading: true })); 

        try {
            const today = new Date();
            const firstDay = startOfMonth(today).toISOString();
            const lastDay = endOfMonth(today).toISOString();

            // Query 1: Balanço Total (Todas as transações)
            const { data: allData, error: errorAll } = await supabase
                .from('transactions')
                .select('type, amount, category, date, created_at')
                .eq('user_id', user.id);

            if (errorAll) throw errorAll;

            let saldo = 0;
            let investido = 0;
            let entradas = 0;
            let saidas = 0;

            allData?.forEach(item => {
                const val = Number(item.amount);
                const itemDate = new Date(item.date || item.created_at); // Fallback para created_at se date for null
                const isCurrentMonth = itemDate >= new Date(firstDay) && itemDate <= new Date(lastDay);

                if (item.type === 'income') {
                    saldo += val;
                    if (isCurrentMonth) entradas += val;
                } else {
                    saldo -= val;
                    if (isCurrentMonth) saidas += val;
                }

                if (item.category === 'investimentos' || item.category === 'aporte') {
                    investido += val;
                    // Se for investimento, tecnicamente saiu da conta corrente, mas virou ativo.
                    // Para o "saldo disponível", consideramos que saiu?
                    // Geralmente: Disponível = Caixa. Investido = Outro bolso.
                    // Então Despesa de investimento reduz disponível e aumenta investido.
                }
            });

            setData({
                disponivel: saldo,
                investido: investido, // Exemplo simples
                entradasMes: entradas,
                saidasMes: saidas,
                loading: false
            });

        } catch (e) {
            console.error(e);
            setData(prev => ({ ...prev, loading: false }));
        }
    };

    // Garantir atualização ao focar na tela
    useFocusEffect(
        useCallback(() => {
            refreshData();
        }, [user])
    );

    // Manter Realtime como backup/sync secundário
    useEffect(() => {
        refreshData();

        const subscription = supabase
            .channel('transactions_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuta INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'transactions',
                    filter: `user_id=eq.${user?.id}`, // Filtra apenas dados do usuário (se RLS permitir)
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    refreshData();
                }
            )
            .subscribe();

        // Cleanup
        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    return { ...data, refreshData };
};
