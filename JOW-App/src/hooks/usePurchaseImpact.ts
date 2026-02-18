import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export type PurchaseImpact = {
    riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
    data: {
        totalCommitment: number;
        monthlyIncome: number;
        installmentValue: number;
        installments: number;
        monthsToPayoff: number;
        message: string;
        suggestion?: string;
    };
};

export const usePurchaseImpact = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<PurchaseImpact | null>(null);

    const analyzePurchase = useCallback(async (amount: number, installments: number) => {
        if (!user || amount <= 0 || installments <= 1) return;

        setLoading(true);
        try {
            // 1. Fetch User Profile (Income)
            const { data: profile } = await supabase
                .from('profiles')
                .select('monthly_income')
                .eq('id', user.id)
                .single();

            const monthlyIncome = profile?.monthly_income || 0;

            if (monthlyIncome === 0) {
                // Fallback if income is not set
                setAnalysis({
                    riskLevel: 'warning',
                    data: {
                        totalCommitment: 0,
                        monthlyIncome: 0,
                        installmentValue: amount / installments,
                        installments,
                        monthsToPayoff: installments,
                        message: "Não encontrei sua renda mensal no perfil. Cuidado com parcelas altas.",
                        suggestion: "Atualize sua renda no perfil para análises precisas."
                    }
                });
                return;
            }

            // 2. Fetch Active Installments (Approximate from transactions/bills)
            // For MVP, we'll sum up 'expense' transactions of type 'credit_card' from last 30 days 
            // OR fetch from credit_cards current_bill. 
            // Better: Sum of all `credit_cards.current_bill` / 30 (very rough) or just assume current bills = committed.

            const { data: cards } = await supabase
                .from('credit_cards')
                .select('current_bill');

            const currentCardBillTotal = cards?.reduce((sum, c) => sum + (c.current_bill || 0), 0) || 0;

            // 3. Calculate Logic
            const installmentValue = amount / installments;
            const newTotalCommitment = currentCardBillTotal + installmentValue; // rough estimate of monthly commitment
            const commitmentPercentage = (newTotalCommitment / monthlyIncome) * 100;
            const installmentImpact = (installmentValue / monthlyIncome) * 100;

            let riskLevel: PurchaseImpact['riskLevel'] = 'safe';
            let message = '';
            let suggestion = '';

            // Rule Engine
            if (commitmentPercentage > 50) {
                riskLevel = 'critical';
                message = `🚨 CRÍTICO: Com essa compra, você compromete ${commitmentPercentage.toFixed(0)}% da sua renda. Isso é muito arriscado!`;
                suggestion = "Adie a compra ou junte dinheiro para pagar à vista.";
            } else if (commitmentPercentage > 30) {
                riskLevel = 'danger';
                message = `⚠️ PERIGO: Suas parcelas somarão ${commitmentPercentage.toFixed(0)}% da renda. O ideal é manter abaixo de 30%.`;
                suggestion = `Tente reduzir para ${Math.ceil(installments * 1.5)}x para baixar a parcela.`;
            } else if (commitmentPercentage > 20 || installmentImpact > 10) {
                riskLevel = 'warning';
                message = `🟡 ATENÇÃO: Esta parcela sozinha consome ${installmentImpact.toFixed(0)}% do que você ganha.`;
                suggestion = "Tem certeza que precisa disso agora?";
            } else {
                riskLevel = 'safe';
                message = "✅ SEGURO: A compra cabe no seu orçamento mensal.";
            }

            setAnalysis({
                riskLevel,
                data: {
                    totalCommitment: commitmentPercentage,
                    monthlyIncome,
                    installmentValue,
                    installments,
                    monthsToPayoff: installments,
                    message,
                    suggestion
                }
            });

        } catch (error) {
            console.error('Error analyzing purchase:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const clearAnalysis = () => setAnalysis(null);

    return {
        analyzePurchase,
        analysis,
        loading,
        clearAnalysis
    };
};
