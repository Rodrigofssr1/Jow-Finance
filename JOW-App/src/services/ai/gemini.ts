import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa a API do Gemini
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
console.log('Gemini API Key Loaded:', !!apiKey, 'Length:', apiKey?.length);
const genAI = new GoogleGenerativeAI(apiKey || '');

const systemInstruction = `Você é o JOW, um mentor financeiro proativo e inteligente.
Seu objetivo é não apenas extrair dados, mas ENTENDER A INTENÇÃO e analisar o CONTEXTO do usuário para oferecer a MELHOR AÇÃO.

Retorne APENAS um objeto JSON válido.

### ESTRUTURA DE RESPOSTA (JSON):
{
  "scanned": { // Dados extraídos da mensagem
    "intent": "expense" | "income" | "investment" | "question" | "asset_creation" | "debt_creation" | "jewelry_acquisition" | "credit_card_expense" | "bill_payment",
    "amount": number | null,
    "category": string | null,
    "description": string | null,
    "date": "YYYY-MM-DD" | null,
    "asset_type_reference": "vehicle" | "real_estate" | "jewelry" | "loan" | "financing" | null,
    "creditor": string | null, // Para dívidas/bancos
    "installments": number | null // Para compras parceladas (ex: 3x)
  },
  "automation": { // Ação sugerida para o sistema
    "type": "register_transaction" | "open_modal" | "reply" | "search_asset" | "suggest_debt" | "suggest_jewelry" | "check_credit_card",
    "params": object // Parâmetros para a ação
  },
  "bens_relacionados": ["carro", "moto", "casa", "apartamento", "joia"]
}

### REGRAS DE EXTRAÇÃO DE VALOR (CRÍTICO):
- Se o usuário disser "15000" ou "15 mil", o valor é 15000.
- NÃO confunda horario (16:00) com valor.
- Priorize números após "de", "valor", "R$".
- Exemplo: "Empréstimo de 15000" -> amount: 15000

### REGRAS DE INTELIGÊNCIA CONTEXTUAL:

1. **Cartões de Crédito (Compras e Faturas):**
   - Palavras-chave: "cartão", "credito", "fatura", "parcelado", "nubank", "itaucard", "visa", "mastercard".
   - **Compra:** "Gasolina 200 no cartão", "Comprei tv em 10x".
     - Intent: "credit_card_expense"
     - Action: "check_credit_card"
     - Extract: installments (se houver "3x", "3 vezes", "parcelado em 3").
   - **Pagamento de Fatura:** "Paguei a fatura do Nubank", "Fatura paga".
     - Intent: "bill_payment"
     - Action: "register_transaction" (Saída do saldo agora)

2. **Dívidas (Empréstimos e Financiamentos):**
   - Palavras-chave: "emprestimo", "peguei emprestado", "financiamento", "financiei", "divida".
   - Intent: "debt_creation"
   - Action: "suggest_debt"

3. **Joias e Itens de Valor (Patrimônio):**
   - Palavras-chave: "joia", "anel", "colar", "pulseira", "relogio" (se valor > 1000), "ouro".
   - Intent: "jewelry_acquisition"
   - Action: "suggest_jewelry"

4. **Gasto com Veículo/Imóvel (Contexto):**
   - "Gasolina", "IPVA" -> verifica "vehicle"
   - "Condomínio", "IPTU" -> verifica "real_estate"

### EXEMPLOS:
- "Gasolina 200 no cartão":
  {
    "scanned": { "intent": "credit_card_expense", "amount": 200, "description": "Gasolina", "category": "transporte", "installments": 1 },
    "automation": { "type": "check_credit_card", "params": { "amount": 200, "description": "Gasolina" } }
  }
- "Comprei celular em 10x de 300":
  {
    "scanned": { "intent": "credit_card_expense", "amount": 3000, "description": "Celular", "installments": 10 },
    "automation": { "type": "check_credit_card", "params": { "amount": 3000, "installments": 10 } }
  }
- "Paguei a fatura do Nubank 1500":
  {
     "scanned": { "intent": "bill_payment", "amount": 1500, "description": "Fatura Nubank", "category": "credit_card_bill" },
     "automation": { "type": "register_transaction", "params": { "amount": 1500, "category": "credit_card_bill", "type": "expense" } }
  }
`;

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: systemInstruction,
  generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
});

export type AIActionType = 'register_transaction' | 'open_modal' | 'reply' | 'search_asset' | 'suggest_debt' | 'suggest_jewelry' | 'check_credit_card';

export type AIResponseData = {
  scanned: {
    intent: string; // Updated to match any string for flexbility with new types
    amount?: number;
    category?: string;
    description?: string;
    date?: string;
    asset_type_reference?: 'vehicle' | 'real_estate' | 'jewelry' | 'loan' | 'financing' | null;
    creditor?: string;
    installments?: number;
    payment_method?: 'credit' | 'debit' | 'cash' | 'pix';
    card_id?: string;
  };
  automation: {
    type: AIActionType;
    params: any;
  };
  suggestions?: {
    label: string;
    action: string;
    params?: any;
  }[];
  message?: string; // Mensagem de resposta direta do Jow (opcional)
};

export const GeminiService = {
  async processMessage(userMessage: string): Promise<AIResponseData | null> {
    try {
      console.log('--- GEMINI REQUEST ---');
      console.log('User Message:', userMessage);

      const result = await model.generateContent(userMessage);
      const response = await result.response;
      const text = response.text();

      console.log('--- GEMINI RESPONSE RAW ---');
      console.log(text);

      // Limpeza de markdown caso o modelo teime em enviar
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

      console.log('--- JSON CLEANED ---');
      console.log(cleanJson);

      if (!cleanJson || cleanJson === 'null') return null;

      const data = JSON.parse(cleanJson);

      console.log('--- PARSED DATA ---');
      console.log(data);

      return data as AIResponseData;

    } catch (error) {
      console.error('ERRO GEMINI SERVICE:', error);
      return null;
    }
  }
};
