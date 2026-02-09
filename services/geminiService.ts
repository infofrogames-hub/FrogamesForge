import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

type Output = GenerationResult;

const MAX_ATTEMPTS = 3;

function stripHtmlTags(input: string): string {
  // elimina qualunque tag HTML, preserva testo
  return input.replace(/<\/?[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function stripMarkdownLike(input: string): string {
  // evita che escano **bold**, ```code```, ecc.
  // (nei blocchi HTML il bold deve essere <strong>)
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

function countMatches(haystack: string, needle: RegExp): number {
  const m = haystack.match(needle);
  return m ? m.length : 0;
}

function extractSlugFromHtml(html: string): string | null {
  const m = html.match(/<section\s+id="(fg-[^"]+)"/i);
  return m?.[1] ?? null;
}

type ValidationErrors = {
  html1: string[];
  html2: string[];
  html3: string[];
  meta: string[];
};

function validateOutput(out: Output): ValidationErrors {
  const errors: ValidationErrors = { html1: [], html2: [], html3: [], meta: [] };

  // ----- BASIC STRUCTURE -----
  if (!out.html1.includes('<section id="fg-')) errors.html1.push('Manca <section id="fg-');
  if (!out.html2.includes('<section id="fg-')) errors.html2.push('Manca <section id="fg-');
  if (!out.html1.includes("<style>") || !out.html1.includes("</style>")) errors.html1.push("Manca <style>...</style>");
  if (!out.html2.includes("<style>") || !out.html2.includes("</style>")) errors.html2.push("Manca <style>...</style>");

  // ----- GRID + @MEDIA -----
  if (!/\.fg-grid\b/.test(out.html1) || !/@media\s*\(/.test(out.html1)) errors.html1.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");
  if (!/\.fg-grid\b/.test(out.html2) || !/@media\s*\(/.test(out.html2)) errors.html2.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");

  // ----- CONTRAST LOCK -----
  // Deve esserci la regola #id, #id * { color:#FFFFFF !important; }
  const slug1 = extractSlugFromHtml(out.html1);
  if (!slug1) {
    errors.html1.push("Slug section non trovato");
  } else {
    const lock1 = new RegExp(`#${slug1}\\s*,\\s*\\n?#${slug1}\\s*\\*\\s*\\{[^}]*color\\s*:\\s*#FFFFFF\\s*!important`, "i");
    if (!lock1.test(out.html1)) errors.html1.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  const slug2 = extractSlugFromHtml(out.html2);
  if (!slug2) {
    errors.html2.push("Slug section non trovato");
  } else {
    const lock2 = new RegExp(`#${slug2}\\s*,\\s*\\n?#${slug2}\\s*\\*\\s*\\{[^}]*color\\s*:\\s*#FFFFFF\\s*!important`, "i");
    if (!lock2.test(out.html2)) errors.html2.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  // ----- ANTI MARKDOWN -----
  if (/\*\*|```|`/.test(out.html1)) errors.html1.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html2)) errors.html2.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html3)) errors.html3.push("html3 contiene markdown (vietato)");

  // ----- HTML3 MUST BE PLAIN TEXT -----
  if (/<\/?[a-z][\s\S]*>/i.test(out.html3)) errors.html3.push("html3 contiene HTML (vietato)");

  // ----- REQUIRED SEO PLACEMENT -----
  // html1 paragrafo 2 deve contenere "È un gioco da tavolo"
  const p1 = out.html1.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p1.length !== 4) errors.html1.push(`html1 deve avere 4 paragrafi fg-p (trovati ${p1.length})`);
  if (p1.length >= 2 && !p1[1].includes("È un gioco da tavolo")) errors.html1.push('Manca “È un gioco da tavolo” nel 2° paragrafo');

  // html2 deve avere 3 paragrafi fg-p
  const p2 = out.html2.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p2.length !== 3) errors.html2.push(`html2 deve avere 3 paragrafi fg-p (trovati ${p2.length})`);

  // html2 deve contenere .fg-seo
  if (!/class="fg-seo"/.test(out.html2)) errors.html2.push("Manca blocco SEO long .fg-seo");

  // ----- CARDS COUNTS -----
  const cards1 = countMatches(out.html1, /class="fg-card"/g);
  if (cards1 !== 6) errors.html1.push(`html1 deve avere 6 card (trovate ${cards1})`);
  const cards2 = countMatches(out.html2, /class="fg-card"/g);
  if (cards2 !== 6) errors.html2.push(`html2 deve avere 6 card (trovate ${cards2})`);

  // ----- CHIPS COUNTS -----
  const chips = countMatches(out.html1, /class="fg-chip"/g);
  if (chips < 4 || chips > 5) errors.html1.push(`html1 chips devono essere 4–5 (trovate ${chips})`);

  // ----- SEO META LIMITS -----
  if ((out.seoTitle ?? "").length > 70) errors.meta.push(`seoTitle > 70 (${out.seoTitle.length})`);
  if ((out.metaDescription ?? "").length > 160) errors.meta.push(`metaDescription > 160 (${out.metaDescription.length})`);
  if (/:/.test(out.seoTitle)) errors.meta.push("seoTitle usa ':' (vietato, usa –)");
  if (/:/.test(out.metaDescription)) errors.meta.push("metaDescription usa ':' (evitare)");

  return errors;
}

function hasErrors(err: ValidationErrors): boolean {
  return (
    err.html1.length > 0 ||
    err.html2.length > 0 ||
    err.html3.length > 0 ||
    err.meta.length > 0
  );
}

function formatErrors(err: ValidationErrors): string {
  const parts: string[] = [];
  if (err.html1.length) parts.push(`html1: ${err.html1.join(" | ")}`);
  if (err.html2.length) parts.push(`html2: ${err.html2.join(" | ")}`);
  if (err.html3.length) parts.push(`html3: ${err.html3.join(" | ")}`);
  if (err.meta.length) parts.push(`meta: ${err.meta.join(" | ")}`);
  return parts.join("\n");
}

function buildRepairPrompt(basePrompt: string, err: ValidationErrors): string {
  // Repair MIRATO: dice cosa manca, senza cambiare stile generale
  // Importante: NON chiedere spiegazioni, solo JSON.
  const missing: string[] = [];

  // html1 fixes
  if (err.html1.some(e => e.includes('Manca “È un gioco da tavolo”'))) {
    missing.push(`- In html1, nel 2° <p class="fg-p"> inserisci testualmente "È un gioco da tavolo ..." e chiudi con punto.`);
  }
  if (err.html1.some(e => e.includes("contrast lock"))) {
    missing.push(`- In html1 CSS: inserisci all’inizio #fg-[slug], #fg-[slug] * { color:#FFFFFF !important; }`);
  }
  if (err.html1.some(e => e.includes(".fg-grid"))) {
    missing.push(`- In html1 CSS: aggiungi .fg-grid + @media per 1/2/3 colonne (mobile/tablet/desktop).`);
  }
  if (err.html1.some(e => e.includes("4 paragrafi"))) {
    missing.push(`- In html1: ESATTAMENTE 4 <p class="fg-p">.`);
  }
  if (err.html1.some(e => e.includes("6 card"))) {
    missing.push(`- In html1: ESATTAMENTE 6 <article class="fg-card"> dentro .fg-grid.`);
  }
  if (err.html1.some(e => e.includes("chips"))) {
    missing.push(`- In html1: chips 4–5 con <span class="fg-chip"> dentro .fg-chips.`);
  }

  // html2 fixes
  if (err.html2.some(e => e.includes("Manca blocco SEO long"))) {
    missing.push(`- In html2: inserisci <p class="fg-seo"> con 2–3 frasi (380–520 caratteri) contenente "gioco da tavolo" + 4 keyword naturali.`);
  }
  if (err.html2.some(e => e.includes("contrast lock"))) {
    missing.push(`- In html2 CSS: inserisci all’inizio #fg-[slug]-2, #fg-[slug]-2 * { color:#FFFFFF !important; }`);
  }
  if (err.html2.some(e => e.includes(".fg-grid"))) {
    missing.push(`- In html2 CSS: aggiungi .fg-grid + @media per 1/2/3 colonne (mobile/tablet/desktop).`);
  }
  if (err.html2.some(e => e.includes("3 paragrafi"))) {
    missing.push(`- In html2: ESATTAMENTE 3 <p class="fg-p">.`);
  }
  if (err.html2.some(e => e.includes("6 card"))) {
    missing.push(`- In html2: ESATTAMENTE 6 <article class="fg-card"> dentro .fg-grid.`);
  }

  // html3 fixes
  if (err.html3.length) {
    missing.push(`- html3 DEVE essere SOLO testo: niente HTML, niente markdown, niente asterischi. Titoli in MAIUSCOLO, turno 1) 2) 3) 4).`);
  }

  // meta fixes
  if (err.meta.length) {
    missing.push(`- Correggi seoTitle ≤70 (usa “–”, no “:”) e metaDescription ≤160.`);
  }

  return `
${basePrompt}

================================================
REPAIR OBBLIGATORIO (ALTISSIMA PRIORITÀ)
================================================
Hai fallito la validazione. Correggi e restituisci SOLO JSON valido, senza spiegazioni.

MANCANZE DA CORREGGERE:
${missing.join("\n")}

Regola dura: niente frasi troncate. Ogni paragrafo finisce con un punto.
Rispondi SOLO JSON con "html1","html2","html3","seoTitle","metaDescription".
`.trim();
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

  // PROMPT BASE (il tuo, con le regole critiche)
  const basePrompt = `
Agisci come Master Copywriter SEO e Lead UI Designer per FroGames.
Analizza i colori della scatola nell'immagine e il tema del gioco: ${bggInfo}.
Obiettivo: descrizione Shopify premium, mobile-first, SEO forte, percorso di vendita chiaro, layout moderno e leggibile.

OUTPUT: restituisci SOLO JSON con:
- html1 (ATMOSFERA)
- html2 (PERCHÉ FUNZIONA AL TAVOLO)
- html3 (COME SI GIOCA: SOLO TESTO)
- seoTitle
- metaDescription

================================================
REGOLE CRITICHE ANTI-ERRORI (ALTISSIMA PRIORITÀ)
================================================
1) VIETATO MARKDOWN:
   - NON usare **asterischi**, NON usare backtick, NON usare elenchi Markdown.
   - Enfasi solo con <strong> dentro html1/html2. In html3 niente enfasi.

2) VIETATO TRONCARE:
   - Se stai per superare i limiti, accorcia frasi e SEO long, ma NON lasciare frasi a metà.
   - Ogni paragrafo deve finire con un punto.

3) VIETATO “SCHEDA TECNICA”:
   - Non inserire righe tipo: giocatori, minuti, età, editore, lingua.
   - Non inserire nomi editore se non esplicitamente forniti dall’utente.

================================================
VALIDAZIONE OUTPUT (MANDATORIA)
================================================
Se html1 o html2 NON contengono TUTTI questi elementi:
- <section id="fg-
- <style>
- chiusura </style>
- CSS scoped sull'id (usa #fg-[slug] ... oppure #fg-[slug]-2 ...)
- .fg-grid con @media (mobile 1 col / tablet 2 col / desktop 3 col)

ALLORA devi rigenerare internamente prima di rispondere.
Rispondi solo con JSON valido.

================================================
STRUTTURA HTML OBBLIGATORIA
================================================
html1:
<section id="fg-[slug]" class="fg-wrap"> ... </section>
<style> ...CSS scoped solo su #fg-[slug]... </style>

html2:
<section id="fg-[slug]-2" class="fg-wrap"> ... </section>
<style> ...CSS scoped solo su #fg-[slug]-2... </style>

Vietato CSS globale.

================================================
CONTRASTO ASSOLUTO (ANTI TESTO NERO)
================================================
Nel CSS scoped inserisci SEMPRE, all’inizio:

#fg-[slug],
#fg-[slug] * {
  color: #FFFFFF !important;
}

Per html2:
#fg-[slug]-2,
#fg-[slug]-2 * {
  color: #FFFFFF !important;
}

================================================
LAYOUT GRID OBBLIGATORIO (3x2 desktop)
================================================
.fg-grid deve garantire:
- mobile: 1 colonna
- tablet ≥ 720px: 2 colonne
- desktop ≥ 1050px: 3 colonne (3×2)
con @media nello style scoped.

================================================
ANTI-MURO (MA SENZA SVUOTARE)
================================================
html1:
- ESATTAMENTE 4 paragrafi principali <p class="fg-p"> (260–480 caratteri, max 2 frasi)
- percorso: curiosità → immersione → differenza → target (micro-gancio finale)

html2:
- ESATTAMENTE 3 paragrafi principali <p class="fg-p"> (260–480 caratteri, max 2 frasi)
- percorso: razionalizzazione → scelte/rischio → payoff

================================================
SEO POSIZIONATA (OBBLIGATORIA)
================================================
- html1, paragrafo 2: deve contenere testualmente “È un gioco da tavolo …” + categoria corretta.
- Se pertinente deve comparire anche “gioco di carte” (una volta).
- html2: deve includere <p class="fg-seo"> (2–3 frasi, 380–520 caratteri)
  con “gioco da tavolo” + 4 keyword naturali coerenti (no elenco tecnico).
- No keyword stuffing: max 1 keyword per frase.

================================================
CARD CALDE (STILE SPEAKEASY / DANCE OF IBEXES)
================================================
Ogni card deve essere una micro-scena di tavolo:
- Titolo: emoji + frase evocativa (max ~52 caratteri)
- Testo: 1–2 frasi, max ~140 caratteri
- Deve far sentire momento e payoff (tensione, scelta, soddisfazione)

Griglie:
- html1: 6 card esperienza
- html2: 6 card valore sui temi (senza essere fredde): Strategia, Combo, Profondità, Flusso, Bilanciamento, Decisioni

================================================
CHIPS (OBBLIGO)
================================================
In html1 inserisci <div class="fg-chips"> con 4–5 <span class="fg-chip">.
Almeno 2 chip devono contenere keyword coerenti (es: gioco da tavolo, eurogame, gioco di carte, ecc.).

================================================
HTML3 (COME SI GIOCA) — SOLO TESTO
================================================
- Solo testo puro, niente HTML, niente markdown, niente asterischi
- Titoli in MAIUSCOLO
- Righe vuote tra paragrafi
- Turno: 1) 2) 3) 4)
- Vietato inserire “giocatori/minuti/età/editore”.

================================================
SEO META
================================================
- seoTitle ≤ 70 caratteri, usa “–” mai “:”
- metaDescription ≤ 160 caratteri, nome + 1–2 keyword, tono FroGames.

RISPOSTA: SOLO JSON con "html1", "html2", "html3", "seoTitle", "metaDescription".
`.trim();

  async function callModel(prompt: string): Promise<Output> {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        // Se supportato dal tuo SDK, tenere bassa la creatività aiuta la stabilità:
        // temperature: 0.4,
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

    const parsed = JSON.parse(textOutput) as Output;

    // Safety nets:
    parsed.html1 = stripMarkdownLike(parsed.html1);
    parsed.html2 = stripMarkdownLike(parsed.html2);

    // html3: deve essere plain text
    parsed.html3 = stripMarkdownLike(parsed.html3);
    if (/<\/?[a-z][\s\S]*>/i.test(parsed.html3)) {
      parsed.html3 = stripHtmlTags(parsed.html3);
    }

    return parsed;
  }

  let lastErr: ValidationErrors | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prompt = attempt === 1 ? basePrompt : buildRepairPrompt(basePrompt, lastErr!);

    const out = await callModel(prompt);
    const err = validateOutput(out);

    if (!hasErrors(err)) return out;

    lastErr = err;
  }

  // Se arriva qui: fallito anche dopo repair
  throw new Error(
    `Output non valido dopo repair. Dettagli:\n${formatErrors(lastErr!)}`
  );
};
