import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

type Output = GenerationResult;
const MAX_ATTEMPTS = 3;

function stripMarkdownAccident(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .trim();
}

function stripHtmlTags(input: string): string {
  return input.replace(/<\/?[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
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

  // base structure
  if (!out.html1.includes('<section id="fg-')) err.html1.push('Manca <section id="fg-');
  if (!out.html2.includes('<section id="fg-')) err.html2.push('Manca <section id="fg-');

  if (!out.html1.includes("<style>") || !out.html1.includes("</style>")) err.html1.push("Manca <style>...</style>");
  if (!out.html2.includes("<style>") || !out.html2.includes("</style>")) err.html2.push("Manca <style>...</style>");

  // grid + media
  if (!/\.fg-grid\b/.test(out.html1) || !/@media\s*\(/.test(out.html1))
    err.html1.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");
  if (!/\.fg-grid\b/.test(out.html2) || !/@media\s*\(/.test(out.html2))
    err.html2.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");

  // contrast lock (id-specific)
  const id1 = getSectionId(out.html1);
  if (!id1) err.html1.push("ID section html1 non trovato");
  else {
    const lock1 = new RegExp(
      `#${id1}\\s*,\\s*\\n?#${id1}\\s*\\*\\s*\\{[^}]*color\\s*:\\s*#FFFFFF\\s*!important`,
      "i"
    );
    if (!lock1.test(out.html1)) err.html1.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  const id2 = getSectionId(out.html2);
  if (!id2) err.html2.push("ID section html2 non trovato");
  else {
    const lock2 = new RegExp(
      `#${id2}\\s*,\\s*\\n?#${id2}\\s*\\*\\s*\\{[^}]*color\\s*:\\s*#FFFFFF\\s*!important`,
      "i"
    );
    if (!lock2.test(out.html2)) err.html2.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  // no markdown
  if (/\*\*|```|`/.test(out.html1)) err.html1.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html2)) err.html2.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html3)) err.html3.push("html3 contiene markdown (vietato)");

  // html3 must be plain text
  if (/<\/?[a-z][\s\S]*>/i.test(out.html3)) err.html3.push("html3 contiene HTML (vietato)");

  // paragraphs exact
  const p1 = out.html1.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p1.length !== 4) err.html1.push(`html1 deve avere 4 paragrafi fg-p (trovati ${p1.length})`);
  if (p1.length >= 2 && !p1[1].includes("È un gioco da tavolo"))
    err.html1.push('Manca “È un gioco da tavolo” nel 2° paragrafo');

  const p2 = out.html2.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p2.length !== 3) err.html2.push(`html2 deve avere 3 paragrafi fg-p (trovati ${p2.length})`);

  // seo long
  if (!/class="fg-seo"/.test(out.html2)) err.html2.push("Manca blocco SEO long .fg-seo");

  // cards count
  const c1 = countMatches(out.html1, /class="fg-card"/g);
  if (c1 !== 6) err.html1.push(`html1 deve avere 6 card (trovate ${c1})`);

  const c2 = countMatches(out.html2, /class="fg-card"/g);
  if (c2 !== 6) err.html2.push(`html2 deve avere 6 card (trovate ${c2})`);

  // chips count: span.fg-chip
  const chips = countMatches(out.html1, /class="fg-chip"/g);
  if (chips < 4 || chips > 5) err.html1.push(`html1 chips devono essere 4–5 (trovate ${chips})`);

  // ensure subtitle & tagline exist (beauty/gerarchia)
  if (!/class="fg-sub"/.test(out.html1)) err.html1.push("Manca sottotitolo fg-sub (gerarchia)");
  if (!/class="fg-tagline"/.test(out.html1)) err.html1.push("Manca frase centrale fg-tagline (gerarchia)");
  if (!/class="fg-sub"/.test(out.html2)) err.html2.push("Manca sottotitolo fg-sub (gerarchia)");
  if (!/class="fg-tagline"/.test(out.html2)) err.html2.push("Manca frase centrale fg-tagline (gerarchia)");

  // meta limits
  if ((out.seoTitle ?? "").length > 70) err.meta.push(`seoTitle > 70 (${out.seoTitle.length})`);
  if ((out.metaDescription ?? "").length > 160) err.meta.push(`metaDescription > 160 (${out.metaDescription.length})`);
  if (/:/.test(out.seoTitle ?? "")) err.meta.push("seoTitle contiene ':' (vietato, usa –)");

  return err;
}

function hasErrors(e: ValidationErrors): boolean {
  return Boolean(e.html1.length || e.html2.length || e.html3.length || e.meta.length);
}

