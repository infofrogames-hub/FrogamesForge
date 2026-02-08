import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

export const generateShopifyHtml = async (
  imageB64: string,
  text1: string,
  text2: string,
  bggInfo: string
): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const base64Data = imageB64.split(",")[1] || imageB64;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Data,
    },
  };

  const prompt = `
Agisci come Master Copywriter SEO e Lead UI Designer per FroGames.
Analizza i colori della scatola nell'immagine e il tema del gioco: ${bggInfo}.
Crea una descrizione Shopify premium, mobile-first, SEO forte, con layout moderno.

RISPOSTA: SOLO JSON con:
html1, html2, html3, seoTitle, metaDescription

------------------------------------------------
VALIDAZIONE OUTPUT (MANDATORIA)
------------------------------------------------
Se html1 o html2 NON contengono:
- <section id="fg-
- </style>
- .fg-grid con @media

DEVI rigenerare internamente prima di rispondere.

------------------------------------------------
CONTRASTO ASSOLUTO (ANTI TESTO NERO)
------------------------------------------------
Nel CSS scoped inserisci SEMPRE:

#fg-[slug], 
#fg-[slug] * {
  color: #FFFFFF !important;
}

Stessa cosa per html2 con id -2.

Nessun testo può essere nero. Mai.

------------------------------------------------
STRUTTURA HTML OBBLIGATORIA
------------------------------------------------
html1 e html2 DEVONO contenere:

<section id="fg-[slug]" class="fg-wrap">
  contenuto
</section>
<style>
CSS scoped solo su #fg-[slug]
</style>

Vietato CSS globale.
Solo CSS scoped.

------------------------------------------------
LAYOUT GRID OBBLIGATORIO
------------------------------------------------
.fg-grid deve avere:

mobile:
grid-template-columns: 1fr;

tablet ≥720px:
2 colonne

desktop ≥1050px:
3 colonne (3×2)

Usa @media nel CSS scoped.

------------------------------------------------
ANTI LOOK 2000
------------------------------------------------
- glass soft
- glow leggero
- bordi arrotondati
- ombre morbide
- separatore:
<div class="fg-divider"></div>

------------------------------------------------
ANTI MURO DI TESTO
------------------------------------------------
html1:
4 paragrafi class="fg-p"
220–380 caratteri
max 2 frasi ciascuno

html2:
3 paragrafi class="fg-p"
stesse regole

------------------------------------------------
SEO POSIZIONATA
------------------------------------------------
html1 paragrafo 2:
DEVE contenere testualmente:
"È un gioco da tavolo ..."

html2 SEO block:
"gioco da tavolo" + 4 keyword naturali

No keyword stuffing.

------------------------------------------------
CARD CALDE (REGOLA DURA)
------------------------------------------------
Ogni card:

TITOLO:
- inizia con un VERBO
- max 3 parole
- MAIUSCOLO

TESTO:
- 1 frase
- max 12 parole
- payoff emotivo

------------------------------------------------
GRIGLIE
------------------------------------------------
html1: 6 card esperienza
html2: 6 card valore

------------------------------------------------
CHIPS
------------------------------------------------
4–5 pill solo HTML
mai testo libero

------------------------------------------------
NO INVENTARE NUMERI
------------------------------------------------
Niente quantità specifiche se non certe.

------------------------------------------------
HTML3
------------------------------------------------
Solo testo.
No HTML.
No markdown.
Titoli MAIUSCOLO.
Turni 1) 2) 3) 4).

------------------------------------------------
SEO META
------------------------------------------------
seoTitle ≤70 caratteri
usa “–” non “:”

metaDescription ≤160 caratteri
nome + keyword

------------------------------------------------
TONO
------------------------------------------------
Cinematografico
concreto
zero catalogo
zero "capolavoro"

------------------------------------------------
PERCORSO VENDITA
------------------------------------------------
curiosità → immersione → differenza → target → payoff

Rispetta SEMPRE questa progressione.

Rispondi SOLO JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
          required: ["html1", "html2", "html3", "seoTitle", "metaDescription"],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Errore generazione");

    return JSON.parse(textOutput);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Errore durante la creazione della descrizione. Riprova.");
  }
};
