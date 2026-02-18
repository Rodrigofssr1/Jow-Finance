import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export interface RecurringItem {
    amount?: number;
    premium_amount?: number;
    charge_day?: number;
    due_day?: number;
    start_date?: string;
    end_date?: string;
    credit_card_id?: string;
}

export interface CreditCardData {
    id: string;
    current_bill: number;
    limit_amount: number;
    closing_day: number;
    due_day: number;
    next_bill?: number;
    name: string; // added name for typings if needed
}

export const calculateCardBill = (
    card: CreditCardData,
    subscriptions: RecurringItem[],
    insurances: RecurringItem[],
    targetDate: Date = new Date()
) => {
    // 1. Establish the "Bill Cycle"
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const closingDay = card.closing_day;

    // "Current Open Bill"
    let currentBillPeriodEnd = new Date(year, month, closingDay);
    if (targetDate.getDate() >= closingDay) {
        currentBillPeriodEnd = new Date(year, month + 1, closingDay);
    }

    // "Next Bill"
    const nextBillPeriodEnd = new Date(currentBillPeriodEnd);
    nextBillPeriodEnd.setMonth(nextBillPeriodEnd.getMonth() + 1);

    // Filter Recurring Items for this Card
    const cardSubs = subscriptions.filter(s => s.credit_card_id === card.id);
    const cardInsurances = insurances.filter(i => i.credit_card_id === card.id);
    const allRecurring = [...cardSubs, ...cardInsurances];

    let recurringCurrent = 0;
    let recurringNext = 0;

    // Helper to check validity
    const isActiveInPeriod = (rec: RecurringItem, periodEnd: Date) => {
        const startStr = rec.start_date;
        const endStr = rec.end_date;

        // Legacy/No Start Date -> Assume active unless Ended
        if (!startStr) return !endStr || new Date(endStr) > periodEnd;

        const start = new Date(startStr);
        const end = endStr ? new Date(endStr) : null;

        if (start > periodEnd) return false;

        if (end) {
            const periodStart = new Date(periodEnd);
            periodStart.setMonth(periodStart.getMonth() - 1);
            if (end < periodStart) return false;
        }
        return true;
    };

    allRecurring.forEach(rec => {
        const amount = Number(rec.amount || rec.premium_amount || 0);
        const chargeDay = Number(rec.charge_day || rec.due_day || 1);

        // Find candidate date for Current Cycle
        let candidateDate = new Date(currentBillPeriodEnd);
        // If chargeDay > closingDay, it must be in previous month part of the cycle.
        if (chargeDay > closingDay) {
            candidateDate.setMonth(candidateDate.getMonth() - 1);
        }
        candidateDate.setDate(chargeDay);

        if (isActiveInPeriod(rec, currentBillPeriodEnd)) {
            recurringCurrent += amount;
        }

        // Check for Next Cycle
        if (isActiveInPeriod(rec, nextBillPeriodEnd)) {
            recurringNext += amount;
        }
    });

    return {
        currentBill: Number(card.current_bill || 0) + recurringCurrent,
        nextBill: Number(card.next_bill || 0) + recurringNext,
        recurringCurrent,
        recurringNext
    };
};