function buildRepairPrompt(basePrompt: string, e: ValidationErrors): string {
  const fixes: string[] = [];

  if (e.html1.some((x) => x.includes("È un gioco da tavolo"))) {
    fixes.push(
      `- RISCRIVI SOLO il 2° <p class="fg-p"> di html1: deve iniziare con "È un gioco da tavolo" e finire con punto.`
    );
  }
  if (e.html1.some((x) => x.includes("chips"))) {
    fixes.push(
      `- RIGENERA SOLO la riga chips di html1: ESATTAMENTE 4–5 <span class="fg-chip">...</span> dentro <div class="fg-chips">.`
    );
  }
  if (e.html2.some((x) => x.includes("SEO long"))) {
    fixes.push(
      `- In html2 aggiungi <p class="fg-seo"> (2–3 frasi, 380–520 caratteri) con "gioco da tavolo" + 4 keyword naturali.`
    );
  }
  if (e.html1.some((x) => x.includes("fg-sub")) || e.html2.some((x) => x.includes("fg-sub"))) {
    fixes.push(`- Assicurati che html1 e html2 contengano SEMPRE <p class="fg-sub"> (1 riga) per la gerarchia.`);
  }
  if (e.html1.some((x) => x.includes("fg-tagline")) || e.html2.some((x) => x.includes("fg-tagline"))) {
    fixes.push(`- Assicurati che html1 e html2 contengano SEMPRE <div class="fg-tagline"> (1 frase corta) in evidenza.`);
  }

  // ✅ FIX: forza .fg-grid + @media scoped
  if (e.html1.some((x) => x.includes(".fg-grid con @media")) || e.html2.some((x) => x.includes(".fg-grid con @media"))) {
    fixes.push(
      `- CSS: nello <style> di html1 e html2 DEVI avere .fg-grid e 3 breakpoint @media scoped sull'id (1 col base, 2 col ≥720px, 3 col ≥1050px).`
    );
  }

  // ✅ FIX: forza contrast lock id-specific con sintassi esatta
  if (e.html1.some((x) => x.includes("contrast lock")) || e.html2.some((x) => x.includes("contrast lock"))) {
    fixes.push(
      `- CONTRAST LOCK: all'inizio dello <style> scoped, inserisci ESATTAMENTE "#ID, #ID * { color:#FFFFFF !important; }" usando l'id reale della section (se diverso tra html1 e html2, mettilo per entrambi).`
    );
  }

  if (e.html3.length) {
    fixes.push(`- html3: SOLO TESTO PURO (no HTML, no markdown, no asterischi).`);
  }
  if (e.meta.length) {
    fixes.push(`- seoTitle ≤70 (usa “–”, no “:”), metaDescription ≤160.`);
  }

  const repairInstructions = fixes.length > 0 ? fixes.join("\n") : `- Rigenera completamente l'output rispettando TUTTI i vincoli.`;

  return `
${basePrompt}

================================================
REPAIR (ALTISSIMA PRIORITÀ)
================================================
Hai fallito la validazione. Correggi e restituisci SOLO JSON valido, senza spiegazioni.

CORREGGI SOLO QUESTE COSE (non cambiare estetica/layout se già presenti):
${repairInstructions}

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
    inlineData: { mimeType: "image/jpeg", data: base64Data },
  };

  // ✅ Prompt “elegante”: blocca la gerarchia e il look con blueprint CSS
  const basePrompt = `
Agisci come Master Copywriter SEO e Lead UI Designer per FroGames.
Analizza i colori della scatola nell'immagine e il tema del gioco: ${bggInfo}.
Obiettivo: descrizione Shopify premium, mobile-first, SEO forte, percorso di vendita chiaro, layout moderno e leggibile.

OUTPUT: restituisci SOLO JSON con html1, html2, html3, seoTitle, metaDescription.

================================================
REGOLE CRITICHE ANTI-ERRORI (ALTISSIMA PRIORITÀ)
================================================
1) VIETATO MARKDOWN: niente **asterischi**, niente backtick, niente elenchi markdown.
2) VIETATO TRONCARE: nessuna frase a metà, ogni paragrafo finisce con un punto.
3) VIETATO SCHEDA TECNICA: niente righe giocatori/minuti/età/editore/lingua.
4) Niente “CGE / Czech Games Edition” se non esplicitato dall’utente.

