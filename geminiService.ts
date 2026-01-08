
import { GoogleGenAI, Type } from "@google/genai";
import { BioAuditResult } from "./types";

const MAX_RETRIES = 5;
const INITIAL_DELAY = 2000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = INITIAL_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message?.toLowerCase() || "";
    const isQuotaError = 
      errorMsg.includes("429") || 
      errorMsg.includes("resource_exhausted") || 
      errorMsg.includes("quota") || 
      errorMsg.includes("rate limit");
    
    if (retries > 0 && isQuotaError) {
      console.warn(`[Quota] Limite atingido. Tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2 + Math.random() * 500);
    }
    throw error;
  }
}

const extractJson = (text: string) => {
  if (!text) return null;
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (initialError) {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = cleaned.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = cleaned.lastIndexOf(']');
    }
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (substringError) {
        console.error("Falha ao parsear candidato a JSON extraído:", substringError);
      }
    }
    throw new Error("Resposta da IA em formato inválido. Tente novamente.");
  }
};

// Fix: Define response schemas for each API call to ensure structured JSON output.
const bioResponseSchema = {
    type: Type.OBJECT,
    properties: {
        nome: { type: Type.OBJECT, properties: { status: { type: Type.STRING }, analise: { type: Type.STRING }, sugestao: { type: Type.STRING } }, required: ['status', 'analise', 'sugestao'] },
        primeiraLinha: { type: Type.OBJECT, properties: { status: { type: Type.STRING }, analise: { type: Type.STRING }, sugestao: { type: Type.STRING } }, required: ['status', 'analise', 'sugestao'] },
        segundaLinha: { type: Type.OBJECT, properties: { status: { type: Type.STRING }, analise: { type: Type.STRING }, sugestao: { type: Type.STRING } }, required: ['status', 'analise', 'sugestao'] },
        terceiraLinha: { type: Type.OBJECT, properties: { status: { type: Type.STRING }, analise: { type: Type.STRING }, sugestao: { type: Type.STRING } }, required: ['status', 'analise', 'sugestao'] },
        quartaLinha: { type: Type.OBJECT, properties: { status: { type: Type.STRING }, analise: { type: Type.STRING }, sugestao: { type: Type.STRING } }, required: ['status', 'analise', 'sugestao'] },
        recomendacoesGerais: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
};

const hooksResponseSchema = {
    type: Type.ARRAY,
    items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, category: { type: Type.STRING } }, required: ['text', 'category'] }
};

const reelsScriptsResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            titulo: { type: Type.STRING },
            visaoGeral: { type: Type.STRING },
            hook: { type: Type.STRING },
            conteudoPrincipal: { type: Type.STRING },
            cta: { type: Type.STRING }
        },
        required: ['titulo', 'visaoGeral', 'hook', 'conteudoPrincipal', 'cta']
    }
};

const authorityPostsResponseSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            titulo: { type: Type.STRING },
            conteudo: { type: Type.STRING },
            objetivo: { type: Type.STRING }
        },
        required: ['titulo', 'conteudo', 'objetivo']
    }
};

export const analyzeBio = async (niche?: string | null, imageB64?: string | null, instagramHandle?: string, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const languageInstruction = lang === 'en' ? "Response MUST be in English." : "A resposta DEVE ser em Português do Brasil.";
    const nicheInstruction = niche ? `specialized in ${niche}.` : `identify the lawyer's specialization niche based on the provided profile info.`;

    // Fix: Simplified prompt, as the JSON structure is now defined in the responseSchema.
    const systemPrompt = `You are the world's leading Instagram expert for the legal niche. 
    Analyze the profile: ${instagramHandle ? `@${instagramHandle}` : 'from the image'}.
    1. DIAGNOSE: What's working/missing? 2. OPTIMIZE: Suggest better versions.
    Name: Max 64 chars. Bio: Max 150 chars, 4 lines.
    ${nicheInstruction} ${languageInstruction}
    Return the analysis in the specified JSON format.`;

    let contents: any = imageB64 
      ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] } }, { text: systemPrompt }] }
      : { parts: [{ text: systemPrompt }] };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      // Fix: Use responseSchema to enforce JSON output structure.
      config: { 
        responseMimeType: "application/json",
        responseSchema: bioResponseSchema 
      }
    });
    return extractJson(response.text || '{}');
  });
};

const buildContext = (audit: BioAuditResult | null) => {
  if (!audit) return "";
  return `Context based on recent Bio audit:
  - Main Value: ${audit.primeiraLinha?.sugestao || ''}
  - Authority: ${audit.segundaLinha?.sugestao || ''}
  - Social Proof: ${audit.terceiraLinha?.sugestao || ''}
  - CTA: ${audit.quartaLinha?.sugestao || ''}`;
};

export const generateHooks = async (niche: string, auditContext: BioAuditResult | null, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Fix: Simplified prompt, as the JSON structure is now defined in the responseSchema.
    const prompt = `Act as a content marketing expert for lawyers. Generate 30 high-conversion Instagram hooks for ${niche}.
    ${buildContext(auditContext)}
    The hook category should be one of "dor", "desejo", or "curiosidade".
    ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      // Fix: Use responseSchema to enforce JSON output structure.
      config: { 
        responseMimeType: "application/json",
        responseSchema: hooksResponseSchema
      }
    });
    return extractJson(response.text || '[]');
  });
};

export const generateReelsScripts = async (niche: string, auditContext: BioAuditResult | null, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Fix: Simplified prompt, as the JSON structure is now defined in the responseSchema.
    const prompt = `Create 10 highly engaging Reels scripts for ${niche}.
    ${buildContext(auditContext)}
    ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      // Fix: Use responseSchema to enforce JSON output structure.
      config: { 
        responseMimeType: "application/json",
        responseSchema: reelsScriptsResponseSchema
      }
    });
    return extractJson(response.text || '[]');
  });
};

export const generateAuthorityPosts = async (niche: string, auditContext: BioAuditResult | null, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Fix: Simplified prompt, as the JSON structure is now defined in the responseSchema.
    const prompt = `Create 10 authority-building Instagram post ideas for ${niche}.
    ${buildContext(auditContext)}
    ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      // Fix: Use responseSchema to enforce JSON output structure.
      config: { 
        responseMimeType: "application/json",
        responseSchema: authorityPostsResponseSchema
      }
    });
    return extractJson(response.text || '[]');
  });
};
