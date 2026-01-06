
import { GoogleGenAI, Type } from "@google/genai";

const extractJson = (text: string) => {
  try {
    // Remove possíveis blocos de código markdown
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Erro ao parsear JSON da IA:", e);
    // Tenta encontrar algo que pareça um objeto JSON se o parse direto falhar
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Resposta da IA não contém um JSON válido.");
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

  let contents: any;
  
  const systemPrompt = `You are the world's leading Instagram expert for the legal niche. 
  Your task is to analyze the Instagram profile ${instagramHandle ? `@${instagramHandle}` : 'provided in the image'} EXACTLY as it is at this current moment.
  
  CRITICAL: If an instagram handle is provided, you MUST use Google Search to find the live profile on Instagram.com, read the current bio, profile name, and check the most recent context.
  
  Instructions:
  1. ANALYZE the current state: What is working? What is missing? Is the niche clear?
  2. PROVIDE feedback: Give a diagnostic of the current bio lines.
  3. OPTIMIZE: Suggest the best possible version to maximize client conversion.
  
  Character Limits:
  ● Name: Max 64 characters (Keywords for SEO).
  ● Bio: Max 150 characters, split into 4 lines.

  ${nicheInstruction}
  
  ${languageInstruction}

  Return EXCLUSIVELY a JSON object following this schema:
  {
    "nome": { "status": "string", "analise": "string", "sugestao": "string" },
    "primeiraLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "segundaLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "terceiraLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "quartaLinha": { "status": "string", "analise": "string", "sugestao": "string" },
    "recomendacoesGerais": ["string"]
  }`;

  if (imageB64) {
    contents = {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] } },
        { text: systemPrompt }
      ]
    };
  } else {
    contents = systemPrompt;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  const languageInstruction = lang === 'en' 
    ? "Generate content in English." 
    : "Gere o conteúdo em Português do Brasil.";

  const prompt = `Act as a content marketing expert. Generate a list of 30 attractive Instagram hooks adapted for an audience needing to understand their rights in ${niche}. Return as JSON array of objects: { "text": "hook", "category": "dor/desejo/curiosidade" }
  ${languageInstruction}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return extractJson(response.text || '[]');
};

export const generateReelsScripts = async (niche: string, lang: 'pt' | 'en' = 'pt', count: number = 10) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const languageInstruction = lang === 'en' 
    ? "Generate scripts in English." 
    : "Gere os roteiros em Português do Brasil.";

  const prompt = `Create ${count} Reels scripts for ${niche}. Return as JSON array of objects: { "titulo": "...", "visaoGeral": "...", "hook": "...", "conteudoPrincipal": "...", "cta": "..." }
  ${languageInstruction}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return extractJson(response.text || '[]');
};
