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
Crea una descrizione Shopify che intrattenga, crei desiderio e sia altamente indicizzabile.

OBIETTIVO:
- Mobile-first, scansionabile, moderno. Zero look “anni 2000”.
- Percorso di vendita chiaro: curiosità → immersione → differenza → target → razionalizzazione → payoff.
- SEO naturale: keyword nei punti richiesti (vedi SEO ANCORATA).
- OUTPUT SOLO JSON: html1, html2, html3, seoTitle, metaDescription.

REGOLE DI DESIGN (MANDATORIE):
1) ANALISI COLORI: identifica 3 colori dominanti della scatola e usali nel gradiente del contenitore.
2) TESTO BIANCO: ogni singolo carattere nei blocchi HTML deve avere color:#FFFFFF !important;
3) TITOLI ANTI-TAGLIO (H2/H3): usa SEMPRE questo stile per i titoli principali:
   font-size:clamp(22px,5.5vw,46px); line-height:1.2; word-break:keep-all; overflow-wrap:break-word;
   text-align:center; font-weight:900; text-transform:uppercase;
   text-shadow:3px 3px 10px rgba(0,0,0,0.8); margin-bottom:18px; width:100%;
4) CONTAINER:
   background:linear-gradient(135deg,[c1] 0%,[c2] 60%,[c3] 100%);
   padding:38px 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; border-radius:14px;

UI PREMIUM:
- Separatori sottili:
  <div style="height:1px;width:100%;background:rgba(255,255,255,0.12);margin:22px 0;"></div>
- Panel finale premium:
  background:rgba(0,0,0,0.22); border:1px solid rgba(255,255,255,0.25);
  box-shadow:0 16px 50px rgba(0,0,0,0.45); border-radius:18px; padding:22px;

CARD PREMIUM:
- Base card:
  background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.22);
  box-shadow:0 14px 40px rgba(0,0,0,0.35); border-radius:22px; overflow:hidden; position:relative;
  width:100%; max-width:340px; text-align:left; backdrop-filter:blur(6px); padding:18px;
- Accent bar sempre in alto:
  <div style="height:4px;width:100%;background:rgba(255,255,255,0.35);position:absolute;top:0;left:0;"></div>

GRIGLIA “SENZA BUCHI” (IMPORTANTISSIMO):
- Non usare auto-fit qui: voglio layout stabile.
- Usa questa griglia IN ENTRAMBI I BLOCCHI (html1 e html2):
  display:grid; gap:18px; width:100%; margin:26px auto;
  grid-template-columns:1fr;
  @media(min-width:640px){ grid-template-columns:repeat(2,minmax(0,1fr)); }
  @media(min-width:980px){ grid-template-columns:repeat(3,minmax(0,1fr)); }
- Con 6 card: su desktop deve risultare SEMPRE 3x2.

TIPOGRAFIA (MANDATORIA):
- Paragrafi: font-size:17px; line-height:1.65; margin-bottom:14px; text-align:left;
- Kicker (sopra H2): font-size:12px; letter-spacing:0.28em; text-transform:uppercase; opacity:0.85; text-align:center; margin:0 0 10px 0;
- Subheadline (sotto H2): font-size:16px; opacity:0.9; text-align:center; margin-top:-10px; margin-bottom:18px;

RITMO VISIVO (MANDATORIO):
- Ogni blocco deve seguire: kicker → h2 → sottotitolo → paragrafi brevi → tagline grande → accent row → separatore → griglia → (SEO long solo in html2) → panel finale.

TAGLINE GRANDE (1 per blocco):
font-size:clamp(20px,4vw,32px); font-weight:800; font-style:italic; text-align:center;
margin:34px 0; padding:0 18px; text-shadow:2px 2px 4px rgba(0,0,0,0.5);
border-left:4px solid #fff; width:100%; box-sizing:border-box;

ANTI-MURO (REGOLA DURA):
- Ogni <p> massimo 2 frasi.
- Ogni paragrafo massimo ~220 caratteri (non parole). Se sfori, riscrivi.
- Niente periodi lunghi, niente “mentre/dove/in cui” a catena.
- Niente ripetizioni: evita di dire due volte la stessa cosa con parole diverse.

SEO ANCORATA (OBBLIGATORIA):
- HTML1, nel 2° paragrafo deve comparire testualmente:
  “È un gioco da tavolo …” + deve includere anche “gioco di carte”.
