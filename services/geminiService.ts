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

REGOLE DI DESIGN E CONTRASTO (MANDATORIE):
1) ANALISI COLORI: Identifica i colori dominanti della scatola e crea un gradiente di sfondo armonioso.
2) TESTO BIANCO: Ogni singolo carattere nei blocchi HTML deve avere color: #FFFFFF !important;.
3) TITOLI ANTI-TAGLIO (per H2/H3): Usa SEMPRE questo stile per i titoli principali:
   "font-size: clamp(22px, 5.5vw, 46px); line-height: 1.2; word-break: keep-all; overflow-wrap: break-word; text-align: center; font-weight: 900; text-transform: uppercase; text-shadow: 3px 3px 10px rgba(0,0,0,0.8); margin-bottom: 30px; width: 100%;"
4) GRID CENTRATO MOBILE (html1 e html2):
   "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; width: 100%; justify-content: center; justify-items: center; margin: 30px auto;"
5) LAYOUT BASE CONTENITORE:
   - background: linear-gradient(135deg, [colore1] 0%, [colore2] 50%, [colore3] 100%);
   - padding: 40px 20px;
   - font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
   - border-radius: 14px;

UI PREMIUM (MANDATORIO – NO LOOK ANNI 2000):
- Evita cornici con bordi spessi e box “tristi”. Preferisci bordi sottili, glow morbido e glass.
- Inserisci separatori tra sezioni:
  <div style="height: 1px; width: 100%; background: rgba(255,255,255,0.12); margin: 28px 0;"></div>

CARD PREMIUM (per le griglie):
- Usa sempre questa base per ogni card:
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 14px 40px rgba(0,0,0,0.35);
  border-radius: 22px;
  overflow: hidden;
  position: relative;
  width: 100%;
  max-width: 340px;
  text-align: center;
  backdrop-filter: blur(6px);

- Dentro ogni card, aggiungi una “accent bar” in alto:
  <div style="height: 4px; width: 100%; background: rgba(255,255,255,0.35);"></div>

PANEL FINALI (FRASE EPICA) — look premium:
- background: rgba(0,0,0,0.22);
- border: 1px solid rgba(255,255,255,0.25);
- box-shadow: 0 16px 50px rgba(0,0,0,0.45);
- border-radius: 18px;
- padding: 22px;

RITMO VISIVO E LAYOUT (MANDATORIO):
- Alterna SEMPRE: frase breve → paragrafo → frase evidenziata → paragrafo → griglia.
- Inserisci 1–2 FRASI ISOLATE centrali, più grandi, tipo tagline, con:
  font-size: clamp(20px, 4vw, 32px);
  font-weight: 800;
  font-style: italic;
  text-align: center;
  margin: 40px 0;
  padding: 0 20px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  border-left: 4px solid #fff;
  width: 100%;
  box-sizing: border-box;

TONO & COPY (MANDATORIO):
- Niente banalismi tipo “imperdibile”, “capolavoro”, “acquista ora”.
- Usa frasi spezzate e memorabili. Ritmo. Pause.
- Deve sembrare scritto per giocatori da tavolo, non per un catalogo.
- Integra keyword SEO in modo naturale e coerente col gioco (gioco da tavolo, cooperativo, dungeon crawler, campagna narrativa, deckbuilding, ecc.).

REGOLE USO WEB (googleSearch) — MANDATORIE:
1) Usa il web SOLO per ricavare: tipologia del gioco, 3–6 meccaniche/feature, tema/ambientazione, 1–2 elementi distintivi.
2) Se bggInfo contiene un link BoardGameGeek, trattalo come riferimento primario (preferisci info coerenti con quella pagina).
3) NON inserire numeri specifici (scenari, ore, quantità componenti, capitoli, ecc.) a meno che siano chiaramente verificabili. Se hai dubbi, NON scriverli.
4) NON inventare dettagli di edizione (lingua, versione, KS vs retail) se non sono forniti dall’utente.
5) NON citare BGG, Google o “secondo le recensioni”: il testo deve sembrare scritto internamente per FroGames.
6) Se le info sono insufficienti, fai copy forte basato su categoria + meccanica + esperienza, senza forzare dettagli.
CONTROLLO NOME GIOCO:
- Estrai il nome del gioco dalla scatola o dal link BGG. Se sono diversi, usa quello del link BGG.

