import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERROR: Supabase URL or Anon Key is missing!', {
        urlLength: supabaseUrl ? supabaseUrl.length : 0,
        keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
    });
} else {
    console.log('Supabase config loaded:', {
        url: supabaseUrl,
        keyLength: supabaseAnonKey.length,
    });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

/**
 * ZONA DE PERIGO: Limpa todos os dados do usuário.
 * Esta ação não pode ser desfeita.
 * 
 * @param userId ID do usuário logado
 * @returns { success: boolean, error: any }
 */
/**
 * ZONA DE PERIGO: Limpa todos os dados do usuário.
 * Esta ação não pode ser desfeita.
 * 
 * @param userId ID do usuário logado
 * @returns { success: boolean, error: any }
 */
export const resetAllUserData = async (userId: string) => {
    try {
        if (!userId) throw new Error("User ID is required");

        console.log('🗑️ [RESET] Iniciando limpeza completa de dados do usuário:', userId);

        // Ordem de exclusão é CRÍTICA devido às chaves estrangeiras.
        // Tabelas dependentes devem ser apagadas antes das tabelas principais.

        // 1. Nível mais baixo (Dependências de 3º nível)
        console.log('📍 Deletando: installments...');
        await supabase.from('installments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all user's installments (via cascade from transactions)

        console.log('📍 Deletando: transactions...');
        await supabase.from('transactions').delete().eq('user_id', userId);

        console.log('📍 Deletando: investment_transactions...');
        await supabase.from('investment_transactions').delete().eq('user_id', userId);

        // 2. Intermediários (Dependências de 2º nível - Credit Card System)
        console.log('📍 Deletando: credit_card_transactions...');
        await supabase.from('credit_card_transactions').delete().eq('user_id', userId);

        console.log('📍 Deletando: credit_card_invoices...');
        await supabase.from('credit_card_invoices').delete().eq('user_id', userId);

        // 3. Outros Intermediários (Links)
        console.log('📍 Deletando: subscriptions...');
        await supabase.from('subscriptions').delete().eq('user_id', userId);

        console.log('📍 Deletando: insurances...');
        await supabase.from('insurances').delete().eq('user_id', userId);

        console.log('📍 Deletando: assets...');
        await supabase.from('assets').delete().eq('user_id', userId);

        console.log('📍 Deletando: goals...');
        await supabase.from('goals').delete().eq('user_id', userId);

        console.log('📍 Deletando: conversations...');
        await supabase.from('conversations').delete().eq('user_id', userId);

        console.log('📍 Deletando: investments...');
        await supabase.from('investments').delete().eq('user_id', userId);

        // 4. Nível Base (Entidades Core)
        console.log('📍 Deletando: credit_cards...');
        await supabase.from('credit_cards').delete().eq('user_id', userId);

        console.log('📍 Deletando: loans...');
        await supabase.from('loans').delete().eq('user_id', userId);

        // 5. Fundação (Base de tudo)
        console.log('📍 Deletando: accounts...');
        await supabase.from('accounts').delete().eq('user_id', userId);

        console.log('📍 Deletando: categories...');
        await supabase.from('categories').delete().eq('user_id', userId);

        console.log('✅ [RESET] Limpeza completa finalizada com sucesso!');

        // Nota: Não usamos Promise.all aqui porque a ordem importa.
        // Se tentarmos deletar um cartão que tem uma assinatura vinculada, o banco vai bloquear.
        // Deletando sequencialmente garantimos que não haja violação de FK.

        return { success: true };
    } catch (error) {
        console.error("❌ [RESET] Erro ao resetar dados do usuário:", error);
        return { success: false, error };
    }
};
