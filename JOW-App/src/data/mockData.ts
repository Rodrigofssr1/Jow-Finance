/**
 * JOW - Mock Data
 * 
 * Dados estáticos para desenvolvimento.
 * Fase 2: Todos os valores zerados.
 * Fase 3+: Será substituído por dados do Supabase.
 */

export interface DashboardData {
    /** Dinheiro disponível para gastar (contas - despesas) */
    disponivel: number;
    /** Total investido em ativos */
    investido: number;
    /** Total de entradas do mês atual */
    entradasMes: number;
    /** Total de saídas do mês atual */
    saidasMes: number;
}

/**
 * Dados do dashboard (mock - zerados)
 */
export const dashboardData: DashboardData = {
    disponivel: 0,
    investido: 0,
    entradasMes: 0,
    saidasMes: 0,
};

/**
 * Hook para obter dados do dashboard
 * (Preparado para futura integração com Supabase)
 */
export function useDashboardData(): DashboardData {
    // Fase 2: Retorna dados mock
    // Fase 3: Será substituído por hook com Supabase
    return dashboardData;
}
