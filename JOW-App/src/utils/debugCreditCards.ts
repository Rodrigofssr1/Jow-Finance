import { supabase } from '../lib/supabase';

/**
 * DEBUG UTILITY - Diagnóstico do Sistema de Cartões de Crédito
 *
 * Execute esta função para identificar problemas na tela de detalhes
 */
export async function debugCreditCardSystem(cardId: string) {
    console.log('=== DIAGNÓSTICO DO SISTEMA DE CARTÕES ===');
    console.log('Card ID:', cardId);

    try {
        // 1. Verificar se o cartão existe
        const { data: card, error: cardError } = await supabase
            .from('credit_cards')
            .select('*')
            .eq('id', cardId)
            .single();

        console.log('\n1️⃣ CARTÃO:');
        if (cardError) {
            console.error('❌ Erro ao buscar cartão:', cardError);
            return;
        }
        console.log('✅ Cartão encontrado:', {
            id: card.id,
            name: card.name,
            limit: card.limit_amount,
            used_limit: card.used_limit,
            current_bill: card.current_bill
        });

        // 2. Verificar transações de cartão de crédito
        const { data: transactions, error: txError } = await supabase
            .from('credit_card_transactions')
            .select('*')
            .eq('credit_card_id', cardId);

        console.log('\n2️⃣ TRANSAÇÕES DO CARTÃO:');
        if (txError) {
            console.error('❌ Erro ao buscar transações:', txError);
        } else {
            console.log(`✅ ${transactions?.length || 0} transações encontradas`);
            transactions?.forEach((tx, i) => {
                console.log(`  ${i + 1}. ${tx.description} - R$ ${tx.total_amount} (${tx.installment_count}x)`);
            });
        }

        // 3. Verificar faturas
        const { data: invoices, error: invError } = await supabase
            .from('credit_card_invoices')
            .select('*')
            .eq('card_id', cardId)
            .order('year', { ascending: true })
            .order('month', { ascending: true });

        console.log('\n3️⃣ FATURAS:');
        if (invError) {
            console.error('❌ Erro ao buscar faturas:', invError);
        } else {
            console.log(`✅ ${invoices?.length || 0} faturas encontradas`);
            invoices?.forEach((inv, i) => {
                console.log(`  ${i + 1}. ${inv.month}/${inv.year} - R$ ${inv.total_amount} - ${inv.status}`);
            });
        }

        // 4. Verificar parcelas
        const { data: installments, error: instError } = await supabase
            .from('installments')
            .select(`
                *,
                credit_card_transactions (
                    description,
                    category,
                    installment_count,
                    credit_card_id
                )
            `)
            .eq('credit_card_transactions.credit_card_id', cardId);

        console.log('\n4️⃣ PARCELAS:');
        if (instError) {
            console.error('❌ Erro ao buscar parcelas:', instError);
        } else {
            console.log(`✅ ${installments?.length || 0} parcelas encontradas`);
            installments?.forEach((inst, i) => {
                console.log(`  ${i + 1}. ${inst.installment_number} - R$ ${inst.amount} - Invoice: ${inst.invoice_id}`);
            });
        }

        // 5. Verificar a QUERY EXATA que o modal usa
        const { data: modalData, error: modalError } = await supabase
            .from('credit_card_invoices')
            .select(`
                *,
                installments (
                    id, amount, due_date, installment_number,
                    credit_card_transactions (description, category, installment_count, created_at)
                )
            `)
            .eq('card_id', cardId)
            .order('year', { ascending: true })
            .order('month', { ascending: true });

        console.log('\n5️⃣ QUERY DO MODAL (A QUE IMPORTA):');
        if (modalError) {
            console.error('❌ ERRO NA QUERY DO MODAL:', modalError);
            console.error('Detalhes:', JSON.stringify(modalError, null, 2));
        } else {
            console.log(`✅ Query retornou ${modalData?.length || 0} faturas`);
            if (modalData && modalData.length > 0) {
                console.log('Estrutura da primeira fatura:', JSON.stringify(modalData[0], null, 2));
            } else {
                console.log('⚠️ PROBLEMA ENCONTRADO: Query retornou vazio mas há dados no banco!');
            }
        }

        // 6. Verificar relações (foreign keys)
        if (installments && installments.length > 0) {
            const orphanInstallments = installments.filter(inst => !inst.invoice_id);
            if (orphanInstallments.length > 0) {
                console.log(`\n⚠️ PROBLEMA: ${orphanInstallments.length} parcelas SEM invoice_id!`);
                orphanInstallments.forEach(inst => {
                    console.log(`  - Parcela ${inst.id} (${inst.installment_number}) sem fatura vinculada`);
                });
            }
        }

        console.log('\n=== FIM DO DIAGNÓSTICO ===\n');

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
    }
}
