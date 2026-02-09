import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

type Output = GenerationResult;

const MAX_ATTEMPTS = 3;

/** Rimuove eventuali tag HTML (serve solo per html3) */
function stripHtmlTags(input: string): string {
  return input.replace(/<\/?[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Rimuove markdown accidentale (**bold**, backtick). Non tocca l’HTML. */
function stripMarkdownAccident(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .trim();
}

function countMatches(haystack: string, re: RegExp): number {
  const m = haystack.match(re);
  return m ? m.length : 0;
}

function getSectionId(html: string): string | null {
  const m = html.match(/<section\s+id="([^"]+)"/i);
  return m?.[1] ?? null;
}

type ValidationErrors = {
  html1: string[];
  html2: string[];
  html3: string[];
  meta: string[];
};

function validateOutput(out: Output): ValidationErrors {
  const err: ValidationErrors = { html1: [], html2: [], html3: [], meta: [] };

  // ---- Base structure ----
  if (!out.html1.includes('<section id="fg-')) err.html1.push('Manca <section id="fg-');
  if (!out.html2.includes('<section id="fg-')) err.html2.push('Manca <section id="fg-');

  if (!out.html1.includes("<style>") || !out.html1.includes("</style>")) err.html1.push("Manca <style>...</style>");
  if (!out.html2.includes("<style>") || !out.html2.includes("</style>")) err.html2.push("Manca <style>...</style>");

  // ---- Grid + media ----
  if (!/\.fg-grid\b/.test(out.html1) || !/@media\s*\(/.test(out.html1))
    err.html1.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");
  if (!/\.fg-grid\b/.test(out.html2) || !/@media\s*\(/.test(out.html2))
    err.html2.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");

  // ---- Contrast lock (id scoped) ----
  const id1 = getSectionId(out.html1);
  if (!id1) {
    err.html1.push("ID section html1 non trovato");
  } else {
    const lock1 = new RegExp(
      `#${id1}\\s*,\\s*\\n?#${id1}\\s*\\*\\s*\\{[^}]*color\\s*:\\s*#FFFFFF\\s*!important`,
      "i"
    );
    if (!lock1.test(out.html1)) err.html1.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  const id2 = getSectionId(out.html2);
  if (!id2) {
    err.html2.push("ID section html2 non trovato");
  } else {
    const lock2 = new RegExp(
      `#${id2}\\s*,\\s*\\n?#${id2}\\s*\\*\\s*\\{[^}]*color\\s*:\\s*#FFFFFF\\s*!important`,
      "i"
    );
    if (!lock2.test(out.html2)) err.html2.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  // ---- Markdown forbidden ----
  if (/\*\*|```|`/.test(out.html1)) err.html1.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html2)) err.html2.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html3)) err.html3.push("html3 contiene markdown (vietato)");

  // ---- html3 plain text only ----
  if (/<\/?[a-z][\s\S]*>/i.test(out.html3)) err.html3.push("html3 contiene HTML (vietato)");

  // ---- Exact paragraph constraints ----
  const p1 = out.html1.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p1.length !== 4) err.html1.push(`html1 deve avere 4 paragrafi fg-p (trovati ${p1.length})`);

  // html1 p2 MUST contain "È un gioco da tavolo"
  if (p1.length >= 2 && !p1[1].includes("È un gioco da tavolo"))
    err.html1.push('Manca “È un gioco da tavolo” nel 2° paragrafo');

  const p2 = out.html2.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p2.length !== 3) err.html2.push(`html2 deve avere 3 paragrafi fg-p (trovati ${p2.length})`);

  // html2 MUST include .fg-seo (solo html2)
  if (!/class="fg-seo"/.test(out.html2)) err.html2.push("Manca blocco SEO long .fg-seo");

  // ---- Cards count ----
  const c1 = countMatches(out.html1, /class="fg-card"/g);
  if (c1 !== 6) err.html1.push(`html1 deve avere 6 card (trovate ${c1})`);

  const c2 = countMatches(out.html2, /class="fg-card"/g);
  if (c2 !== 6) err.html2.push(`html2 deve avere 6 card (trovate ${c2})`);

  // ---- Chips count (span class fg-chip) ----
  const chips = countMatches(out.html1, /class="fg-chip"/g);
  if (chips < 4 || chips > 5) err.html1.push(`html1 chips devono essere 4–5 (trovate ${chips})`);

  // ---- SEO meta limits ----
  if ((out.seoTitle ?? "").length > 70) err.meta.push(`seoTitle > 70 (${out.seoTitle.length})`);
  if ((out.metaDescription ?? "").length > 160) err.meta.push(`metaDescription > 160 (${out.metaDescription.length})`);
  if (/:/.test(out.seoTitle ?? "")) err.meta.push("seoTitle contiene ':' (vietato, usa –)");

  return err;
}

