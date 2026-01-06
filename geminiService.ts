
import { GoogleGenAI } from "@google/genai";

const extractJson = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      return JSON.parse(cleaned.substring(startIdx, endIdx + 1));
    }
    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) {
       return JSON.parse(cleaned.substring(arrayStart, arrayEnd + 1));
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao parsear JSON da IA:", e, "Texto original:", text);
    throw new Error("Resposta da IA em formato inválido. Tente novamente.");
  }
};

export const analyzeBio = async (niche?: string | null, imageB64?: string | null, instagramHandle?: string, lang: 'pt' | 'en' = 'pt', useDeepSearch: boolean = true) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const languageInstruction = lang === 'en' 
    ? "Response MUST be in English." 
    : "A resposta DEVE ser em Português do Brasil.";

  const nicheInstruction = niche 
    ? `specialized in ${niche}.` 
    : `identify the lawyer's specialization niche based on the provided profile info.`;

  const systemPrompt = `You are the world's leading Instagram expert for the legal niche. 
  Your task is to analyze the Instagram profile ${instagramHandle ? `@${instagramHandle}` : 'provided in the image'}.
  
  Instructions:
  1. ANALYZE the current state: What is working? What is missing? Is the niche clear?
  2. PROVIDE feedback: Give a diagnostic of the current bio lines.
  3. OPTIMIZE: Suggest the best possible version to maximize client conversion.
  
  Character Limits:
  ● Name: Max 64 characters (Keywords for SEO).
  ● Bio: Max 150 characters, split into 4 lines.

  ${nicheInstruction}
  ${languageInstruction}

  Return EXCLUSIVELY a JSON object:
  {
    "nome": { "status": "string", "analise": "string", "sugestao": "string" },
    "primeiraLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "segundaLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "terceiraLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "quartaLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "recomendacoesGerais": ["string"]
  }`;

  let contents: any;
  if (imageB64) {
    contents = {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] } },
        { text: systemPrompt }
      ]
    };
  } else {
    contents = { parts: [{ text: systemPrompt }] };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: contents,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }]
    }
  });

  return extractJson(response.text || '{}');
};

export const generateHooks = async (niche: string, lang: 'pt' | 'en' = 'pt') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Act as a content marketing expert for lawyers. Generate a list of 30 high-conversion Instagram hooks for ${niche}. Return as JSON array of objects: { "text": "hook", "category": "dor/desejo/curiosidade" }
  ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return extractJson(response.text || '[]');
};

export const generateReelsScripts = async (niche: string, lang: 'pt' | 'en' = 'pt', count: number = 10) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Create ${count} highly engaging Reels scripts for ${niche}. Return as JSON array of objects: { "titulo": "...", "visaoGeral": "...", "hook": "...", "conteudoPrincipal": "...", "cta": "..." }
  ${lang === 'en' ? 'In English.' : 'Em Português.'}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return extractJson(response.text || '[]');
};
