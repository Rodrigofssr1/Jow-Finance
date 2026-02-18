import React, { createContext, useContext, useState, useEffect } from 'react';
import { AIContextAnalyzer, AIResponse, AIAnalysisRequest } from '../services/ai/AIContextAnalyzer';
import { JowMentorPopup } from '../components/ai/JowMentorPopup';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface JowMentorContextData {
    analyzeAction: (type: AIAnalysisRequest['type'], data: any) => Promise<void>;
    showMentorMessage: (response: AIResponse) => void;
    hideMentor: () => void;
}

const JowMentorContext = createContext<JowMentorContextData>({} as JowMentorContextData);

export function JowMentorProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [popupVisible, setPopupVisible] = useState(false);
    const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Fetch user profile context on mount
    useEffect(() => {
        if (user) {
            fetchUserProfile();
        }
    }, [user]);

    const fetchUserProfile = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('monthly_income, financial_goal, risk_profile') // total_assets removed as it is not in profiles table
            .eq('id', user?.id)
            .single();

        if (data) {
            setUserProfile(data);
        }
    };

    const analyzeAction = async (type: AIAnalysisRequest['type'], data: any) => {
        if (!user || !userProfile) return;

        // Construct UserContext from profile + calculated totals if needed
        // For MVP, we use the profile data. ideally we would aggregate assets/debts here too.
        const context = {
            monthlyIncome: userProfile.monthly_income,
            financialGoal: userProfile.financial_goal,
            riskProfile: userProfile.risk_profile,
            // ToDo: Implement real-time aggregation of assets/debts for precise context
            totalAssets: 0,
            totalDebts: 0
        };

        const response = await AIContextAnalyzer.analyze({
            type,
            data,
            userContext: context
        });

        if (response && response.isRelevant) {
            showMentorMessage(response);
        }
    };

    const showMentorMessage = (response: AIResponse) => {
        setAiResponse(response);
        setPopupVisible(true);
    };

    const hideMentor = () => {
        setPopupVisible(false);
    };

    return (
        <JowMentorContext.Provider value={{ analyzeAction, showMentorMessage, hideMentor }}>
            {children}
            <JowMentorPopup
                visible={popupVisible}
                data={aiResponse}
                onDismiss={hideMentor}
            />
        </JowMentorContext.Provider>
    );
}

export const useJowMentor = () => useContext(JowMentorContext);
