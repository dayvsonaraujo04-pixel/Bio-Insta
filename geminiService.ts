
import { GoogleGenAI } from "@google/genai";
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

export const analyzeBio = async (niche?: string | null, imageB64?: string | null, instagramHandle?: string, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const languageInstruction = lang === 'en' ? "Response MUST be in English." : "A resposta DEVE ser em Português do Brasil.";
    const nicheInstruction = niche ? `specialized in ${niche}.` : `identify the lawyer's specialization niche based on the provided profile info.`;

    const systemPrompt = `You are the world's leading Instagram expert for the legal niche. 
    Analyze the profile: ${instagramHandle ? `@${instagramHandle}` : 'from the image'}.
    1. DIAGNOSE: What's working/missing? 2. OPTIMIZE: Suggest better versions.
    Name: Max 64 chars. Bio: Max 150 chars, 4 lines.
    ${nicheInstruction} ${languageInstruction}
    Return ONLY JSON:
    {
      "nome": { "status": "string", "analise": "string", "sugestao": "string" },
      "primeiraLinha": { "status": "string", "analise": "string", "sugestao": "string" },
      "segundaLinha": { "status": "string", "analise": "string", "sugestao": "string" },
      "terceiraLinha": { "status": "string", "analise": "string", "sugestao": "string" },
      "quartaLinha": { "status": "string", "analise": "string", "sugestao": "string" },
      "recomendacoesGerais": ["string"]
    }`;

    let contents: any = imageB64 
      ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] } }, { text: systemPrompt }] }
      : { parts: [{ text: systemPrompt }] };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: { responseMimeType: "application/json" }
    });
    return extractJson(response.text || '{}');
  });
};

const buildContext = (audit: BioAuditResult | null) => {
  if (!audit) return "";
  return `Context based on recent Bio audit:
  - Main Value: ${audit.primeiraLinha.sugestao}
  - Authority: ${audit.segundaLinha.sugestao}
  - Social Proof: ${audit.terceiraLinha.sugestao}
  - CTA: ${audit.quartaLinha.sugestao}`;
};

export const generateHooks = async (niche: string, auditContext: BioAuditResult | null, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Act as a content marketing expert for lawyers. Generate 30 high-conversion Instagram hooks for ${niche}.
    ${buildContext(auditContext)}
    Return ONLY a JSON array of objects: [ { "text": "...", "category": "dor/desejo/curiosidade" } ]
    ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return extractJson(response.text || '[]');
  });
};

export const generateReelsScripts = async (niche: string, auditContext: BioAuditResult | null, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create 10 highly engaging Reels scripts for ${niche}.
    ${buildContext(auditContext)}
    Return ONLY JSON array: [ { "titulo": "...", "visaoGeral": "...", "hook": "...", "conteudoPrincipal": "...", "cta": "..." } ]
    ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return extractJson(response.text || '[]');
  });
};

export const generateAuthorityPosts = async (niche: string, auditContext: BioAuditResult | null, lang: 'pt' | 'en' = 'pt') => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Create 10 authority-building Instagram post ideas for ${niche}.
    ${buildContext(auditContext)}
    Return ONLY JSON array: [ { "titulo": "...", "conteudo": "...", "objetivo": "..." } ]
    ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return extractJson(response.text || '[]');
  });
};
