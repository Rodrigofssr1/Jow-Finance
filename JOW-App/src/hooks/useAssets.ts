import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useJowMentor } from '../context/JowMentorContext';

export function useAssets() {
    const { user } = useAuth();
    const { analyzeAction } = useJowMentor();
    const queryClient = useQueryClient();
    const QUERY_KEY = ['assets', user?.id];

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['assets'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['patrimony'] });
    };

    const { data, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await supabase
                .from('assets')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    // Helper: Create acquisition transaction (only for cash purchases)
    const createAcquisitionTransaction = async (
        assetName: string,
        assetType: string,
        amount: number,
        acquisitionDate: string,
        userId: string
    ) => {
        const typeLabel = assetType.startsWith('imovel') ? 'Imóvel'
            : assetType.startsWith('veiculo') ? 'Veículo'
                : assetType === 'joia' ? 'Joia'
                    : assetType === 'eletro_eletronico' ? 'Eletrônico'
                        : 'Bem';

        const { data, error } = await supabase
            .from('transactions')
            .insert([{
                user_id: userId,
                type: 'expense',
                amount: amount,
                category: 'patrimonio',
                description: `Aquisição: ${assetName} - ${typeLabel}`,
                date: acquisitionDate,
                paid: true,
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    };

    // Helper: Save acquisition costs (upsert)
    const saveAcquisitionCosts = async (
        assetId: string,
        userId: string,
        costsPayload: any
    ) => {
        if (!costsPayload) return;

        console.log('[useAssets] Saving acquisition costs for asset:', assetId);

        const fullPayload = {
            asset_id: assetId,
            user_id: userId,
            ...costsPayload,
        };

        // Upsert: insert or update based on unique asset_id constraint
        const { error } = await supabase
            .from('asset_acquisition_costs')
            .upsert(fullPayload, { onConflict: 'asset_id' });

        if (error) {
            console.error('[useAssets] Failed to save acquisition costs:', error);
            throw new Error(`Erro ao salvar custos de aquisição: ${error.message}`);
        }

        console.log('[useAssets] Acquisition costs saved successfully');
    };

    // Helper: Fetch acquisition costs for a single asset (for edit modal)
    const fetchAssetCosts = async (assetId: string) => {
        const { data, error } = await supabase
            .from('asset_acquisition_costs')
            .select('*')
            .eq('asset_id', assetId)
            .maybeSingle();

        if (error) {
            console.error('[useAssets] Failed to fetch costs:', error);
            return null;
        }
        return data;
    };

    const addAsset = useMutation({
        mutationFn: async (newAsset: any) => {
            if (!user) throw new Error('Usuário não autenticado');

            const acquisitionType = newAsset.acquisition_type || 'cash';

            // Extract costs payload (prefixed with _ to avoid sending to assets table)
            const costsPayload = newAsset._acquisitionCosts;

            // Build clean payload - only send columns that exist in the assets table
            const insertPayload = {
                user_id: user.id,
                name: newAsset.name,
                type: newAsset.type,
                purchase_value: newAsset.purchase_value,
                current_value: newAsset.current_value,
                acquisition_date: newAsset.acquisition_date,
                description: newAsset.description || null,
                location: newAsset.location || null,
                acquisition_type: acquisitionType,
                insurance_id: newAsset.insurance_id || null,
                image_url: newAsset.image_url || null,
            };

            console.log('[useAssets] Step 1: Inserting asset...', JSON.stringify(insertPayload, null, 2));

            // 1. Insert the asset
            const { data: asset, error: assetError } = await supabase
                .from('assets')
                .insert([insertPayload])
                .select()
                .single();

            if (assetError) {
                console.error('[useAssets] Step 1 FAILED - Insert error:', assetError);
                throw new Error(`Erro ao inserir bem: ${assetError.message} (code: ${assetError.code})`);
            }

            console.log('[useAssets] Step 1 SUCCESS - Asset created:', asset.id);

            // 2. Save acquisition costs if present
            if (costsPayload) {
                try {
                    console.log('[useAssets] Step 2: Saving acquisition costs...');
                    await saveAcquisitionCosts(asset.id, user.id, costsPayload);
                    console.log('[useAssets] Step 2 SUCCESS');
                } catch (costError: any) {
                    console.error('[useAssets] Step 2 FAILED:', costError);
                    // Don't block asset creation if costs fail
                }
            }

            // 3. Auto-create expense for purchase (ONLY cash)
            let transactionId: string | null = null;

            if (acquisitionType === 'cash') {
                try {
                    console.log('[useAssets] Step 3: Creating acquisition transaction...');
                    const tx = await createAcquisitionTransaction(
                        newAsset.name,
                        newAsset.type,
                        newAsset.purchase_value,
                        newAsset.acquisition_date,
                        user.id
                    );
                    transactionId = tx.id;
                    console.log('[useAssets] Step 3 SUCCESS - Transaction created:', transactionId);
                } catch (txError: any) {
                    console.error('[useAssets] Step 3 FAILED - Transaction error:', txError);
                    console.warn('[useAssets] Asset created but transaction failed. Continuing...');
                }
            }

            // 3b. Create SEPARATE transaction for acquisition costs (all purchase types)
            const costAmount = costsPayload?.total_acquisition_cost || 0;
            if (costAmount > 0) {
                try {
                    console.log('[useAssets] Step 3b: Creating costs transaction for', costAmount);
                    const { error: costTxErr } = await supabase
                        .from('transactions')
                        .insert([{
                            user_id: user.id,
                            type: 'expense',
                            amount: costAmount,
                            category: 'patrimonio',
                            description: `Custos de Aquisição - ${newAsset.name}`,
                            date: newAsset.acquisition_date,
                            paid: true,
                        }]);

                    if (costTxErr) {
                        console.error('[useAssets] Step 3b FAILED:', costTxErr);
                    } else {
                        console.log('[useAssets] Step 3b SUCCESS - Costs transaction created');
                    }
                } catch (e: any) {
                    console.error('[useAssets] Step 3b EXCEPTION:', e);
                }
            }

            // 4. Link transaction to asset
            if (transactionId) {
                console.log('[useAssets] Step 4: Linking transaction to asset...');
                const { error: linkError } = await supabase
                    .from('assets')
                    .update({ acquisition_transaction_id: transactionId })
                    .eq('id', asset.id);

                if (linkError) {
                    console.error('[useAssets] Step 4 FAILED - Link error:', linkError);
                } else {
                    console.log('[useAssets] Step 4 SUCCESS - Transaction linked');
                }
            }

            console.log('[useAssets] Asset creation complete:', asset.id);
            return { ...asset, acquisition_transaction_id: transactionId };
        },
        onSuccess: (data) => {
            console.log('[useAssets] Mutation onSuccess - Invalidating queries...');
            invalidateAll();
            // Trigger Jow Mentor Analysis
            analyzeAction('asset', data);
        },
        onError: (error: any) => {
            console.error('[useAssets] Mutation onError:', error);
        },
    });

    const updateAsset = useMutation({
        mutationFn: async ({ id, ...updates }: any) => {
            if (!user) throw new Error('User not authenticated');

            // Extract costs payload
            const costsPayload = updates._acquisitionCosts;
            delete updates._acquisitionCosts;

            const { data: asset, error } = await supabase
                .from('assets')
                .update(updates)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            // Save/update acquisition costs
            if (costsPayload) {
                try {
                    await saveAcquisitionCosts(id, user.id, costsPayload);
                } catch (costError: any) {
                    console.error('[useAssets] Cost update failed:', costError);
                }

                // Sync costs transaction in cash flow
                const costAmount = costsPayload.total_acquisition_cost || 0;
                if (costAmount > 0) {
                    try {
                        // Find existing costs transaction by description pattern
                        const descPattern = `Custos de Aquisição - ${asset.name}`;
                        const { data: existingTx } = await supabase
                            .from('transactions')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('description', descPattern)
                            .maybeSingle();

                        if (existingTx) {
                            // Update existing
                            await supabase
                                .from('transactions')
                                .update({ amount: costAmount })
                                .eq('id', existingTx.id);
                            console.log('[useAssets] Costs transaction updated');
                        } else {
                            // Create new
                            await supabase
                                .from('transactions')
                                .insert([{
                                    user_id: user.id,
                                    type: 'expense',
                                    amount: costAmount,
                                    category: 'patrimonio',
                                    description: descPattern,
                                    date: asset.acquisition_date,
                                    paid: true,
                                }]);
                            console.log('[useAssets] Costs transaction created');
                        }
                    } catch (e: any) {
                        console.error('[useAssets] Costs transaction sync failed:', e);
                    }
                }
            }

            // Update linked transaction amount if it exists and purchase_value changed
            if (asset.acquisition_transaction_id && updates.purchase_value !== undefined) {
                await supabase
                    .from('transactions')
                    .update({
                        amount: updates.purchase_value,
                        description: `Aquisição: ${asset.name}`,
                    })
                    .eq('id', asset.acquisition_transaction_id);
            }

            return asset;
        },
        onSuccess: invalidateAll,
    });

    const deleteAsset = useMutation({
        mutationFn: async ({ id, deleteTransaction }: { id: string; deleteTransaction?: boolean }) => {
            if (!user) throw new Error('User not authenticated');

            // Get asset to check for linked transaction
            const { data: asset } = await supabase
                .from('assets')
                .select('acquisition_transaction_id')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            // Delete linked transaction if requested
            if (deleteTransaction && asset?.acquisition_transaction_id) {
                await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', asset.acquisition_transaction_id);
            }

            // Delete the asset (costs auto-deleted via CASCADE)
            const { error } = await supabase
                .from('assets')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
        },
        onSuccess: invalidateAll,
    });

    return { data, isLoading, error, addAsset, updateAsset, deleteAsset, fetchAssetCosts };
}
