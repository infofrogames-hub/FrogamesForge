
import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

export const generateShopifyHtml = async (
  imageB64: string,
  text1: string,
  text2: string,
  bggInfo: string
): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = imageB64.split(',')[1] || imageB64;

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Data,
    },
  };

  const prompt = `
    Agisci come Master Copywriter SEO e Lead UI Designer. 
    Analizza i colori della scatola nell'immagine e il tema del gioco: ${bggInfo}. 
    Crea una descrizione Shopify professionale per FroGames.

    REGOLE DI DESIGN E CONTRASTO (MANDATORIE):
    1. ANALISI COLORI: Identifica i colori dominanti della scatola e crea un gradiente di sfondo armonioso.
    2. TESTO BIANCO: Ogni singolo carattere nei blocchi HTML deve avere color: #FFFFFF !important;.
    3. TITOLI ANTI-TAGLIO (H1 e H2): Usa "font-size: clamp(22px, 5.5vw, 46px); line-height: 1.2; word-break: keep-all; overflow-wrap: break-word; text-align: center; font-weight: 900; text-transform: uppercase; text-shadow: 3px 3px 10px rgba(0,0,0,0.8); margin-bottom: 30px; width: 100%;" per evitare che parole come "OLIMPO" vengano spezzate a metà.
    4. GRID CENTRATO MOBILE: Per le griglie in html1 e html2, usa: 
       "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; width: 100%; justify-content: center; justify-items: center; margin: 30px auto;"
       Assicurati che le card siano perfettamente centrate quando si impilano su mobile.
    5. CARD STYLE: Sfondo rgba(255,255,255,0.1), border: 1px solid rgba(255,255,255,0.3), padding: 25px, border-radius: 20px, width: 100%; max-width: 340px; text-align: center;.

    STRUTTURA CONTENUTO:
    - HTML1 (ATMOSFERA): Nome Gioco (H1 anti-taglio) -> Introduzione SEO profonda (4-5 paragrafi) -> Grid responsiva CENTRATA (4 card emozionali) -> FRASE FINALE EPICA (box bordato bianco).
    - HTML2 (TECNICA): TITOLO TEMATICO basato sul gioco (H2 anti-taglio) -> Descrizione tecnica approfondita -> CITAZIONE CENTRALE GIGANTE -> Grid responsiva CENTRATA (ESATTAMENTE 6 card tecniche: Strategia, Combo, Profondità, Flusso, Bilanciamento, Decisioni) -> SECONDA FRASE FINALE EPICA.
    - HTML3 (COME SI GIOCA): Deve essere puro TESTO (Plain Text). NON USARE TAG HTML. 
      Usa titoli in MAIUSCOLO per le sezioni principali. Per i grassetti usa i doppi asterischi (**testo**) in stile Markdown. Lascia spazi vuoti tra i paragrafi per la leggibilità. Deve essere pronto per un copia-incolla testuale pulito.

    SEO:
    - seoTitle: [Nome Gioco] - Strategia Avanzata | FroGames.
    - metaDescription: Focus su profondità, rigiocabilità e sfida strategica.

    RISPOSTA: Solo JSON con "html1", "html2", "html3", "seoTitle", "metaDescription".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            html1: { type: Type.STRING },
            html2: { type: Type.STRING },
            html3: { type: Type.STRING },
            seoTitle: { type: Type.STRING },
            metaDescription: { type: Type.STRING },
          },
          required: ["html1", "html2", "html3", "seoTitle", "metaDescription"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Errore generazione");
    return JSON.parse(textOutput);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Errore durante la creazione della descrizione. Riprova.");
  }
};
