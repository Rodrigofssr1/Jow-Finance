/**
 * Financial Math Utilities
 * 
 * Helper functions for loan amortization calculations (PRICE, SAC).
 */

/**
 * Calculates the fixed monthly payment for PRICE system (Tabela Price).
 * Formula: PMT = PV * (i * (1+i)^n) / ((1+i)^n - 1)
 * 
 * @param pv Present Value (Loan Amount)
 * @param rate Monthly Interest Rate (percentage, e.g. 1.5 for 1.5%)
 * @param n Total number of periods (months)
 * @returns Monthly Payment Amount
 */
export function calculatePricePayment(pv: number, rate: number, n: number): number {
    if (n <= 0) return 0;
    if (rate <= 0) return pv / n; // Simple division if no interest

    const i = rate / 100;
    const numerator = pv * i * Math.pow(1 + i, n);
    const denominator = Math.pow(1 + i, n) - 1;

    return numerator / denominator;
}

/**
 * Calculates the payment for a specific period in SAC system (Constant Amortization).
 * In SAC, the amortization is constant (PV / n), but interest decreases.
 * Payment = Amortization + Interest
 * 
 * @param pv Present Value (Loan Amount)
 * @param rate Monthly Interest Rate (percentage)
 * @param n Total number of periods
 * @param currentPeriod The period to calculate (1-based index)
 * @returns Payment Amount for that period
 */
export function calculateSACPayment(pv: number, rate: number, n: number, currentPeriod: number): number {
    if (n <= 0) return 0;

    const amortization = pv / n;

    // Balance before this payment
    // Balance0 = PV
    // Balance k-1 = PV - (k-1)*A
    const previousBalance = pv - ((currentPeriod - 1) * amortization);

    if (previousBalance <= 0) return 0;

    const interest = previousBalance * (rate / 100);

    return amortization + interest;
}

/**
 * Calculates total amount paid so far in SAC system.
 * Total = Sum(Amortization) + Sum(Interest)
 */
export function calculateSACTotalPaid(pv: number, rate: number, n: number, paidPeriods: number): number {
    if (n <= 0 || paidPeriods <= 0) return 0;

    const amortization = pv / n;
    const i = rate / 100;

    // Total Amortization Paid
    const totalAmortization = amortization * paidPeriods;

    // Total Interest Paid
    // Sum of interest for periods 1 to k
    // Interest_j = (PV - (j-1)A) * i
    // Sum = i * [ PV*k - A * Sum(j-1 for j=1 to k) ]
    // Sum(j-1) = 0 + 1 + ... + k-1 = (k-1)*k / 2

    const sumInterestFactors = (paidPeriods * (paidPeriods - 1)) / 2;
    const totalInterest = i * (pv * paidPeriods - amortization * sumInterestFactors);

    return totalAmortization + totalInterest;
}
