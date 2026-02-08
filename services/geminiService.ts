import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

type GenJson = {
  html1: string;
  html2: string;
  html3: string;
  seoTitle: string;
  metaDescription: string;
};

const stripMarkdownBold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

// Estrae l'id fg-xxxx dalla section
const extractSectionId = (html: string) => {
  const m = html.match(/<section\s+id="(fg-[^"]+)"/i);
  return m?.[1] ?? null;
};

const countCards = (html: string) => {
  const matches = html.match(/class="fg-card"/g);
  return matches ? matches.length : 0;
};

const hasScopedStyle = (html: string, id: string) => {
  // deve esserci <style> e deve contenere #id
  const styleBlock = html.match(/<style[\s\S]*?>[\s\S]*?<\/style>/i)?.[0] ?? "";
  return (
    /<style[\s\S]*?>/i.test(styleBlock) &&
    new RegExp(`#${id}\\b`).test(styleBlock)
  );
};

const hasGridMedia = (html: string, id: string) => {
  const styleBlock = html.match(/<style[\s\S]*?>[\s\S]*?<\/style>/i)?.[0] ?? "";
  const hasGrid = /\.fg-grid\b/.test(styleBlock);
  const hasMedia = /@media\s*\(/.test(styleBlock);
  // e deve impostare 3 colonne a desktop
  const hasDesktop3Cols =
    /min-width:\s*1050px[\s\S]*?\.fg-grid[\s\S]*?grid-template-columns:\s*repeat\(3/i.test(
      styleBlock
    ) ||
    /min-width:\s*1050px[\s\S]*?grid-template-columns:\s*repeat\(3/i.test(
      styleBlock
    );
  // e 2 colonne a tablet
  const hasTablet2Cols =
    /min-width:\s*720px[\s\S]*?\.fg-grid[\s\S]*?grid-template-columns:\s*repeat\(2/i.test(
      styleBlock
    ) ||
    /min-width:\s*720px[\s\S]*?grid-template-columns:\s*repeat\(2/i.test(
      styleBlock
    );

  // Deve applicarsi allo scope dell'id
  const scoped =
    new RegExp(`#${id}[\\s\\S]*?\\.fg-grid`).test(styleBlock) ||
    new RegExp(`#${id} \\.[a-z-]+[\\s\\S]*?\\.fg-grid`).test(styleBlock);

  return hasGrid && hasMedia && hasDesktop3Cols && hasTablet2Cols && scoped;
};

const hasContrastLock = (html: string, id: string) => {
  const styleBlock = html.match(/<style[\s\S]*?>[\s\S]*?<\/style>/i)?.[0] ?? "";
  // obbligo: #id, #id * { color:#fff !important; }
  const re = new RegExp(
    `#${id}\\s*,\\s*\\n?\\s*#${id}\\s*\\*\\s*\\{[\\s\\S]*?color:\\s*#FFFFFF\\s*!important;`,
    "i"
  );
  return re.test(styleBlock);
};

const validateBlock = (html: string, expectedCards: number) => {
  const cleaned = stripMarkdownBold(html);

  const id = extractSectionId(cleaned);
  if (!id) return { ok: false, cleaned, errors: ["Manca <section id=\"fg-...\">"] };

  const errors: string[] = [];

  if (!hasScopedStyle(cleaned, id)) errors.push("Manca <style> scoped su #" + id);
  if (!hasGridMedia(cleaned, id)) errors.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");
  if (!hasContrastLock(cleaned, id)) errors.push("Manca contrast lock (#id, #id * { color:#fff !important; })");

  const cardCount = countCards(cleaned);
  if (cardCount !== expectedCards)
    errors.push(`Numero card errato: ${cardCount} (attese ${expectedCards})`);

  // controllo paragrafi principali
  const pCount = (cleaned.match(/class="fg-p"/g) || []).length;
  // html1 = 4, html2 = 3
  // lo controlliamo fuori passando expectedCards: useremo expectedCards per capire quale blocco
  // (6 cards in entrambi; differenziamo tramite presenza -2 nell'id)
  const isSecond = id.endsWith("-2");
  const expectedP = isSecond ? 3 : 4;
  if (pCount !== expectedP) errors.push(`Paragrafi fg-p errati: ${pCount} (attesi ${expectedP})`);

  // controllo che non ci siano ** rimasti
  if (/\*\*/.test(cleaned)) errors.push("Contiene ancora Markdown **");

  return { ok: errors.length === 0, cleaned, errors, id };
};

const buildPrompt = (bggInfo: string) => `
Agisci come Master Copywriter SEO e Lead UI Designer per FroGames.
Analizza i colori della scatola nell'immagine e il tema del gioco: ${bggInfo}.
Crea una descrizione Shopify premium, mobile-first, SEO forte, con layout moderno.

OUTPUT: restituisci SOLO JSON con:
html1, html2, html3, seoTitle, metaDescription

REGOLE CRITICHE (NON SGARRARE):
- Vietato Markdown: niente **, niente liste markdown, niente backtick.
- NON troncare: devi completare SEMPRE html1 e html2 con le griglie e i panel finali.
- html1 e html2 DEVONO avere: <section ...> + <style>...</style> subito dopo.
- CSS SOLO scoped sull'id della section, con @media.
- Inserisci SEMPRE la regola anti-nero:
  #ID, #ID * { color:#FFFFFF !important; }

LAYOUT GRID OBBLIGATORIO:
- .fg-grid: 1 col mobile, 2 col ≥720px, 3 col ≥1050px.

CARD “CALDE” (OBBLIGO):
- 6 card in html1 + 6 card in html2.
- Ogni card:
  Titolo MAIUSCOLO, max 3 parole, DEVE iniziare con un VERBO (es: CALCOLA, SPINGI, TAGLIA, RISCHIA…)
  Testo 1 sola frase, max 12 parole, payoff emotivo concreto.

ANTI-MURO (ma non vuoto):
- html1: 4 paragrafi class="fg-p" (220–380 caratteri, max 2 frasi).
- html2: 3 paragrafi class="fg-p" (220–380 caratteri, max 2 frasi).
- Inserisci una tagline grande class="fg-tagline" in ogni blocco.

SEO POSIZIONATA:
- html1 nel 2° paragrafo: deve comparire testualmente “È un gioco da tavolo …” con categoria corretta.
- Se pertinente, in html1 deve comparire anche “gioco di carte”.
- html2: inserisci un paragrafo class="fg-seo" (2–3 frasi, 380–520 caratteri) con “gioco da tavolo” + 4 keyword naturali (max 1 keyword per frase).

CHIPS:
- html1: riga chips class="fg-chips" con 4–5 pill.

STRUTTURA HTML1:
<section id="fg-[slug]" class="fg-wrap">
  <div class="fg-hero"> (kicker + title + sub + testi) </div>
  4 <p class="fg-p">...</p>
  <div class="fg-tagline">...</div>
  <div class="fg-chips">...pill...</div>
  <div class="fg-divider"></div>
  <div class="fg-grid">
    6 <article class="fg-card">...</article>
  </div>
  <div class="fg-panel">...</div>
</section>
<style> CSS scoped + @media </style>

STRUTTURA HTML2:
<section id="fg-[slug]-2" class="fg-wrap">
  kicker + h2 tematico + sub
  3 <p class="fg-p">...</p>
  <div class="fg-tagline">...</div>
  <h3 class="fg-h3">DOVE TI PREMIA</h3>
  <div class="fg-grid"> 6 card </div>
  <h3 class="fg-h3">DOVE TI METTE ALLA PROVA</h3>
  <p class="fg-seo">SEO long...</p>
  <div class="fg-panel">...</div>
</section>
<style> CSS scoped + @media </style>

HTML3:
- SOLO TESTO, niente HTML, niente markdown, niente asterischi.
- Titoli MAIUSCOLO.
- Turno con 1) 2) 3) 4).

SEO META:
- seoTitle ≤70 caratteri, usa “–” non “:”
- metaDescription ≤160 caratteri, nome + 1–2 keyword, niente durata/giocatori

RISPOSTA: SOLO JSON.
`;

const buildRepairPrompt = (original: GenJson, errors: string[]) => `
Hai generato un JSON ma NON rispetta i vincoli.
Correggi SENZA cambiare tono/stile, mantenendo contenuti e idea, ma:
- aggiusta SOLO le parti necessarie per passare la validazione.
- vietato markdown (niente **).
- assicurati che html1/html2 abbiano section+style scoped+@media, contrast lock, e 6 card ciascuno.

ERRORI DA CORREGGERE:
${errors.map((e) => `- ${e}`).join("\n")}

JSON ATTUALE DA RIPARARE (non aggiungere testo extra fuori dal JSON):
${JSON.stringify(original)}
`;

export const generateShopifyHtml = async (
  imageB64: string,
  text1: string,
  text2: string,
  bggInfo: string
): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = imageB64.split(",")[1] || imageB64;

  const imagePart = {
    inlineData: { mimeType: "image/jpeg", data: base64Data },
  };

  const run = async (promptText: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [imagePart, { text: promptText }] },
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
    return JSON.parse(textOutput) as GenJson;
  };

  // 1) prima generazione
  let out = await run(buildPrompt(bggInfo));

  // pulizia minima anti-** (non deve mai arrivare al tema)
  out = {
    ...out,
    html1: stripMarkdownBold(out.html1),
    html2: stripMarkdownBold(out.html2),
    html3: stripMarkdownBold(out.html3),
    seoTitle: stripMarkdownBold(out.seoTitle),
    metaDescription: stripMarkdownBold(out.metaDescription),
  };

  // 2) validazione html1/html2
  const v1 = validateBlock(out.html1, 6);
  const v2 = validateBlock(out.html2, 6);

  if (!v1.ok || !v2.ok) {
    const errors = [
      ...(v1.ok ? [] : v1.errors ?? []),
      ...(v2.ok ? [] : v2.errors ?? []),
    ];

    // 3) repair pass (una sola volta, per non impazzire)
    const repaired = await run(buildRepairPrompt(out, errors));

    out = {
      ...repaired,
      html1: stripMarkdownBold(repaired.html1),
      html2: stripMarkdownBold(repaired.html2),
      html3: stripMarkdownBold(repaired.html3),
      seoTitle: stripMarkdownBold(repaired.seoTitle),
      metaDescription: stripMarkdownBold(repaired.metaDescription),
    };

    // 4) ultima validazione (se fallisce, almeno non consegni roba rotta)
    const vv1 = validateBlock(out.html1, 6);
    const vv2 = validateBlock(out.html2, 6);
    if (!vv1.ok || !vv2.ok) {
      throw new Error(
        "Output non valido dopo repair. Dettagli: " +
          JSON.stringify({ html1: vv1.errors, html2: vv2.errors })
      );
    }
  }

  return out;
};
