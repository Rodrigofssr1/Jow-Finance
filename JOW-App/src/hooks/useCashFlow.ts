import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTransactionsQuery } from './useTransactionsQuery';
import { useSubscriptions } from './useSubscriptions';
import { useLoans } from './useLoans';
import { useCreditCards } from './useCreditCards';
import { startOfMonth, endOfMonth, isAfter, isBefore, isSameMonth, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

export interface CashFlowData {
    monthYear: string;
    saldoInicial: number;
    receitas: {
        items: Array<{ categoria: string; valor: number; projetado: number }>;
        total: number;
        totalProjetado: number;
    };
    despesas: {
        items: Array<{ categoria: string; valor: number; projetado: number }>;
        total: number;
        totalProjetado: number;
    };
    investimentos: {
        items: Array<{ categoria: string; valor: number; projetado: number }>;
        total: number;
        totalProjetado: number;
    };
    faturas: {
        items: Array<{ categoria: string; valor: number; projetado: number }>;
        total: number;
        totalProjetado: number;
    };
    saldoFinal: number;
    saldoFinalProjetado: number;
    variacao: number;
    isLoading: boolean;
}

export function useCashFlow(currentDate: Date): CashFlowData {
    const { transactions, isLoading: loadingTransactions } = useTransactionsQuery();
    const { subscriptions, isLoading: loadingSubs } = useSubscriptions();
    const { loans, isLoading: loadingLoans } = useLoans();
    const { cards, isLoading: loadingCards } = useCreditCards();

    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);
    const startISO = startOfCurrentMonth.toISOString();
    const endISO = endOfCurrentMonth.toISOString();

    const { data: installmentsProj, isLoading: loadingInst } = useQuery({
        queryKey: ['cash_flow_installments', startISO],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('installments')
                .select(`
                    id, amount, status, due_date,
                    credit_card_transactions (category)
                `)
                .gte('due_date', startISO)
                .lte('due_date', endISO)
                .neq('status', 'paid');

            if (error) throw error;
            return data;
        },
        enabled: !!currentDate
    });

    const isLoading = loadingTransactions || loadingSubs || loadingLoans || loadingCards || loadingInst;

    return useMemo(() => {
        if (isLoading) {
            return {
                monthYear: format(currentDate, 'MMMM yyyy', { locale: ptBR }),
                saldoInicial: 0,
                receitas: { items: [], total: 0, totalProjetado: 0 },
                despesas: { items: [], total: 0, totalProjetado: 0 },
                investimentos: { items: [], total: 0, totalProjetado: 0 },
                faturas: { items: [], total: 0, totalProjetado: 0 },
                saldoFinal: 0,
                saldoFinalProjetado: 0,
                variacao: 0,
                isLoading: true,
            };
        }

        const targetMonth = getMonth(currentDate);
        const targetYear = getYear(currentDate);
        const now = new Date();

        // 1. Initial Balance calculation
        let incomeBeforeMonth = 0;
        let expenseBeforeMonth = 0;
        (transactions || []).forEach(t => {
            const tDate = new Date(t.date);
            if (tDate < startOfCurrentMonth) {
                if (t.credit_card_id && t.origin === 'credit_card_installment') return;
                const amount = Number(t.amount) || 0;
                if (t.type === 'income') incomeBeforeMonth += amount;
                else if (t.type === 'expense') expenseBeforeMonth += amount;
            }
        });
        const saldoInicial = incomeBeforeMonth - expenseBeforeMonth;

        // 2. Filter Month
        const transactionsMes = (transactions || []).filter(t => isSameMonth(new Date(t.date), currentDate));
        const realizedTransactions = transactionsMes.filter(t => {
            const tDate = new Date(t.date);
            if (currentDate < startOfMonth(now)) return true;
            if (currentDate > endOfMonth(now)) return false;
            return tDate <= now;
        });

        // 3. Totals
        const investCategories = ['Investimento', 'Aporte', 'Resgate', 'investimentos', 'aporte', 'resgate'];

        const totalReceitasRealizado = realizedTransactions
            .filter(t => t.type === 'income' && !investCategories.includes(t.category))
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const totalDespesasRealizado = realizedTransactions
            .filter(t => t.type === 'expense' && !investCategories.includes(t.category) && !t.credit_card_id)
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const realizedCardPayments = realizedTransactions
            .filter(t => t.type === 'expense' && t.origin === 'credit_card_payment')
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const finalTotalDespesasRealizado = totalDespesasRealizado + realizedCardPayments;

        const totalInvestimentosRealizado = realizedTransactions
            .filter(t => investCategories.includes(t.category))
            .reduce((acc, t) => {
                const val = Number(t.amount) || 0;
                return t.type === 'income' ? acc + val : acc - val;
            }, 0);

        // Projected
        const totalReceitasProjetado = transactionsMes
            .filter(t => t.type === 'income' && !investCategories.includes(t.category))
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const baseDespesasProjetado = transactionsMes
            .filter(t => t.type === 'expense' && !investCategories.includes(t.category) && !t.credit_card_id)
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const subscriptionsValue = (subscriptions || []).reduce((acc, sub) => {
            if (isBefore(endOfCurrentMonth, now)) return acc;
            const subDate = new Date(sub.next_billing_date);
            return acc + (isSameMonth(subDate, currentDate) ? (Number(sub.amount) || 0) : 0);
        }, 0);

        const loansValue = (loans || []).reduce((acc, loan) => {
            if (!loan.next_due_date) return acc;
            const dueDate = new Date(loan.next_due_date);
            if (isSameMonth(dueDate, currentDate) && isAfter(dueDate, now)) {
                return acc + (Number(loan.monthly_payment) || 0);
            }
            return acc;
        }, 0);

        const installmentsValue = (installmentsProj || []).reduce((acc: number, inst: any) => acc + (Number(inst.amount) || 0), 0);

        const totalDespesasProjetado = baseDespesasProjetado + subscriptionsValue + loansValue + installmentsValue;

        const totalInvestimentosProjetado = transactionsMes
            .filter(t => investCategories.includes(t.category))
            .reduce((acc, t) => {
                const val = Number(t.amount) || 0;
                return t.type === 'income' ? acc + val : acc - val;
            }, 0);

        // 4. Categorization
        const groupTransactions = (list: any[]) => {
            const map = new Map<string, { categoria: string; valor: number; projetado: number }>();
            list.forEach(t => {
                const cat = t.category || 'Outros';
                const amount = Number(t.amount) || 0;
                const existing = map.get(cat) || { categoria: cat, valor: 0, projetado: 0 };

                const tDate = new Date(t.date);
                const isRealized = (currentDate < startOfMonth(now)) || (tDate <= now);
                if (isRealized) existing.valor += amount;
                existing.projetado += amount;
                map.set(cat, existing);
            });
            return Array.from(map.values());
        };

        const groupExpensesWithProjected = () => {
            const map = new Map<string, { categoria: string; valor: number; projetado: number }>();
            const add = (cat: string, val: number, isProjOnly: boolean) => {
                const existing = map.get(cat) || { categoria: cat, valor: 0, projetado: 0 };
                if (isProjOnly) existing.projetado += val;
                else {
                    existing.valor += val;
                    existing.projetado += val;
                }
                map.set(cat, existing);
            };

            // Standard
            transactionsMes
                .filter(t => t.type === 'expense' && !investCategories.includes(t.category) && !t.credit_card_id)
                .forEach(t => {
                    const tDate = new Date(t.date);
                    const isRealized = (currentDate < startOfMonth(now)) || (tDate <= now);
                    add(t.category, Number(t.amount) || 0, !isRealized);
                });

            // Card Payments
            transactionsMes
                .filter(t => t.type === 'expense' && t.origin === 'credit_card_payment')
                .forEach(t => add(t.category || 'Cartão de Crédito', Number(t.amount) || 0, false));

            // Subscriptions
            (subscriptions || []).forEach(sub => {
                const subDate = new Date(sub.next_billing_date);
                if (isSameMonth(subDate, currentDate) && isAfter(subDate, now)) {
                    add(sub.category || 'Assinaturas', Number(sub.amount) || 0, true);
                }
            });

            // Loans
            (loans || []).forEach(loan => {
                if (!loan.next_due_date) return;
                const dueDate = new Date(loan.next_due_date);
                if (isSameMonth(dueDate, currentDate) && isAfter(dueDate, now)) {
                    add(loan.asset_type || 'Empréstimos', Number(loan.monthly_payment) || 0, true);
                }
            });

            // Installments
            (installmentsProj || []).forEach((inst: any) => {
                add(inst.credit_card_transactions?.category || 'Cartão de Crédito', Number(inst.amount) || 0, true);
            });

            return Array.from(map.values());
        };

        const receitasList = transactionsMes.filter(t => t.type === 'income' && !investCategories.includes(t.category));
        const investimentosList = transactionsMes.filter(t => investCategories.includes(t.category));

        const saldoFinal = saldoInicial + totalReceitasRealizado - finalTotalDespesasRealizado + totalInvestimentosRealizado;
        const saldoFinalProjetado = saldoInicial + totalReceitasProjetado - totalDespesasProjetado + totalInvestimentosProjetado;

        return {
            monthYear: format(currentDate, 'MMMM yyyy', { locale: ptBR }),
            saldoInicial,
            receitas: {
                items: groupTransactions(receitasList),
                total: totalReceitasRealizado,
                totalProjetado: totalReceitasProjetado
            },
            despesas: {
                items: groupExpensesWithProjected(),
                total: finalTotalDespesasRealizado,
                totalProjetado: totalDespesasProjetado
            },
            investimentos: {
                items: groupTransactions(investimentosList),
                total: totalInvestimentosRealizado,
                totalProjetado: totalInvestimentosProjetado
            },
            faturas: { items: [], total: 0, totalProjetado: 0 },
            saldoFinal,
            saldoFinalProjetado,
            variacao: saldoInicial !== 0 ? ((saldoFinal - saldoInicial) / Math.abs(saldoInicial)) * 100 : 0,
            isLoading: false
        };
    }, [transactions, loadingTransactions, subscriptions, loans, cards, installmentsProj, loadingInst, currentDate]);
}
