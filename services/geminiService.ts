import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

type Output = GenerationResult;
const MAX_ATTEMPTS = 3;

function stripMarkdownAccident(input: string): string {
  return (input ?? "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .trim();
}

function stripHtmlTags(input: string): string {
  return (input ?? "").replace(/<\/?[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function countMatches(haystack: string, re: RegExp): number {
  const m = (haystack ?? "").match(re);
  return m ? m.length : 0;
}

function getSectionId(html: string): string | null {
  const m = (html ?? "").match(/<section\s+id="([^"]+)"/i);
  return m?.[1] ?? null;
}

function normalizeSeoTitle(input: string): string {
  return (input ?? "")
    .replace(/:/g, " – ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function clamp(input: string, max: number): string {
  const s = (input ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "").trim();
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
  if (!out.html1?.includes('<section id="fg-')) err.html1.push('Manca <section id="fg-');
  if (!out.html2?.includes('<section id="fg-')) err.html2.push('Manca <section id="fg-');

  if (!out.html1?.includes("<style>") || !out.html1?.includes("</style>")) err.html1.push("Manca <style>...</style>");
  if (!out.html2?.includes("<style>") || !out.html2?.includes("</style>")) err.html2.push("Manca <style>...</style>");

  // grid + media
  if (!/\.fg-grid\b/.test(out.html1 ?? "") || !/@media\s*\(/.test(out.html1 ?? ""))
    err.html1.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");
  if (!/\.fg-grid\b/.test(out.html2 ?? "") || !/@media\s*\(/.test(out.html2 ?? ""))
    err.html2.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");

  // contrast lock (tolerant)
  const id1 = getSectionId(out.html1 ?? "");
  if (!id1) err.html1.push("ID section html1 non trovato");
  else {
    const lock1 = new RegExp(`#${id1}[\\s\\S]*color\\s*:\\s*#FFFFFF\\s*!important`, "i");
    if (!lock1.test(out.html1 ?? "")) err.html1.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  const id2 = getSectionId(out.html2 ?? "");
  if (!id2) err.html2.push("ID section html2 non trovato");
  else {
    const lock2 = new RegExp(`#${id2}[\\s\\S]*color\\s*:\\s*#FFFFFF\\s*!important`, "i");
    if (!lock2.test(out.html2 ?? "")) err.html2.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  // no markdown
  if (/\*\*|```|`/.test(out.html1 ?? "")) err.html1.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html2 ?? "")) err.html2.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html3 ?? "")) err.html3.push("html3 contiene markdown (vietato)");

  // html3 must be plain text
  if (/<\/?[a-z][\s\S]*>/i.test(out.html3 ?? "")) err.html3.push("html3 contiene HTML (vietato)");

  // paragraphs exact
  const p1 = (out.html1 ?? "").match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p1.length !== 4) err.html1.push(`html1 deve avere 4 paragrafi fg-p (trovati ${p1.length})`);
  if (p1.length >= 2 && !p1[1].includes("È un gioco da tavolo"))
    err.html1.push('Manca “È un gioco da tavolo” nel 2° paragrafo');

  const p2 = (out.html2 ?? "").match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p2.length !== 3) err.html2.push(`html2 deve avere 3 paragrafi fg-p (trovati ${p2.length})`);

  // seo long
  if (!/class="fg-seo"/.test(out.html2 ?? "")) err.html2.push("Manca blocco SEO long .fg-seo");

  // cards count
  const c1 = countMatches(out.html1 ?? "", /class="fg-card"/g);
  if (c1 !== 6) err.html1.push("html1 deve avere 6 card");

  const c2 = countMatches(out.html2 ?? "", /class="fg-card"/g);
  if (c2 !== 6) err.html2.push("html2 deve avere 6 card");

  // chips count
  const chips = countMatches(out.html1 ?? "", /class="fg-chip"/g);
  if (chips < 4 || chips > 5) err.html1.push(`html1 chips devono essere 4–5 (trovate ${chips})`);

  // hierarchy checks
  if (!/class="fg-sub"/.test(out.html1 ?? "")) err.html1.push("Manca fg-sub");
  if (!/class="fg-tagline"/.test(out.html1 ?? "")) err.html1.push("Manca fg-tagline");
  if (!/class="fg-sub"/.test(out.html2 ?? "")) err.html2.push("Manca fg-sub");
  if (!/class="fg-tagline"/.test(out.html2 ?? "")) err.html2.push("Manca fg-tagline");

  // meta limits
  if ((out.seoTitle ?? "").length > 70) err.meta.push(`seoTitle > 70 (${out.seoTitle.length})`);
  if ((out.metaDescription ?? "").length > 160) err.meta.push(`metaDescription > 160 (${out.metaDescription.length})`);
  if (/:/.test(out.seoTitle ?? "")) err.meta.push("seoTitle contiene ':' (vietato, usa –)");

  return err;
}

function hasErrors(e: ValidationErrors): boolean {
  return Boolean(e.html1.length || e.html2.length || e.html3.length || e.meta.length);
}

// ✅ FULL-REGEN detector migliorato: include anche output vuoti
function buildRepairPrompt(basePrompt: string, e: ValidationErrors, lastOut?: Output): string {
  const all = [...e.html1, ...e.html2, ...e.html3, ...e.meta];

  const emptyHtml =
    !lastOut?.html1?.trim() ||
    !lastOut?.html2?.trim();

  const hasStructuralFailure =
    emptyHtml ||
    all.some((x) => x.includes('Manca <section id="fg-')) ||
    all.some((x) => x.includes("Manca <style>")) ||
    all.some((x) => x.includes("Manca .fg-grid")) ||
    all.some((x) => x.includes("ID section")) ||
    all.some((x) => x.includes("paragrafi fg-p (trovati 0)"));

  if (hasStructuralFailure) {
    return `
${basePrompt}

================================================
REPAIR (ALTISSIMA PRIORITÀ)
================================================
Hai violato la STRUTTURA OBBLIGATORIA (section/style/grid/gerarchia/paragrafi mancanti o output vuoto).
RIGENERA COMPLETAMENTE rispettando ESATTAMENTE la STRUTTURA richiesta per html1 e html2:
- <section id="fg-[slug]"> ... </section> + <style>...</style>
- <section id="fg-[slug]-2"> ... </section> + <style>...</style>
- 4 paragrafi fg-p in html1, 3 paragrafi fg-p in html2
- 6 card in html1, 6 card in html2
- chips 4–5 span.fg-chip
- fg-sub e fg-tagline presenti
Rispondi SOLO JSON valido. Nessuna spiegazione.
`.trim();
  }

  // micro-fix (come avevi)
  const fixes: string[] = [];

  if (e.html1.some((x) => x.includes("È un gioco da tavolo"))) {
    fixes.push(`- RISCRIVI SOLO il 2° <p class="fg-p"> di html1: deve iniziare con "È un gioco da tavolo" e finire con punto.`);
  }
  if (e.html1.some((x) => x.includes("chips"))) {
    fixes.push(`- RIGENERA SOLO la riga chips di html1: ESATTAMENTE 4–5 <span class="fg-chip">...</span> dentro <div class="fg-chips">.`);
  }
  if (e.html2.some((x) => x.includes("SEO long"))) {
    fixes.push(`- In html2 aggiungi <p class="fg-seo"> (2–3 frasi, 380–520 caratteri) con "gioco da tavolo" + 4 keyword naturali.`);
  }
  if (e.meta.length) {
    fixes.push(`- seoTitle ≤70 (usa “–”, no “:”), metaDescription ≤160.`);
  }

  const repairInstructions =
    fixes.length > 0 ? fixes.join("\n") : `- Rigenera completamente l'output rispettando TUTTI i vincoli.`;

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

  // ✅ IMPORTANTISSIMO: deve essere un template literal completo con backtick
  const basePrompt = `
[INCOLLA QUI IL TUO PROMPT LUNGO COMPLETO, QUELLO "ELEGANTE", SENZA TAGLI]
Tema/contesto: ${bggInfo}
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
    parsed.html3 = stripHtmlTags(parsed.html3);

    parsed.seoTitle = clamp(normalizeSeoTitle(parsed.seoTitle), 70);
    parsed.metaDescription = clamp(parsed.metaDescription ?? "", 160);

    return parsed;
  }

  let lastErr: ValidationErrors | null = null;
  let lastOut: Output | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prompt = attempt === 1 ? basePrompt : buildRepairPrompt(basePrompt, lastErr!, lastOut);
    const out = await callModel(prompt);
    lastOut = out;

    const err = validateOutput(out);
    if (!hasErrors(err)) return out;

    console.warn(`Attempt ${attempt} failed`, err);
    lastErr = err;
  }

  throw new Error(`Output non valido dopo repair. Dettagli: ${JSON.stringify(lastErr)}`);
};
