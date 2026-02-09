import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResult } from "../types";

type GenJson = {
  html1: string;
  html2: string;
  html3: string;
  seoTitle: string;
  metaDescription: string;
};

function validateOutput(parsed: GenJson): string[] {
  const errors: string[] = [];

  const must = (cond: boolean, msg: string) => {
    if (!cond) errors.push(msg);
  };

  const has = (s: string, needle: string) => s.includes(needle);

  const vHtml = (html: string) => {
    must(has(html, `<section id="fg-`), `Manca <section id="fg-...">`);
    must(has(html, `<style>`), `Manca <style>`);
    must(has(html, `</style>`), `Manca </style>`);
    must(/\.fg-grid\s*\{/i.test(html), `Manca .fg-grid`);
    must(/@media\s*\(min-width:\s*720px\)/i.test(html), `Manca @media 720px`);
    must(/@media\s*\(min-width:\s*1050px\)/i.test(html), `Manca @media 1050px`);

    // contrast lock (scoped) – we just check " #fg-... , #fg-... * { color:#FFFFFF !important; } "
    must(
      /#fg-[a-z0-9\-]+,\s*#fg-[a-z0-9\-]+\s*\*\s*\{\s*color:\s*#FFFFFF\s*!important;\s*\}/i.test(
        html
      ),
      `Manca contrast lock scoped`
    );

    // grid breakpoints
    must(/grid-template-columns:\s*1fr/i.test(html), `Manca 1 colonna mobile`);
    must(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/i.test(html),
      `Manca 2 colonne tablet`
    );
    must(
      /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/i.test(html),
      `Manca 3 colonne desktop`
    );

    // SEO anchors in html1/html2
    // html1 must contain exact "È un gioco da tavolo" in paragraph 2 – we can't reliably parse the 2nd p,
    // but we can require it appears at least once.
    must(html.includes("È un gioco da tavolo"), `Manca “È un gioco da tavolo”`);
    // html2 must contain fg-seo
    must(/class="fg-seo"/i.test(html), `Manca blocco SEO long .fg-seo`);
  };

  vHtml(parsed.html1);
  vHtml(parsed.html2);

  // html3 must be plain text
  if (/<[a-z][\s\S]*>/i.test(parsed.html3)) errors.push("html3 contiene HTML (vietato)");
  if (parsed.html3.includes("**") || parsed.html3.includes("`")) errors.push("html3 contiene markdown (vietato)");

  // Meta length
  if (parsed.seoTitle.length > 70) errors.push("seoTitle supera 70 caratteri");
  if (parsed.metaDescription.length > 160) errors.push("metaDescription supera 160 caratteri");

  return errors;
}

function stripMarkdownLike(s: string) {
  // Defensive: remove markdown bold/backticks if the model slips (shouldn't happen)
  return s.replace(/\*\*/g, "").replace(/`/g, "");
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

  // 🔒 VERBATIM CSS TEMPLATE (model must copy this and ONLY replace: SLUG + c1/c2/c3)
  const CSS_TEMPLATE_VERBATIM = `
/* =============== FroGames Scoped Template (VERBATIM) =============== */
/* Replace ONLY: [SLUG] and the 3 gradient colors (c1,c2,c3). Do not rename classes. */

#fg-[SLUG],
#fg-[SLUG] * { color:#FFFFFF !important; }

#fg-[SLUG]{
  --c1: c1;
  --c2: c2;
  --c3: c3;
  --card: rgba(255,255,255,.10);
  --card2: rgba(255,255,255,.08);
  --stroke: rgba(255,255,255,.16);
  --glow: rgba(255,255,255,.14);
  --shadow: rgba(0,0,0,.38);
  --shadow2: rgba(0,0,0,.28);

  position:relative;
  padding: 2.2rem 1.35rem;
  border-radius: 28px;
  overflow:hidden;

  background:
    radial-gradient(circle at 14% 18%, rgba(255,255,255,.12), transparent 55%),
    radial-gradient(circle at 78% 30%, rgba(255,255,255,.10), transparent 58%),
    radial-gradient(circle at 70% 86%, rgba(255,255,255,.08), transparent 60%),
    linear-gradient(135deg, var(--c1) 0%, var(--c2) 60%, var(--c3) 100%);

  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 18px 60px var(--shadow);
  font-family: Inter, system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
}

#fg-[SLUG]::before{
  content:"";
  position:absolute; inset:-20%;
  background:
    radial-gradient(circle, rgba(255,255,255,.20) 0 2px, transparent 3px) 12% 22%/180px 180px,
    radial-gradient(circle, rgba(255,255,255,.14) 0 2px, transparent 3px) 62% 18%/220px 220px,
    radial-gradient(circle, rgba(255,255,255,.12) 0 2px, transparent 3px) 78% 66%/200px 200px,
    radial-gradient(circle, rgba(255,255,255,.10) 0 2px, transparent 3px) 28% 74%/240px 240px;
  opacity:.55;
  pointer-events:none;
}

