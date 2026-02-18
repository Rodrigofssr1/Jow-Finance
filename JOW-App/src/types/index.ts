export interface CreditCard {
    id: string;
    user_id: string;
    name: string;
    limit_amount: number;
    closing_day: number;
    due_day: number;
    current_bill: number;
    next_bill?: number;
    color?: string;
    created_at: string;
    last_four_digits?: string;
}

export interface Loan {
    id: string;
    user_id: string;
    name: string;
    original_amount: number;
    monthly_payment: number;
    total_installments: number;
    paid_installments: number;
    interest_rate?: number;
    next_due_date?: string;
    asset_type?: 'casa' | 'carro' | 'moto' | 'outro';
    asset_value?: number;
    down_payment?: number;
    amortization_system?: 'PRICE' | 'SAC';
    created_at: string;
}

export interface Subscription {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    due_day: number;
    category: string;
    created_at: string;

    // New Architecture
    service_duration_type: 'lifetime' | 'fixed' | 'recurring';
    service_months?: number; // Only for 'fixed'

    payment_method: 'credit_card' | 'boleto' | 'pix' | 'debit';
    credit_card_id?: string;
    card_charge_day?: number;

    payment_installments: number; // 0 for recurring
    installment_amount?: number;
    current_installment?: number;

    // Joins (Supabase)
    credit_cards?: {
        name: string;
        closing_day: number;
    };
}

export interface Insurance {
    id: string;
    user_id: string;
    type: 'vida' | 'residencial' | 'auto' | 'saude' | 'outros';
    insurer: string;
    policy_number?: string;
    premium_amount: number;
    billing_period: 'mensal' | 'anual';
    due_date: string;
    coverage_summary?: string;
    contact_phone?: string;
    created_at: string;
}

export interface AssetAcquisitionCosts {
    id: string;
    asset_id: string;
    user_id: string;

    // Imóveis
    itbi_percentage?: number;
    itbi_amount?: number;
    notary_total_fees?: number;
    brokerage_percentage?: number;
    brokerage_amount?: number;
    laudemio_amount?: number;
    bank_appraisal_fee?: number;

    // Veículos
    vehicle_transfer_tax?: number;
    vehicle_inspection_fee?: number;
    vehicle_agent_fee?: number;
    ipva_amount?: number;

    // Outros
    other_costs?: number;

    // Totais
    total_acquisition_cost: number;
    total_investment: number;

    created_at: string;
    updated_at: string;
}

export interface Asset {
    id: string;
    user_id: string;
    name: string;
    type: 'imovel_residencial' | 'imovel_comercial' | 'veiculo_carro' | 'veiculo_moto' | 'eletro_eletronico' | 'joia' | 'obra_arte' | 'colecionavel' | 'outro';
    purchase_value: number;
    current_value: number;
    acquisition_date: string;
    image_url?: string;
    insurance_id?: string;
    description?: string;
    location?: string;
    documents?: any;
    appreciation_rate?: number;
    depreciation_rate?: number;
    acquisition_type?: 'cash' | 'financed' | 'consortium';
    acquisition_transaction_id?: string;
    debt_id?: string;
    created_at: string;

    // Joins
    debt?: { name: string; original_amount: number; paid_installments: number; total_installments: number; monthly_payment: number };
    insurances?: { insurer: string; type: string };
    acquisition_costs?: AssetAcquisitionCosts;
}

