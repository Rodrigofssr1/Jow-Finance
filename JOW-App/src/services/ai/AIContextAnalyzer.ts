import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `Você é o JOW, um mentor financeiro pessoal, amigável e educativo.
    Sua missão é analisar registros financeiros e dar conselhos IMEDIATOS, CURTOS e ÚTEIS.
    
    Tones:
    - Informativo: Para dados neutros.
    - Alerta: Para riscos (juros altos, gastos excessivos).
    - Comemorativo: Para conquistas (investimentos, quitar dívidas).
    - Educativo: Para ensinar conceitos (liquidez, juros compostos).

    Output JSON obrigatório:
    {
        "isRelevant": boolean (se vale a pena mostrar popup),
        "type": "info" | "warning" | "success" | "tip",
        "title": "Título curto com emoji",
        "message": "Mensagem direta de 1 ou 2 frases.",
        "suggestion": "Uma ação prática para agora.",
        "tip": "Uma dica educativa rápida (opcional)."
    }

    NÃO USE MARKDOWN. APENAS JSON.
    `
});

export interface UserContext {
    monthlyIncome?: number;
    totalAssets?: number;
    totalDebts?: number;
    financialGoal?: string;
    riskProfile?: 'conservative' | 'moderate' | 'aggressive';
}

export type AnalysisType = 'transaction' | 'asset' | 'debt' | 'investment' | 'income' | 'INSTALLMENT_PURCHASE';

export interface AIAnalysisRequest {
    type: AnalysisType;
    data: any;
    userContext: UserContext;
}

export interface AIResponse {
    isRelevant: boolean;
    type: 'info' | 'warning' | 'success' | 'tip';
    title: string;
    message: string;
    suggestion: string;
    tip?: string;
}

export const AIContextAnalyzer = {
    async analyze(request: AIAnalysisRequest): Promise<AIResponse | null> {
        try {
            const prompt = `
            CONTEXTO DO USUÁRIO:
            - Renda Mensal: R$ ${request.userContext.monthlyIncome || 'Não informada'}
            - Patrimônio: R$ ${request.userContext.totalAssets || 0}
            - Dívidas: R$ ${request.userContext.totalDebts || 0}
            - Objetivo: ${request.userContext.financialGoal || 'Não definido'}
            - Perfil: ${request.userContext.riskProfile || 'Moderado'}

            NOVO REGISTRO:
            Tipo: ${request.type}
            Dados: ${JSON.stringify(request.data)}

            Analise este registro frente ao contexto.
            Se for uma despesa > 30% da renda, ALERTE.
            Se for um investimento, COMEMORE.
            Se for dívida com juros altos (>5%), ALERTE.
            Se for gasto trivial, dê uma DICA.
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);

            return data;
        } catch (error) {
            console.error('Jow Mentor Analysis Failed:', error);
            return null;
        }
    }
};
