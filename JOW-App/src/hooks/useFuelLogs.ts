import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type FuelLog = {
    id: string;
    asset_id: string;
    transaction_id: string;
    liters: number;
    cost_per_liter: number;
    total_cost: number;
    date: string;
};

export const useFuelLogs = (assetId?: string) => {
    const { user } = useAuth();

    const fetchFuelLogs = async () => {
        if (!user || !assetId) return [];

        const { data, error } = await supabase
            .from('vehicle_fuel_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('asset_id', assetId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data as FuelLog[];
    };

    const fuelLogsQuery = useQuery({
        queryKey: ['fuel_logs', assetId],
        queryFn: fetchFuelLogs,
        enabled: !!user && !!assetId,
    });

    const getMonthlyStats = () => {
        if (!fuelLogsQuery.data) return { totalCost: 0, totalLiters: 0, avgPrice: 0 };

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyLogs = fuelLogsQuery.data.filter(log => new Date(log.date) >= startOfMonth);

        const totalCost = monthlyLogs.reduce((acc, log) => acc + log.total_cost, 0);
        const totalLiters = monthlyLogs.reduce((acc, log) => acc + log.liters, 0);
        const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;

        return { totalCost, totalLiters, avgPrice };
    };

    return {
        fuelLogs: fuelLogsQuery.data || [],
        isLoading: fuelLogsQuery.isLoading,
        error: fuelLogsQuery.error,
        getMonthlyStats,
    };
};