- Se pertinente, puoi usare UNA volta “gioco di prese” e UNA volta “trick-taking” (massimo una volta ciascuno).
- HTML2, nel paragrafo SEO long deve includere “gioco da tavolo” + 3–5 keyword coerenti (es. gioco competitivo, gestione mano, push your luck, bluff, trick-taking… in base al gioco), in frasi naturali.

CHIPS (MANDATORIE IN HTML1, MAX 5):
- Inserisci max 5 chips sotto i paragrafi (prima del separatore).
- Devono includere almeno 2 keyword tra: gioco da tavolo, gioco di carte, gioco di prese, gioco competitivo.
- Stile chip:
  display:inline-block; padding:8px 12px; border-radius:999px;
  background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.20);
  margin:6px 6px 0 0; font-size:12px; color:#FFFFFF !important;

ACCENT ROW (MANDATORIA, per evitare header vuoto):
- Dopo la tagline grande, inserisci una “accent row” (non chips) con 4 elementi corti (2–3 parole),
  separati da puntini o piccole linee, stile leggero e centrato (simile a una barra “firma”).

CARD “CALDE” (FONDAMENTALE):
- Vietati titoli astratti tipo TENSIONE/RISATE/STRATEGIA da soli.
- Ogni card deve essere: TITOLO = micro-azione (max 3 parole, MAIUSCOLO) + TESTO = payoff (1 frase, max 11 parole).
- HTML1: 6 card “esperienza/atmosfera” (micro-scene di tavolo).
- HTML2: 6 card sui temi (in quest’ordine) ma rese “umane”:
  1) Strategia (gesto/decisione)
  2) Combo (incastro/tempo)
  3) Profondità (lettura/ritorno)
  4) Flusso (ritmo/turni)
  5) Bilanciamento (inseguimento/rebound)
  6) Decisioni (scelta dolorosa)

CONTENUTO (SEMPRE 3 OUTPUT):

HTML1 (ATMOSFERA):
- <div> container con gradiente
- Kicker (sopra H2) tipo: “FROGAMES SELECTION” / “SUL TAVOLO” / “SERATA PERFETTA”
- <h2> Nome gioco
- Subheadline 1 riga evocativa
- 4 paragrafi brevi (2 frasi max) in ordine:
  1) Hook cinematografico (solo esperienza)
  2) Cosa si prova + “È un gioco da tavolo …” + “gioco di carte” (obbligatori)
  3) Differenza / “momento firma” (senza dire “meccanica”)
  4) Target: “È il gioco per chi…” + gancio
- Tagline grande tra P2 e P3
- Accent row (4 elementi)
- Chips (max 5)
- Separatore
- Griglia 6 card calde
- Panel finale con frase memorabile (corta, da trailer)

HTML2 (PERCHÉ FUNZIONA):
- <div> container con gradiente coerente
- Kicker
- <h2> Titolo tematico (NON ripetere “Piñatas” e basta)
- Subheadline 1 riga
- 3 paragrafi brevi (2 frasi max) in ordine:
  1) Il cuore raccontato bene (no tutorial)
  2) Scelte e rischio (pressione / timing / lettura)
  3) Payoff: perché resta addosso (ritmo, interazione, rivincita)
- Tagline grande tra P2 e P3
- Accent row (4 elementi)
- Separatore
- Griglia 6 card calde sui 6 temi
- Paragrafo SEO long (max 420 caratteri, 3 frasi max) con “gioco da tavolo” + keyword coerenti, naturale.
- Panel finale con frase memorabile

HTML3 (COME SI GIOCA) — SOLO TESTO:
- Solo testo, niente HTML, niente markdown, niente asterischi.
- Titoli in MAIUSCOLO.
- Righe vuote tra paragrafi.
- Passi del turno con 1) 2) 3) 4).
- Breve e leggibile.

SEO META:
- seoTitle: max 70 caratteri, formato: “[Nome] – [hook] + 1 keyword coerente”, usa “–” e mai “:”.
- metaDescription: max 160 caratteri, include nome + 1–2 keyword coerenti, tono FroGames, niente player count/durata.

RISPOSTA: solo JSON con "html1","html2","html3","seoTitle","metaDescription".
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
    return JSON.parse(textOutput) as GenerationResult;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Errore durante la creazione della descrizione. Riprova.");
  }
};
