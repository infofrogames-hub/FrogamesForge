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

/* ============================
   SEO TITLE SANITIZATION (NEW)
   ============================ */
function normalizeSeoTitle(input: string): string {
  return (input ?? "")
    .replace(/:/g, " – ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function clamp(input: string, max: number): string {
  const s = (input ?? "").trim();
  return s.length <= max ? s : s.slice(0, max).replace(/\s+\S*$/, "").trim();
}
/* ============================ */

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

  if (!out.html1.includes("<style>") || !out.html1.includes("</style>"))
    err.html1.push("Manca <style>...</style>");
  if (!out.html2.includes("<style>") || !out.html2.includes("</style>"))
    err.html2.push("Manca <style>...</style>");

  // grid + media
  if (!/\.fg-grid\b/.test(out.html1) || !/@media\s*\(/.test(out.html1))
    err.html1.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");
  if (!/\.fg-grid\b/.test(out.html2) || !/@media\s*\(/.test(out.html2))
    err.html2.push("Manca .fg-grid con @media (1/2/3 colonne) scoped");

  // contrast lock (tollerante)
  const id1 = getSectionId(out.html1);
  if (!id1) err.html1.push("ID section html1 non trovato");
  else {
    const lock1 = new RegExp(
      `#${id1}[\\s\\S]*color\\s*:\\s*#FFFFFF\\s*!important`,
      "i"
    );
    if (!lock1.test(out.html1))
      err.html1.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  const id2 = getSectionId(out.html2);
  if (!id2) err.html2.push("ID section html2 non trovato");
  else {
    const lock2 = new RegExp(
      `#${id2}[\\s\\S]*color\\s*:\\s*#FFFFFF\\s*!important`,
      "i"
    );
    if (!lock2.test(out.html2))
      err.html2.push("Manca contrast lock (#id, #id * { color:#fff !important; })");
  }

  // no markdown
  if (/\*\*|```|`/.test(out.html1)) err.html1.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html2)) err.html2.push("Contiene markdown (** o `)");
  if (/\*\*|```|`/.test(out.html3)) err.html3.push("html3 contiene markdown (vietato)");

  // html3 plain text
  if (/<\/?[a-z][\s\S]*>/i.test(out.html3))
    err.html3.push("html3 contiene HTML (vietato)");

  // paragraphs
  const p1 = out.html1.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p1.length !== 4)
    err.html1.push(`html1 deve avere 4 paragrafi fg-p (trovati ${p1.length})`);
  if (p1.length >= 2 && !p1[1].includes("È un gioco da tavolo"))
    err.html1.push('Manca “È un gioco da tavolo” nel 2° paragrafo');

  const p2 = out.html2.match(/<p\s+class="fg-p">[\s\S]*?<\/p>/gi) ?? [];
  if (p2.length !== 3)
    err.html2.push(`html2 deve avere 3 paragrafi fg-p (trovati ${p2.length})`);

  if (!/class="fg-seo"/.test(out.html2))
    err.html2.push("Manca blocco SEO long .fg-seo");

  // cards
  if (countMatches(out.html1, /class="fg-card"/g) !== 6)
    err.html1.push("html1 deve avere 6 card");
  if (countMatches(out.html2, /class="fg-card"/g) !== 6)
    err.html2.push("html2 deve avere 6 card");

  // chips
  const chips = countMatches(out.html1, /class="fg-chip"/g);
  if (chips < 4 || chips > 5)
    err.html1.push(`html1 chips devono essere 4–5 (trovate ${chips})`);

  // hierarchy
  if (!/class="fg-sub"/.test(out.html1)) err.html1.push("Manca fg-sub");
  if (!/class="fg-tagline"/.test(out.html1)) err.html1.push("Manca fg-tagline");
  if (!/class="fg-sub"/.test(out.html2)) err.html2.push("Manca fg-sub");
  if (!/class="fg-tagline"/.test(out.html2)) err.html2.push("Manca fg-tagline");

  // meta
  if ((out.seoTitle ?? "").length > 70)
    err.meta.push(`seoTitle > 70 (${out.seoTitle.length})`);
  if ((out.metaDescription ?? "").length > 160)
    err.meta.push(`metaDescription > 160 (${out.metaDescription.length})`);
  if (/:/.test(out.seoTitle ?? ""))
    err.meta.push("seoTitle contiene ':' (vietato, usa –)");

  return err;
}

function hasErrors(e: ValidationErrors): boolean {
  return Boolean(e.html1.length || e.html2.length || e.html3.length || e.meta.length);
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

    const parsed = JSON.parse(response.text!) as Output;

    parsed.html1 = stripMarkdownAccident(parsed.html1);
    parsed.html2 = stripMarkdownAccident(parsed.html2);

    parsed.html3 = stripMarkdownAccident(parsed.html3);
    parsed.html3 = stripHtmlTags(parsed.html3);

    // ✅ FIX DEFINITIVO SEO TITLE
    parsed.seoTitle = clamp(normalizeSeoTitle(parsed.seoTitle), 70);
    parsed.metaDescription = clamp(parsed.metaDescription ?? "", 160);

    return parsed;
  };

  let lastErr: ValidationErrors | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const out = await callModel("PROMPT OMITTED FOR BREVITY");
    const err = validateOutput(out);

    if (!hasErrors(err)) return out;

    console.warn(`Attempt ${attempt} failed`, err);
    lastErr = err;
  }

  throw new Error(`Output non valido dopo repair. Dettagli: ${JSON.stringify(lastErr)}`);
};
