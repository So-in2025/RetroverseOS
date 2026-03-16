import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";

const SYSTEM_INSTRUCTION = `
Eres el Estratega de Combate del Dominion Engine. 
Analiza el frame del juego y entrega una instrucción táctica corta, agresiva y competitiva para mejorar el desempeño del jugador en este milisegundo.
`;

export class AICoachingService {
  private modelId = "gemini-3.1-flash-lite-preview"; 
  private historyKey = "dominion_coach_history";
  private _ai: GoogleGenAI | null = null;

  constructor() {}

  private get ai(): GoogleGenAI {
    if (!this._ai) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      this._ai = new GoogleGenAI({ apiKey: key });
    }
    return this._ai;
  }

  async getGameTips(gameId: string, gameTitle: string): Promise<string> {
    try {
      // 1. Check Global Cache
      const cacheRes = await fetch(`/api/tips/ai/${gameId}`);
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.cached && cacheData.content) {
          return cacheData.content;
        }
      }

      // 2. Generate with Gemini if not cached
      const response = await this.ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Eres un experto historiador y estratega de videojuegos retro. 
        Para el juego "${gameTitle}", proporciona la siguiente información en formato Markdown:
        
        ### 📜 HISTORIA Y CURIOSIDADES
        (Breve historia del desarrollo, impacto cultural y datos curiosos)
        
        ### 🎮 GUÍA RÁPIDA Y CONTROLES
        (Cómo jugar y qué esperar)
        
        ### 💡 CONSEJOS AVANZADOS
        (Estrategias para expertos)
        
        ### 🔓 TRUCOS Y SECRETOS
        (Códigos conocidos, easter eggs y glitches útiles)
        
        Sé conciso, directo y usa un tono profesional pero apasionado.`,
        config: {
          temperature: 0.7,
        },
      });

      const tips = response.text || "No tips available.";

      // 3. Save to Global Cache
      await fetch(`/api/tips/ai/${gameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tips })
      });

      return tips;
    } catch (error) {
      console.error("AI Tips Error:", error);
      return "Error retrieving tips. Please try again later.";
    }
  }

  async analyzeFrame(canvas: HTMLCanvasElement, gameTitle: string = "this game"): Promise<string> {
    try {
      const base64Image = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: `Como estratega experto, analiza esta captura de ${gameTitle} y dame una ventaja competitiva inmediata.`,
            },
          ],
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const advice = response.text || "No advice available.";
      this.saveToHistory(advice);
      
      // Auto-speak if enabled
      const ttsEnabled = await storage.getSetting('coach_tts_enabled');
      if (ttsEnabled !== false) { // Default true
        const voice = await storage.getSetting('coach_voice') || 'Kore';
        this.speak(advice, voice);
      }

      return advice;
    } catch (error) {
      console.error("AI Coaching Error:", error);
      return "Systems offline. Focus on the game.";
    }
  }

  async speak(text: string, voiceName: string = 'Kore') {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Simulate different personalities using pitch and rate
    switch (voiceName) {
      case 'Zephyr': // Tactical Commander
        utterance.pitch = 0.8;
        utterance.rate = 1.1;
        break;
      case 'Fenrir': // Zenith AI
        utterance.pitch = 0.5;
        utterance.rate = 0.9;
        break;
      case 'Kore': // Default
      default:
        utterance.pitch = 1.2;
        utterance.rate = 1.2;
        break;
    }

    // Try to find an English or Spanish voice depending on the text
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('es')) || voices.find(v => v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  private saveToHistory(text: string) {
    const history = this.getHistory();
    const newEntry = {
      id: Date.now(),
      text,
      timestamp: new Date().toISOString(),
      type: this.classifyAdvice(text)
    };
    
    // Keep last 20 entries
    const updatedHistory = [newEntry, ...history].slice(0, 20);
    localStorage.setItem(this.historyKey, JSON.stringify(updatedHistory));
  }

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.historyKey) || "[]");
    } catch {
      return [];
    }
  }

  private classifyAdvice(text: string): 'STRENGTH' | 'WEAKNESS' | 'FOCUS' {
    const lower = text.toLowerCase();
    if (lower.includes('good') || lower.includes('great') || lower.includes('excellent')) return 'STRENGTH';
    if (lower.includes('avoid') || lower.includes('don\'t') || lower.includes('careful')) return 'WEAKNESS';
    return 'FOCUS';
  }
}

export const aiCoach = new AICoachingService();
