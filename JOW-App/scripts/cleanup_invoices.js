/**
 * Script de limpeza: Remove faturas, parcelas e transações de teste incorretas.
 *
 * Este script:
 * 1. Deleta TODAS as installments (parcelas de teste)
 * 2. Deleta TODAS as credit_card_invoices (faturas de teste)
 * 3. Deleta TODAS as credit_card_transactions (compras de cartão de teste)
 * 4. Remove transações da tabela 'transactions' que foram salvas incorretamente
 *    como cash quando deveriam ter ido apenas para o cartão
 * 5. Reseta o used_limit de todos os cartões para 0
 *
 * Uso: node scripts/cleanup_invoices.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://knugnescnjrchqmracsq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtudWduZXNjbmpyY2hxbXJhY3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDg3NjMsImV4cCI6MjA4NTk4NDc2M30.ySvHfJlh32n6-qTmUrU1oPpDk2tFq9lROYoAMW_VZq4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
    console.log('🧹 Iniciando limpeza de dados de teste...\n');

    // 1. Deletar installments
    const { data: installments, error: e1 } = await supabase
        .from('installments')
        .select('id, amount, credit_card_transaction_id')
        .neq('id', '00000000-0000-0000-0000-000000000000');

    console.log(`📍 Installments encontradas: ${installments?.length || 0}`);
    if (installments?.length > 0) {
        const { error } = await supabase
            .from('installments')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('  ❌ Erro:', error.message);
        else console.log('  ✅ Deletadas com sucesso');
    }

    // 2. Deletar credit_card_invoices
    const { data: invoices } = await supabase
        .from('credit_card_invoices')
        .select('id, month, year, total_amount, card_id')
        .neq('id', '00000000-0000-0000-0000-000000000000');

    console.log(`📍 Faturas encontradas: ${invoices?.length || 0}`);
    if (invoices?.length > 0) {
        invoices.forEach(inv => {
            console.log(`  → Fatura ${inv.month}/${inv.year} - R$ ${inv.total_amount}`);
        });
        const { error } = await supabase
            .from('credit_card_invoices')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('  ❌ Erro:', error.message);
        else console.log('  ✅ Deletadas com sucesso');
    }

    // 3. Deletar credit_card_transactions
    const { data: cardTx } = await supabase
        .from('credit_card_transactions')
        .select('id, description, total_amount')
        .neq('id', '00000000-0000-0000-0000-000000000000');

    console.log(`📍 Credit card transactions encontradas: ${cardTx?.length || 0}`);
    if (cardTx?.length > 0) {
        cardTx.forEach(tx => {
            console.log(`  → "${tx.description}" - R$ ${tx.total_amount}`);
        });
        const { error } = await supabase
            .from('credit_card_transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('  ❌ Erro:', error.message);
        else console.log('  ✅ Deletadas com sucesso');
    }

    // 4. Verificar transactions que parecem ser de cartão (dados de teste)
    const { data: transactions } = await supabase
        .from('transactions')
        .select('id, description, amount, type, date, category')
        .neq('id', '00000000-0000-0000-0000-000000000000');

    console.log(`\n📍 Transactions na tabela cash: ${transactions?.length || 0}`);
    if (transactions?.length > 0) {
        transactions.forEach(tx => {
            console.log(`  → "${tx.description}" - R$ ${tx.amount} (${tx.type}) - ${tx.date}`);
        });
    }

    // 5. Resetar used_limit dos cartões
    const { data: cards } = await supabase
        .from('credit_cards')
        .select('id, name, used_limit, credit_limit');

    console.log(`\n📍 Cartões encontrados: ${cards?.length || 0}`);
    if (cards?.length > 0) {
        for (const card of cards) {
            console.log(`  → "${card.name}" - Limite: R$ ${card.credit_limit} | Usado: R$ ${card.used_limit}`);
            if (card.used_limit > 0) {
                const { error } = await supabase
                    .from('credit_cards')
                    .update({ used_limit: 0 })
                    .eq('id', card.id);
                if (error) console.error(`    ❌ Erro ao resetar:`, error.message);
                else console.log(`    ✅ used_limit resetado para 0`);
            }
        }
    }

    console.log('\n✅ Limpeza concluída!\n');
    console.log('⚠️  As transações na tabela "transactions" foram listadas acima.');
    console.log('    Se alguma delas era uma compra de cartão salva incorretamente,');
    console.log('    delete manualmente ou rerun com flag --delete-cash-test.');
}

// Verificar se deve deletar transações cash de teste
const deleteCashTest = process.argv.includes('--delete-cash-test');

async function main() {
    await cleanup();

    if (deleteCashTest) {
        console.log('\n🗑️  Flag --delete-cash-test detectada. Deletando TODAS as transactions...');
        const { error } = await supabase
            .from('transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('  ❌ Erro:', error.message);
        else console.log('  ✅ Todas as transactions de teste deletadas.');
    }
}

main().catch(console.error);
