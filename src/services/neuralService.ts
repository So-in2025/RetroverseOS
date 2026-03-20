import { apiPoolService } from './apiPoolService';
import { fingerprintService } from './fingerprintService';
import { proxyService } from './proxyService';

export interface NeuralResponse {
  text: string;
  error?: string;
  nodeUsed?: string;
  proxyUsed?: string;
  latency: number;
}

class NeuralService {
  private readonly MODEL = 'gemini-3-flash-preview';
  private readonly BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

  async generateTacticalAdvice(imageBase64: string, retryCount = 0): Promise<NeuralResponse> {
    const start = Date.now();
    const key = await apiPoolService.getNextKey();
    if (!key) throw new Error('NO_NODES_AVAILABLE');

    const fingerprint = fingerprintService.generateRandom();
    const proxy = await proxyService.getBestProxy();
    const headers = fingerprintService.getHeaders(fingerprint);
    
    const targetUrl = `${this.BASE_URL}${this.MODEL}:generateContent?key=${key}`;
    const finalUrl = proxy ? proxyService.wrapUrl(targetUrl, proxy) : targetUrl;

    const payload = {
      contents: [
        {
          parts: [
            { text: "Eres una IA táctica de combate. Analiza esta captura de pantalla de un videojuego retro y da un consejo estratégico corto (máximo 15 palabras) para el jugador. Sé directo, técnico y un poco futurista. Responde en español." },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 100
      }
    };

    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          await apiPoolService.markExhausted(key);
          if (retryCount < 3) return this.generateTacticalAdvice(imageBase64, retryCount + 1);
        }
        if (proxy) await proxyService.markFailed(proxy.url);
        throw new Error(errorData.error?.message || 'API_ERROR');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ANÁLISIS FALLIDO';

      return {
        text,
        nodeUsed: key.substring(0, 8) + '...',
        proxyUsed: proxy?.url || 'DIRECT',
        latency: Date.now() - start
      };
    } catch (error: any) {
      if (proxy) await proxyService.markFailed(proxy.url);
      if (retryCount < 3) return this.generateTacticalAdvice(imageBase64, retryCount + 1);
      throw error;
    }
  }
}

export const neuralService = new NeuralService();
