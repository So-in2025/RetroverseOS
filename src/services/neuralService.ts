import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { apiPoolService } from './apiPoolService';
import { economyService } from './economyService';

export interface NeuralResponse {
  text: string;
  error?: string;
  nodeUsed?: string;
  latency: number;
}

class NeuralService {
  private readonly MODEL = 'gemini-3-flash-preview';

  async generateContent(prompt: string, options: { jsonMode?: boolean, schema?: any } = {}): Promise<string> {
    const key = await apiPoolService.getNextKey();
    if (!key) throw new Error('NO_NODES_AVAILABLE');

    const ai = new GoogleGenAI({ apiKey: key });
    
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: this.MODEL,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
          responseMimeType: options.jsonMode ? "application/json" : "text/plain",
          responseSchema: options.schema,
        },
      });

      return response.text || '';
    } catch (error: any) {
      if (error.message?.includes('429')) {
        await apiPoolService.markExhausted(key);
      }
      throw error;
    }
  }

  async generateTacticalAdvice(imageBase64: string, gameId?: string, retryCount = 0): Promise<NeuralResponse> {
    const start = Date.now();
    
    // STRICT BYOK ENFORCEMENT: Do not use the platform pool for individual coaching
    const key = localStorage.getItem('retroos_gemini_key');
    if (!key || !key.startsWith('AIza')) {
      throw new Error('BYOK_REQUIRED');
    }

    const ai = new GoogleGenAI({ apiKey: key });

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: this.MODEL,
        contents: {
          parts: [
            { text: "Eres una IA táctica de combate. Analiza esta captura de pantalla de un videojuego retro y da un consejo estratégico corto (máximo 15 palabras) para el jugador. Sé directo, técnico y un poco futurista. Responde en español." },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
          ]
        },
        config: {
          temperature: 0.9,
          topP: 0.95,
          topK: 64,
        },
      });

      const text = response.text || 'ANÁLISIS FALLIDO';

      // Save to history if gameId is provided
      if (gameId && text !== 'ANÁLISIS FALLIDO') {
        import('./aiCoachHistoryService').then(({ aiCoachHistory }) => {
          aiCoachHistory.addAdvice(gameId, text, imageBase64);
        });
      }

      return {
        text,
        nodeUsed: key.substring(0, 8) + '...',
        latency: Date.now() - start
      };
    } catch (error: any) {
      if (error.message?.includes('429')) {
        // If BYOK key is exhausted, we just throw, we don't mark the platform pool
        throw new Error('BYOK_EXHAUSTED');
      }
      throw error;
    }
  }
}

export const neuralService = new NeuralService();