#fg-[SLUG] .fg-kicker{
  margin:0 0 .6rem 0;
  text-align:center;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
  font-size: .78rem;
  opacity: .9;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-title{
  margin:0 0 .55rem 0;
  text-align:center;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: -.02em;
  font-size: clamp(22px, 5.5vw, 46px);
  line-height: 1.12;
  word-break: keep-all;
  overflow-wrap: break-word;
  text-shadow: 3px 3px 10px rgba(0,0,0,0.8);
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-sub{
  margin:0 0 1.05rem 0;
  text-align:center;
  font-size: 1.02rem;
  opacity: .92;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-p{
  margin:.75rem 0;
  line-height: 1.75;
  font-size: 1.05rem;
  opacity: .94;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-tagline{
  margin: 1.25rem 0 1.15rem;
  padding: .95rem 1.05rem;
  border-radius: 18px;
  font-weight: 900;
  font-style: italic;
  font-size: clamp(18px, 3.2vw, 28px);
  line-height: 1.2;
  text-align:center;
  border: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(90deg, rgba(0,0,0,.16), rgba(255,255,255,.06));
  box-shadow: 0 14px 34px var(--shadow2);
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-chips{
  margin: 1.05rem 0 .45rem;
  display:flex;
  flex-wrap:wrap;
  gap:.5rem .55rem;
  justify-content:center;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-chip{
  display:inline-flex;
  align-items:center;
  padding: .5rem .75rem;
  border-radius: 999px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.18);
  font-size: .78rem;
  font-weight: 850;
  letter-spacing: .01em;
  box-shadow: 0 10px 24px rgba(0,0,0,.22);
}

#fg-[SLUG] .fg-divider{
  height:1px;
  width:100%;
  background: rgba(255,255,255,.14);
  margin: 1.25rem 0 1.15rem;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-h3{
  margin: 0 0 .75rem 0;
  text-align:left;
  font-size: 1.22rem;
  font-weight: 950;
  letter-spacing: -.01em;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-grid{
  display:grid;
  grid-template-columns: 1fr;
  gap: .95rem;
  margin-top: .65rem;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-card{
  border-radius: 22px;
  padding: 1.05rem 1.05rem;
  background: linear-gradient(180deg, var(--card), var(--card2));
  border: 1px solid var(--stroke);
  box-shadow: 0 16px 40px rgba(0,0,0,.30);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  position:relative;
  overflow:hidden;
}

#fg-[SLUG] .fg-card::before{
  content:"";
  position:absolute;
  top:0; left:0; right:0;
  height: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,.42), rgba(255,255,255,.14));
  opacity:.85;
}

#fg-[SLUG] .fg-card h4{
  margin:0 0 .45rem 0;
  font-size: 1.08rem;
  font-weight: 950;
  letter-spacing: -.01em;
  line-height: 1.15;
}

#fg-[SLUG] .fg-card p{
  margin:0;
  font-size: .98rem;
  line-height: 1.55;
  opacity: .92;
}

#fg-[SLUG] .fg-seo{
  margin: .9rem 0 0;
  padding: .95rem 1rem;
  border-radius: 18px;
  background: rgba(0,0,0,.18);
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 14px 40px rgba(0,0,0,.30);
  line-height: 1.7;
  font-size: 1.02rem;
  opacity:.95;
  position:relative;
  z-index:1;
}

#fg-[SLUG] .fg-panel{
  margin-top: 1.05rem;
  padding: 1.05rem 1.05rem;
  border-radius: 18px;
  background: rgba(0,0,0,.22);
  border: 1px solid rgba(255,255,255,.22);
  box-shadow: 0 18px 52px rgba(0,0,0,.40);
  font-weight: 900;
  font-style: italic;
  text-align:center;
  position:relative;
  z-index:1;
}

