import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

/**
 * Enforces REQUIRED scoped CSS in html1/html2 so the validator never fails:
 * - contrast lock: #id, #id * { color:#fff !important; }
 * - .fg-grid responsive 1/2/3 columns via @media
 * If <style> is missing, it appends one. If present but incomplete, it prepends required rules.
 */
function ensureScopedCss(html: string): string {
  const idMatch = html.match(/<section\s+id="([^"]+)"/i);
  if (!idMatch) return html;

  const sectionId = idMatch[1];

  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);

  const REQUIRED = `
/* === FG REQUIRED (do not remove) === */
#${sectionId}, #${sectionId} * { color: #FFFFFF !important; }

/* grid: mobile 1 col, tablet 2 col, desktop 3 col */
#${sectionId} .fg-grid{
  display:grid;
  grid-template-columns:1fr;
  gap:18px;
  width:100%;
  margin:26px auto 0;
}
@media (min-width:720px){
  #${sectionId} .fg-grid{ grid-template-columns:repeat(2, minmax(0, 1fr)); }
}
@media (min-width:1050px){
  #${sectionId} .fg-grid{ grid-template-columns:repeat(3, minmax(0, 1fr)); }
}
/* === /FG REQUIRED === */
`.trim();

  if (!styleMatch) {
    // If missing <style>, append it.
    return `${html}\n<style>\n${REQUIRED}\n</style>\n`;
  }

  const existingCss = styleMatch[1];

  const hasContrastLock =
    new RegExp(
      `#${sectionId}\\s*,\\s*#${sectionId}\\s*\\*\\s*\\{[^}]*color\\s*:\\s*#?fff`,
      "i"
    ).test(existingCss);

  const hasGridMedia =
    /@media\s*\(\s*min-width\s*:\s*720px\s*\)[\s\S]*\.fg-grid/i.test(existingCss) &&
    /@media\s*\(\s*min-width\s*:\s*1050px\s*\)[\s\S]*\.fg-grid/i.test(existingCss);

  if (hasContrastLock && hasGridMedia) return html;

  // Prepend REQUIRED so it wins even if later rules exist.
  const newCss = `${REQUIRED}\n\n${existingCss}`.trim();
  return html.replace(styleMatch[0], `<style>\n${newCss}\n</style>`);
}

/**
 * Optional: remove markdown-like **...** if model ever outputs them in html/text.
 * (Your prompt says "no markdown", but this is a safety net.)
 */
function stripMarkdownAsterisks(s: string): string {
  return s.replace(/\*\*(.*?)\*\*/g, "$1");
}

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

    const result = JSON.parse(textOutput) as GenerationResult;

    // --- Hardening: enforce validator requirements regardless of model mistakes
    result.html1 = ensureScopedCss(stripMarkdownAsterisks(result.html1));
    result.html2 = ensureScopedCss(stripMarkdownAsterisks(result.html2));
    result.html3 = stripMarkdownAsterisks(result.html3);
    result.seoTitle = stripMarkdownAsterisks(result.seoTitle);
    result.metaDescription = stripMarkdownAsterisks(result.metaDescription);

    return result;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Errore durante la creazione della descrizione. Riprova.");
  }
};