ANTI-MURO DI TESTO (MANDATORIO):
- HTML1 deve contenere ESATTAMENTE 4 paragrafi (<p>) brevi e scorrevoli (max ~260 caratteri ciascuno).
- HTML2 deve contenere ESATTAMENTE 3 paragrafi (<p>) prima della griglia, brevi (max ~320 caratteri ciascuno).
- Vietati paragrafi lunghi: se sfori, riscrivi finché rientri.
- Evita elenchi lunghi fuori dalle griglie.

STRUTTURA CONTENUTO (SEMPRE 3 OUTPUT):

HTML1 (ATMOSFERA + SEO + UNICITÀ):
- Contenitore <div> con gradiente e padding come da regole.
- Titolo principale: USA <h2> (NON <h1>) con stile anti-taglio.
- ESATTAMENTE 4 PARAGRAFI brevi e scorrevoli (non muro di testo) con ritmo:
  1) Hook cinematografico (frasi spezzate).
  2) COS'È (SEO naturale): definisci chiaramente il gioco usando 2-3 keyword coerenti.
  3) UNICITÀ (concetto): spiega cosa lo rende diverso senza fare tutorial regole.
  4) PER CHI È: fai identificare il target con 2-3 frasi (“se ami... se cerchi... se ti piace...”).
- Inserisci 1 FRASE ISOLATA grande (tagline) tra il paragrafo 2 e 3.
- Inserisci un micro-divider (linea sottile) prima della griglia.
- Grid responsiva CENTRATA con ESATTAMENTE 4 card emozionali (focus su esperienza).
- FRASE FINALE EPICA in PANEL premium (no bordo spesso).

HTML2 (MECCANICHE + PARTICOLARITÀ + SEO LUNGA):
- Contenitore <div> con gradiente coerente.
- Titolo tematico: <h2> con stile anti-taglio.
- ESATTAMENTE 3 PARAGRAFI brevi prima della griglia:
  1) Meccanica chiave spiegata in modo “bello da leggere”.
  2) Impatto sul tavolo (che tipo di scelte crea / che sensazione dà).
  3) Particolarità premium (map book / boss / progressione / materiali ecc. solo se coerente).
- CITAZIONE CENTRALE GIGANTE (tagline isolata grande) tra paragrafo 2 e 3 OPPURE subito dopo il paragrafo 3 (scegli la posizione più elegante).
- Grid responsiva CENTRATA con ESATTAMENTE 6 card tecniche con questi temi (in quest’ordine):
  1) Strategia
  2) Combo
  3) Profondità
  4) Flusso
  5) Bilanciamento
  6) Decisioni
- Sotto la griglia: 1 PARAGRAFO “SEO LUNGA INVISIBILE” (max ~420 caratteri): integra 4-6 keyword variate e naturali senza elenco, testo scorrevole.
- SECONDA FRASE FINALE EPICA in PANEL premium.

HTML3 (COME SI GIOCA) — SOLO TESTO PULITO:
- Deve essere puro TESTO (Plain Text). NON usare tag HTML.
- NON usare Markdown (NO **asterischi**).
- Struttura con titoli in MAIUSCOLO e righe vuote tra paragrafi.
- Per i passaggi del turno usa numerazione "1) 2) 3) 4)".
- Linguaggio chiaro, scorrevole, pronto da copiare e incollare.

SEO (MANDATORIO):
- seoTitle: max 70 caratteri, formato:
  "[Nome Gioco] – [hook tematico] + 1 keyword naturale coerente"
  Regole:
  - Usa sempre “–” e mai “:”.
  - Niente formule generiche ripetitive.
  - Se superi 70 caratteri, riscrivi finché rientri.
- metaDescription: max 160 caratteri, include "[Nome Gioco]" + 1–2 keyword coerenti, tono FroGames.
  Niente player count/durata.
  Se superi 160 caratteri, riscrivi finché rientri.

RISPOSTA: Solo JSON con "html1", "html2", "html3", "seoTitle", "metaDescription".
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