================================================
STRUTTURA (OBBLIGATORIA)
================================================
html1:
<section id="fg-[slug]" class="fg-wrap">
  <p class="fg-kicker">...</p>
  <h2 class="fg-title">NOME GIOCO</h2>
  <p class="fg-sub">Sottotitolo 1 riga</p>

  <p class="fg-p">[1 HOOK]</p>
  <p class="fg-p">[2 IMMERSIONE + SEO]</p>

  <div class="fg-tagline">Frase centrale in evidenza (1 frase).</div>

  <p class="fg-p">[3 DIFFERENZA / momento firma]</p>
  <p class="fg-p">[4 TARGET “È il gioco per chi…”]</p>

  <div class="fg-chips">
    <span class="fg-chip">...</span>
    <span class="fg-chip">...</span>
    <span class="fg-chip">...</span>
    <span class="fg-chip">...</span>
    (opzionale 5a)
  </div>

  <div class="fg-divider" aria-hidden="true"></div>
  <h3 class="fg-h3">Perché NOME GIOCO ti resta in testa</h3>

  <div class="fg-grid">6 card</div>

  <div class="fg-panel">Frase finale memorabile.</div>
</section>
<style>CSS scoped + @media + contrast lock</style>

html2:
<section id="fg-[slug]-2" class="fg-wrap">
  <p class="fg-kicker">...</p>
  <h2 class="fg-title">Titolo tematico (NON ripetere nome)</h2>
  <p class="fg-sub">Sottotitolo 1 riga</p>

  <p class="fg-p">[1 CUORE]</p>
  <p class="fg-p">[2 SCELTE & RISCHIO]</p>

  <div class="fg-tagline">Frase centrale in evidenza (1 frase).</div>

  <p class="fg-p">[3 PAYOFF]</p>

  <h3 class="fg-h3">Dove ti premia</h3>
  <div class="fg-grid">6 card</div>

  <h3 class="fg-h3">Dove ti mette alla prova</h3>
  <p class="fg-seo">SEO long 2–3 frasi.</p>

  <div class="fg-panel">Frase finale memorabile.</div>
</section>
<style>CSS scoped + @media + contrast lock</style>

================================================
SEO POSIZIONATA (OBBLIGATORIA)
================================================
- html1, 2° paragrafo: DEVE INIZIARE con le parole esatte "È un gioco da tavolo" e poi completare con categoria corretta.
- Inserisci "gioco di carte" una sola volta se pertinente.
- html2: <p class="fg-seo"> 2–3 frasi, 380–520 caratteri, contiene "gioco da tavolo" + 4 keyword naturali coerenti, senza elenco tecnico.
- No keyword stuffing: max 1 keyword per frase.

================================================
CARD CALDE (micro-scene)
================================================
6 card per html1 e 6 card per html2.
Ogni card:
- Titolo: emoji + frase evocativa (max ~52 caratteri)
- Testo: 1–2 frasi (max ~140 caratteri)
- Deve far sentire il momento al tavolo, non comandi freddi.

================================================
GERARCHIA TESTO (OBBLIGATORIA: NO PIATTO)
================================================
- fg-title deve sembrare un hero: molto grande, peso forte, shadow.
- fg-sub deve essere evidente ma secondario.
- fg-tagline deve “staccare” visivamente (border-left + glow + font più grande).
- fg-h3 deve separare chiaramente le sezioni.
- Le card devono avere titolo più forte e testo più piccolo.

================================================
CSS BLUEPRINT (OBBLIGATORIO)
================================================
Dentro lo <style> (scoped sull’id) DEVI includere questo stile base (puoi adattare i colori del gradiente, NON cambiare i valori chiave):
- border-radius sezione: 28px
- card border-radius: 26px (NON più basso)
- ombre morbide premium sulle card (visibili)
- hover leggero su desktop
- padding e spacing generosi
- griglia: 1 col mobile, 2 col ≥720px, 3 col ≥1050px (3x2)
- divider sottile
- panel finale più “morbido” e in risalto

================================================
CONTRASTO ASSOLUTO (ANTI TESTO NERO)
================================================
All’inizio del CSS scoped, sempre:
#fg-[slug], #fg-[slug] * { color:#FFFFFF !important; }
e per html2:
#fg-[slug]-2, #fg-[slug]-2 * { color:#FFFFFF !important; }

================================================
HTML3 (COME SI GIOCA) — SOLO TESTO
================================================
Solo testo puro. Niente HTML. Niente markdown. Titoli in MAIUSCOLO. Turno 1) 2) 3) 4).

================================================
SEO META
================================================
seoTitle ≤ 70 (usa “–”, no “:”)
metaDescription ≤ 160 (nome + 1–2 keyword, niente durata/player)

Rispondi SOLO JSON.
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

    parsed.html1 = stripMarkdownAccident(parsed.html1);
    parsed.html2 = stripMarkdownAccident(parsed.html2);

    parsed.html3 = stripMarkdownAccident(parsed.html3);
    if (/<\/?[a-z][\s\S]*>/i.test(parsed.html3)) parsed.html3 = stripHtmlTags(parsed.html3);

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

  throw new Error(`Output non valido dopo repair. Dettagli: ${JSON.stringify(lastErr)}`);
};
