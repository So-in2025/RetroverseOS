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

  async generateTacticalAdvice(imageBase64: string, retryCount = 0): Promise<NeuralResponse> {
    const start = Date.now();
    const key = await apiPoolService.getNextKey();
    if (!key) throw new Error('NO_NODES_AVAILABLE');

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

      return {
        text,
        nodeUsed: key.substring(0, 8) + '...',
        latency: Date.now() - start
      };
    } catch (error: any) {
      if (error.message?.includes('429')) {
        await apiPoolService.markExhausted(key);
        if (retryCount < 3) return this.generateTacticalAdvice(imageBase64, retryCount + 1);
      }
      throw error;
    }
  }
}

export const neuralService = new NeuralService();
