import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TransactionInitialData } from '../components/transactions/AddTransactionModal';

interface TransactionModalContextType {
    isVisible: boolean;
    initialData: TransactionInitialData | null;
    openModal: (data?: TransactionInitialData) => void;
    closeModal: () => void;
}

const TransactionModalContext = createContext<TransactionModalContextType>({
    isVisible: false,
    initialData: null,
    openModal: () => { },
    closeModal: () => { },
});

export const useTransactionModal = () => useContext(TransactionModalContext);

export const TransactionModalProvider = ({ children }: { children: ReactNode }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [initialData, setInitialData] = useState<TransactionInitialData | null>(null);

    const openModal = (data?: TransactionInitialData) => {
        console.log('[TransactionModalContext] Opening modal with data:', data);
        setInitialData(data || null);
        setIsVisible(true);
    };

    const closeModal = () => {
        console.log('[TransactionModalContext] Closing modal');
        setIsVisible(false);
        setInitialData(null);
    };

    return (
        <TransactionModalContext.Provider value={{ isVisible, initialData, openModal, closeModal }}>
            {children}
        </TransactionModalContext.Provider>
    );
};