function hasErrors(e: ValidationErrors): boolean {
  return e.html1.length || e.html2.length || e.html3.length || e.meta.length ? true : false;
}

function buildRepairPrompt(basePrompt: string, e: ValidationErrors): string {
  // repair “mirato”, non cambia lo stile: dice solo cosa manca / cosa correggere
  const fixes: string[] = [];

  if (e.html1.some(x => x.includes('Manca “È un gioco da tavolo”'))) {
    fixes.push(`- In html1: nel 2° <p class="fg-p"> inserisci testualmente "È un gioco da tavolo ..." e chiudi con punto.`);
  }
  if (e.html1.some(x => x.includes("contrast lock"))) {
    fixes.push(`- In html1 CSS: aggiungi all’inizio #fg-[slug], #fg-[slug] * { color:#FFFFFF !important; }`);
  }
  if (e.html1.some(x => x.includes(".fg-grid"))) {
    fixes.push(`- In html1 CSS: assicurati .fg-grid + @media: 1 col mobile, 2 col ≥720px, 3 col ≥1050px.`);
  }
  if (e.html1.some(x => x.includes("4 paragrafi"))) {
    fixes.push(`- In html1: ESATTAMENTE 4 <p class="fg-p"> (non 3, non 5).`);
  }
  if (e.html1.some(x => x.includes("6 card"))) {
    fixes.push(`- In html1: ESATTAMENTE 6 <article class="fg-card"> dentro .fg-grid.`);
  }
  if (e.html1.some(x => x.includes("chips"))) {
    fixes.push(`- In html1: chips ESATTAMENTE 4–5 con <span class="fg-chip"> dentro .fg-chips.`);
  }

  if (e.html2.some(x => x.includes("Manca blocco SEO long"))) {
    fixes.push(`- In html2: inserisci <p class="fg-seo"> con 2–3 frasi (380–520 caratteri) contenente "gioco da tavolo" + 4 keyword naturali.`);
  }
  if (e.html2.some(x => x.includes("contrast lock"))) {
    fixes.push(`- In html2 CSS: aggiungi all’inizio #fg-[slug]-2, #fg-[slug]-2 * { color:#FFFFFF !important; }`);
  }
  if (e.html2.some(x => x.includes(".fg-grid"))) {
    fixes.push(`- In html2 CSS: assicurati .fg-grid + @media: 1 col mobile, 2 col ≥720px, 3 col ≥1050px.`);
  }
  if (e.html2.some(x => x.includes("3 paragrafi"))) {
    fixes.push(`- In html2: ESATTAMENTE 3 <p class="fg-p"> (non 2, non 4).`);
  }
  if (e.html2.some(x => x.includes("6 card"))) {
    fixes.push(`- In html2: ESATTAMENTE 6 <article class="fg-card"> dentro .fg-grid.`);
  }

  if (e.html3.length) {
    fixes.push(`- html3: SOLO TESTO PURO. Niente tag HTML, niente markdown, niente asterischi. Turno 1) 2) 3) 4).`);
  }

  if (e.meta.length) {
    fixes.push(`- seoTitle ≤70 (usa “–”, no “:”) e metaDescription ≤160.`);
  }

  return `
${basePrompt}

================================================
REPAIR (ALTISSIMA PRIORITÀ)
================================================
Hai fallito la validazione. Correggi e restituisci SOLO JSON valido, senza spiegazioni.

CORREGGI SOLO QUESTE COSE (senza cambiare stile/struttura estetica):
${fixes.join("\n")}

Regola dura: niente frasi troncate. Ogni paragrafo finisce con un punto.
Rispondi SOLO JSON.
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

  // === IL TUO PROMPT (estetica invariata) ===
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
   - Se vuoi enfasi: usa solo <strong> dentro html1/html2. In html3 niente enfasi.

2) VIETATO TRONCARE:
   - Se stai per superare i limiti, accorcia frasi e SEO long, ma NON lasciare frasi a metà.
   - Ogni paragrafo deve finire con un punto.

3) VIETATO “SCHEDA TECNICA”:
   - Non inserire in nessun output righe tipo: giocatori, minuti, età, editore, lingua.
   - Non inserire “CGE”, “Czech Games Edition” o simili se non fornito esplicitamente dall’utente.

4) COERENZA DEI VINCOLI:
   - Le card sono “micro-scene calde” stile Speakeasy / Dance of Ibexes.
   - NON usare comandi freddi tipo “SCRUTA / LANCIA / ANALIZZA” come titoli card.
   - NON usare titoli astratti tipo “TENSIONE/STRATEGIA” da soli.

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
Non spiegare la rigenerazione. Rispondi solo con JSON valido.

================================================
STRUTTURA HTML OBBLIGATORIA
================================================
html1 e html2 DEVONO essere:
<section id="fg-[slug]" class="fg-wrap"> ... </section>
<style> ...CSS scoped solo su #fg-[slug]... </style>

Vietato CSS globale. Vietato dipendere solo da inline-style.

================================================
CONTRASTO ASSOLUTO (ANTI TESTO NERO)
================================================
Nel CSS scoped inserisci SEMPRE, all’inizio:

#fg-[slug],
#fg-[slug] * {
  color: #FFFFFF !important;
}

Per html2 usa l’id con suffisso -2:
#fg-[slug]-2,
#fg-[slug]-2 * { color:#FFFFFF !important; }

Nessun testo può essere nero. Mai.

================================================
BACKGROUND & LOOK PREMIUM
================================================
- Estrai 3 colori dominanti dalla scatola (c1,c2,c3) e crea un gradiente elegante.
- Usa glass soft, glow delicato, bordi arrotondati, ombre morbide.
- Inserisci un separatore sottile tra sezioni:
  <div class="fg-divider" aria-hidden="true"></div>

================================================
LAYOUT GRID OBBLIGATORIO (3x2 desktop)
================================================
.fg-grid deve essere una griglia vera e deve garantire:
- mobile: 1 colonna
- tablet ≥ 720px: 2 colonne
- desktop ≥ 1050px: 3 colonne (3×2)

Deve essere fatto con @media nel CSS scoped.

================================================
ANTI-MURO (MA SENZA SVUOTARE)
================================================
html1:
- ESATTAMENTE 4 paragrafi principali class="fg-p"
- ognuno 260–480 caratteri (non troppo corti)
- max 2 frasi ciascuno
- percorso: curiosità → immersione → differenza → target (con micro-gancio finale)

html2:
- ESATTAMENTE 3 paragrafi principali class="fg-p"
- stesse regole (260–480 caratteri, max 2 frasi)
- percorso: razionalizzazione → scelte/rischio → payoff

================================================
SEO POSIZIONATA (OBBLIGATORIA)
================================================
- html1, paragrafo 2: deve contenere testualmente “È un gioco da tavolo …” + categoria corretta.
- Se pertinente deve comparire anche “gioco di carte” (una volta).
- html2: deve includere un blocco SEO long class="fg-seo" (2–3 frasi, 380–520 caratteri)
  che contenga “gioco da tavolo” + 4 keyword naturali coerenti (no elenco tecnico).
- No keyword stuffing: max 1 keyword per frase.

================================================
CARD CALDE (REGOLA DURA, STILE SPEAKEASY / DANCE OF IBEXES)
================================================
Ogni card deve essere una micro-scena di tavolo:
- Titolo: emoji + frase evocativa (massimo ~52 caratteri)
- Testo: 1–2 frasi, massimo ~140 caratteri
- Deve far sentire momento e payoff (tensione, scelta, soddisfazione)

================================================
GRIGLIE
================================================
- html1: ESATTAMENTE 6 card esperienza
- html2: ESATTAMENTE 6 card valore sui temi (senza essere fredde):
  1) Strategia (scelta/gesto)
  2) Combo (incastri/tempo)
  3) Profondità (lettura/ritorno)
  4) Flusso (ritmo)
  5) Bilanciamento (inseguimento/rebound)
  6) Decisioni (scelta dolorosa)

================================================
CHIPS (OBBLIGO)
================================================
In html1 inserisci una riga chips class="fg-chips" con 4–5 pill.
Almeno 2 pill devono contenere keyword (coerenti) tra:
“gioco da tavolo”, “gioco di carte”, “gioco competitivo”, “eurogame”, “deckbuilding”, “trick-taking”.

Le chips devono essere SOLO HTML (span), non testo libero.

================================================
NO INVENTARE NUMERI
================================================
Non inserire numeri specifici (componenti, carte, ore, scenari, ecc.)
a meno che siano chiaramente verificabili. Se dubbio: ometti.

================================================
HTML3 (COME SI GIOCA) — SOLO TESTO
================================================
- Solo testo puro, niente HTML, niente markdown, niente asterischi
- Titoli in MAIUSCOLO
- Righe vuote tra paragrafi
- Turno: 1) 2) 3) 4)
- Breve e leggibile
- Vietato inserire “giocatori/minuti/età/editore”.

================================================
SEO META
================================================
- seoTitle ≤ 70 caratteri, usa “–” mai “:”
  formato: “[Nome] – hook + 1 keyword”
- metaDescription ≤ 160 caratteri, nome + 1–2 keyword, tono FroGames
  niente player count/durata

================================================
STRUTTURA DETTAGLIATA HTML1
================================================
<section id="fg-[slug]" class="fg-wrap">
  <p class="fg-kicker">...</p>
  <h2 class="fg-title">NOME GIOCO</h2>
  <p class="fg-sub">Sottotitolo 1 riga</p>

  <p class="fg-p">[1 HOOK]</p>
  <p class="fg-p">[2 IMMERSIONE + “È un gioco da tavolo ...”]</p>

  <div class="fg-tagline">Tagline grande (1 frase)</div>

  <p class="fg-p">[3 DIFFERENZA / momento firma]</p>
  <p class="fg-p">[4 TARGET “È il gioco per chi…”]</p>

  <div class="fg-chips">...chips...</div>

  <div class="fg-divider" aria-hidden="true"></div>

  <h3 class="fg-h3">Perché NOME GIOCO ti resta in testa</h3>

  <div class="fg-grid">
    ... 6 <article class="fg-card"> ... </article>
  </div>

  <div class="fg-panel">Frase finale memorabile</div>
</section>
<style>CSS scoped + @media + contrast lock</style>

================================================
STRUTTURA DETTAGLIATA HTML2
================================================
<section id="fg-[slug]-2" class="fg-wrap">
  <p class="fg-kicker">...</p>
  <h2 class="fg-title">Titolo tematico (NON ripetere nome)</h2>
  <p class="fg-sub">Sottotitolo 1 riga</p>

  <p class="fg-p">[1 CUORE]</p>
  <p class="fg-p">[2 SCELTE & RISCHIO]</p>

  <div class="fg-tagline">Tagline grande (1 frase)</div>

  <p class="fg-p">[3 PAYOFF]</p>

  <h3 class="fg-h3">Dove ti premia</h3>

  <div class="fg-grid">
    ... 6 card valore ...
  </div>

  <h3 class="fg-h3">Dove ti mette alla prova</h3>

  <p class="fg-seo">SEO long 2–3 frasi</p>

  <div class="fg-panel">Frase finale memorabile</div>
</section>
<style>CSS scoped + @media + contrast lock</style>

================================================
WEB (googleSearch)
================================================
Usa web SOLO per: tipologia, tema, 3–6 feature distintive.
Non citare fonti esterne. Non dire “BGG/Google/recensioni”.

RISPOSTA: SOLO JSON con "html1", "html2", "html3", "seoTitle", "metaDescription".
`.trim();

  async function callModel(prompt: string): Promise<Output> {
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

    const parsed = JSON.parse(textOutput) as Output;

    // --- stabilità minima anti-markdown ---
    parsed.html1 = stripMarkdownAccident(parsed.html1);
    parsed.html2 = stripMarkdownAccident(parsed.html2);

    // html3: deve essere plain text (ripulisci se scappa)
    parsed.html3 = stripMarkdownAccident(parsed.html3);
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

  // se fallisce anche dopo repair: errore chiaro
  throw new Error(
    `Output non valido dopo repair. Dettagli: ${JSON.stringify(lastErr)}`
  );
};