/* GRID BREAKPOINTS (OBBLIGATORI) */
@media (min-width: 720px){
  #fg-[SLUG]{ padding: 2.3rem 1.75rem; }
  #fg-[SLUG] .fg-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1050px){
  #fg-[SLUG]{ padding: 2.5rem 2.05rem; }
  #fg-[SLUG] .fg-grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
/* =============== end template =============== */
`.trim();

  const prompt = `
Agisci come Master Copywriter SEO e Lead UI Designer per FroGames.
Analizza i colori della scatola nell'immagine e il tema del gioco: ${bggInfo}.
Obiettivo: descrizione Shopify premium, mobile-first, SEO forte e naturale, percorso di vendita chiaro, layout moderno.

OUTPUT: restituisci SOLO JSON con html1, html2, html3, seoTitle, metaDescription.

========================
SEO (FOCUS ALTO)
========================
- html1 paragrafo 2: deve contenere testualmente “È un gioco da tavolo …” + categoria corretta.
- Inserisci 1 keyword primaria + 2 secondarie già nei paragrafi (senza suonare “SEO”).
- html2: blocco <p class="fg-seo"> 380–520 caratteri, 2–3 frasi, includi “gioco da tavolo” + 4 keyword naturali coerenti (es: eurogame, gioco strategico, gestione risorse, gestione mano, motore di carte, esplorazione spaziale, ecc.) senza elenco tecnico e senza stuffing (max 1 keyword per frase).
- Vietato citare fonti esterne (BGG/Google/recensioni).

========================
REGOLE CRITICHE
========================
- Vietato markdown: niente **, niente backtick, niente elenchi markdown.
- Vietato “scheda tecnica”: niente giocatori/minuti/età/editore/lingua.
- Vietato troncare: frasi complete, ogni paragrafo finisce con un punto.
- Card “calde”: micro-scene stile Speakeasy/Dance of Ibexes.
  Titolo: emoji + frase evocativa (max ~52 caratteri).
  Testo: 1–2 frasi, max ~140 caratteri.
  Vietati titoli comando e titoli astratti freddi.

========================
HTML OBBLIGATORIO
========================
- html1: <section id="fg-[slug]"> ... </section> + <style>...</style> subito dopo.
- html2: <section id="fg-[slug]-2"> ... </section> + <style>...</style> subito dopo.
- Il CSS deve essere SCOPED e DEVE essere COPIATO dal template VERBATIM qui sotto.
  Regola: cambia SOLO [SLUG] e i colori c1/c2/c3. NON cambiare classi, NON rimuovere @media.

TEMPLATE CSS VERBATIM (OBBLIGO):
${CSS_TEMPLATE_VERBATIM}

========================
STRUTTURA CONTENUTO
========================
HTML1:
- kicker (fg-kicker)
- h2 titolo (fg-title) = nome gioco
- sub (fg-sub)
- 4 paragrafi fg-p (260–480 caratteri, max 2 frasi) in ordine:
  1) HOOK (curiosità)
  2) IMMERSIONE + SEO: deve contenere “È un gioco da tavolo ...”
  (poi fg-tagline: 1 frase)
  3) DIFFERENZA / momento firma
  4) TARGET “È il gioco per chi…” con 2 micro-frasi se ami/se cerchi
- chips fg-chips con 4–5 span fg-chip (almeno 2 con keyword)
- fg-divider
- h3 fg-h3 “Perché [NOME] ti resta in testa”
- fg-grid con 6 card (article fg-card > h4 + p)
- fg-panel (1 frase memorabile)

HTML2:
- kicker + h2 tematico (non ripetere titolo html1) + sub
- 3 paragrafi fg-p (260–480 caratteri, max 2 frasi) in ordine:
  1) CUORE (razionalizzazione bella da leggere)
  2) SCELTE & RISCHIO
  (poi fg-tagline: 1 frase)
  3) PAYOFF
- h3 fg-h3 “Dove ti premia”
- fg-grid con 6 card valore (temi: strategia/combo/profondità/flusso/bilanciamento/decisioni ma in forma calda)
- h3 fg-h3 “Dove ti mette alla prova”
- p fg-seo (SEO long)
- fg-panel (1 frase memorabile)

HTML3:
- SOLO TESTO PURO, niente HTML, niente markdown, niente asterischi.
- Titoli in MAIUSCOLO, righe vuote, turno 1)2)3)4).

META:
- seoTitle <=70 caratteri, usa “–” mai “:”
- metaDescription <=160 caratteri, nome + 1–2 keyword, tono FroGames.

Rispondi SOLO JSON.
`;

  const buildRepairPrompt = (badJson: string, errors: string[]) => `
Il JSON non rispetta i vincoli.
Correggi SOLO ciò che serve, mantenendo lo stile.
- Vietato markdown (** o \`).
- Vietato scheda tecnica.
- Vietato troncare frasi.

ERRORI:
- ${errors.join("\n- ")}

JSON DA RIPARARE:
${badJson}

Rispondi SOLO JSON valido.
`;

  const maxAttempts = 3;
  let lastText = "";
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const usePrompt = attempt === 1 ? prompt : buildRepairPrompt(lastText, lastErrors);

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: { parts: [imagePart, { text: usePrompt }] },
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

    lastText = textOutput;

    let parsed: GenJson;
    try {
      parsed = JSON.parse(textOutput) as GenJson;
    } catch {
      lastErrors = ["JSON non parsabile"];
      continue;
    }

    // Defensive strip (in case)
    parsed.html1 = stripMarkdownLike(parsed.html1);
    parsed.html2 = stripMarkdownLike(parsed.html2);
    parsed.html3 = stripMarkdownLike(parsed.html3);
    parsed.seoTitle = stripMarkdownLike(parsed.seoTitle);
    parsed.metaDescription = stripMarkdownLike(parsed.metaDescription);

    const errors = validateOutput(parsed);
    if (errors.length === 0) return parsed as unknown as GenerationResult;

    lastErrors = errors;
  }

  throw new Error(
    `Output non valido dopo repair. Dettagli: ${JSON.stringify(
      { html1: lastErrors, html2: lastErrors },
      null,
      0
    )}`
  );
};
