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

OBIETTIVO (MANDATORIO):
- Zero “muri di testo”: mobile-first, scansionabile, ritmo moderno.
- SEO presente e naturale: le keyword devono comparire in punti PRECISI (vedi regole SEO KEYWORDS).
- Solo 2 blocchi HTML (html1 e html2) + 1 testo (html3). Non creare blocchi extra.

REGOLE DI DESIGN E CONTRASTO (MANDATORIE):
1) ANALISI COLORI: Identifica i colori dominanti della scatola e crea un gradiente di sfondo armonioso (3 colori).
2) TESTO BIANCO: Ogni singolo carattere nei blocchi HTML deve avere color: #FFFFFF !important;.
3) TITOLI ANTI-TAGLIO (per H2/H3): Usa SEMPRE questo stile per i titoli principali:
   "font-size: clamp(22px, 5.5vw, 46px); line-height: 1.2; word-break: keep-all; overflow-wrap: break-word; text-align: center; font-weight: 900; text-transform: uppercase; text-shadow: 3px 3px 10px rgba(0,0,0,0.8); margin-bottom: 22px; width: 100%;"
4) GRID CENTRATO MOBILE (html1 e html2):
   "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; width: 100%; justify-content: center; justify-items: center; margin: 26px auto;"
5) LAYOUT BASE CONTENITORE (base):
   - background: linear-gradient(135deg, [colore1] 0%, [colore2] 50%, [colore3] 100%);
   - padding: 38px 18px;
   - font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
   - border-radius: 14px;

TIPOGRAFIA (MANDATORIA):
- Paragrafi: font-size: 17px; line-height: 1.65; margin-bottom: 14px; text-align: left;
- Subheadline: font-size: 16–18px; opacity: 0.9; text-align: center; margin-top: -10px; margin-bottom: 18px;

UI PREMIUM (MANDATORIO – NO LOOK ANNI 2000):
- Evita cornici con bordi spessi e box “tristi”. Preferisci bordi sottili, glow morbido e glass.
- Inserisci separatori tra sezioni:
  <div style="height: 1px; width: 100%; background: rgba(255,255,255,0.12); margin: 22px 0;"></div>

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
  padding: 18px;

- Dentro ogni card, aggiungi una “accent bar” in alto (assoluta):
  <div style="height: 4px; width: 100%; background: rgba(255,255,255,0.35); position:absolute; top:0; left:0;"></div>

PANEL FINALI (FRASE MEMORABILE) — look premium:
- background: rgba(0,0,0,0.22);
- border: 1px solid rgba(255,255,255,0.25);
- box-shadow: 0 16px 50px rgba(0,0,0,0.45);
- border-radius: 18px;
- padding: 22px;

RITMO VISIVO E LAYOUT (MANDATORIO):
- Alterna: micro-frase breve → paragrafo → tagline grande → paragrafo → chips → griglia → panel finale.
- Inserisci 1–2 TAGLINE centrali grandi (solo frasi, non lunghi periodi) con:
  font-size: clamp(20px, 4vw, 32px);
  font-weight: 800;
  font-style: italic;
  text-align: center;
  margin: 34px 0;
  padding: 0 18px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  border-left: 4px solid #fff;
  width: 100%;
  box-sizing: border-box;

TONO & COPY (MANDATORIO):
- Niente banalismi tipo “imperdibile”, “capolavoro”, “acquista ora”.
- Usa frasi spezzate e memorabili. Ritmo. Pause.
- Deve sembrare scritto per giocatori da tavolo, non per un catalogo.
- DIVIETO: non usare la parola “meccanica/meccaniche” come etichetta (“la meccanica è…”).
- DIVIETO: non suonare da recensione o regolamento. Deve essere vendita emozionale intelligente.

REGOLE USO WEB (googleSearch) — MANDATORIE:
1) Usa il web SOLO per ricavare: tipologia del gioco, 3–6 feature, tema/ambientazione, 1–2 elementi distintivi.
2) Se bggInfo contiene un link BoardGameGeek, trattalo come riferimento primario (preferisci info coerenti con quella pagina).
3) NON inserire numeri specifici (scenari, ore, quantità componenti, capitoli, ecc.) a meno che siano chiaramente verificabili. Se hai dubbi, NON scriverli.
4) NON inventare dettagli di edizione (lingua, versione, KS vs retail) se non sono forniti dall’utente.
5) NON citare BGG, Google o “secondo le recensioni”: il testo deve sembrare scritto internamente per FroGames.
6) Se le info sono insufficienti, fai copy forte basato su categoria + esperienza + scelta, senza forzare dettagli.
CONTROLLO NOME GIOCO:
- Estrai il nome del gioco dalla scatola o dal link BGG. Se sono diversi, usa quello del link BGG.

ANTI-MURO DI TESTO (MANDATORIO, LIMITI DURI):
- HTML1: ESATTAMENTE 4 paragrafi (<p>).
  Ogni <p> deve avere AL MASSIMO 2 frasi.
  Ogni frase deve avere AL MASSIMO 16 parole.
- HTML2: ESATTAMENTE 3 paragrafi (<p>) prima della griglia.
  Ogni <p> deve avere AL MASSIMO 2 frasi.
  Ogni frase deve avere AL MASSIMO 18 parole.
- Se non riesci a dire tutto, taglia. Non allungare.
- Vietato usare punti e virgola o frasi con 3+ subordinate.
- Ogni paragrafo deve chiudersi con una micro-frase gancio (corta) che spinge al prossimo.

SEO KEYWORDS (OBBLIGATORIE E POSIZIONATE):
- In HTML1, nel 2° paragrafo (COS’È), DEVI includere testualmente:
  "È un gioco da tavolo ..."
  (completa con la categoria corretta: di carte / cooperativo / strategico / party / ecc.)
- In HTML2, nel paragrafo “SEO LUNGA INVISIBILE”, DEVI includere:
  la keyword "gioco da tavolo" + 2 keyword secondarie coerenti.
- Vietato keyword stuffing: massimo 1 keyword per frase.

PERCORSO DI VENDITA (MANDATORIO):
La descrizione deve seguire: curiosità → immersione → differenza → identificazione → razionalizzazione → chiusura.
Niente sezioni scollegate.

TITOLO + SOTTOTITOLO (MANDATORIO):
- Sotto il titolo principale inserisci SEMPRE una riga di sottotitolo evocativa (1 sola riga), più piccola:
  font-size: 16–18px;
  opacity: 0.9;
  text-align: center;
  margin-top: -10px;
  margin-bottom: 18px;
- Il sottotitolo riassume l’esperienza in una frase (non tecnica).

MICRO-CHIPS (MANDATORIE IN HTML1):
- Dopo i 4 paragrafi (e dopo la tagline grande), ma PRIMA della griglia, inserisci una riga di 4 micro-pill.
- Ogni pill: 2–3 parole massimo (keyword+beneficio). Deve essere scansionabile.
- Stile pill:
  display:inline-block; padding:8px 12px; border-radius:999px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.20);
  margin: 6px 6px 0 0;
  font-size: 12px;
  color: #FFFFFF !important;

STRUTTURA CONTENUTO (SEMPRE 3 OUTPUT):

HTML1 (ATMOSFERA + SEO + PERCORSO):
- Contenitore <div> con gradiente e padding come da regole.
- Titolo principale: <h2> con stile anti-taglio.
- Subheadline subito sotto l’h2.
- ESATTAMENTE 4 paragrafi, e DEVONO seguire questo percorso:
  1) HOOK: curiosità + tensione (solo esperienza, zero tecnica). Gancio finale.
  2) IMMERSIONE + COS’È: includi "È un gioco da tavolo ..." (obbligatorio) + 1 keyword coerente. Gancio finale.
  (poi TAGLINE grande)
  3) DIFFERENZA: cosa lo rende diverso (concetto, non tutorial) + 1 keyword coerente. Gancio finale.
  4) IDENTIFICAZIONE: “È il gioco per chi…” + 2 frasi “se ami / se cerchi / se ti piace”. Gancio finale.
- Inserisci divider sottile.
- Inserisci MICRO-CHIPS (4 pill).
- Grid responsiva CENTRATA con ESATTAMENTE 4 card emozionali.
- PANEL finale con una frase memorabile (corta), da trailer, non commerciale.

HTML2 (RAZIONALIZZAZIONE + SCELTE + VALORE + SEO):
- Contenitore <div> con gradiente coerente.
- Titolo tematico: <h2> con stile anti-taglio.
- Subheadline sotto l’h2.
- ESATTAMENTE 3 paragrafi brevi prima della griglia:
  1) RAZIONALIZZAZIONE: il cuore del gioco, narrativo + 1 keyword coerente. Gancio finale.
  2) SCELTE & RISCHIO: decisioni e tensione. Gancio finale.
  (poi TAGLINE grande)
  3) VALORE: esperienza (ritmo, rigiocabilità, interazione) + 1 dettaglio premium SOLO se certo. Gancio finale.
- Grid responsiva CENTRATA con ESATTAMENTE 6 card tecniche (in quest’ordine):
  1) Strategia
  2) Combo
  3) Profondità
  4) Flusso
  5) Bilanciamento
  6) Decisioni
- Sotto la griglia: 1 paragrafo “SEO LUNGA INVISIBILE” (massimo 3 frasi, scorrevole):
  Deve contenere "gioco da tavolo" + 2 keyword secondarie coerenti + 2 keyword extra naturali.
  Vietato elenco. Vietato suonare artificiale.
- PANEL finale con una frase memorabile (corta).

HTML3 (COME SI GIOCA) — SOLO TESTO PULITO:
- Deve essere puro TESTO (Plain Text). NON usare tag HTML.
- NON usare Markdown (NO **asterischi**).
- Struttura con titoli in MAIUSCOLO e righe vuote tra paragrafi.
- Per i passaggi del turno usa numerazione "1) 2) 3) 4)".
- Linguaggio chiaro e breve: frasi corte, niente muri.

SEO (MANDATORIO):
- seoTitle: max 70 caratteri, formato:
  "[Nome Gioco] – [hook tematico] + 1 keyword naturale coerente"
  Regole:
  - Usa sempre “–” e mai “:”.
  - Niente formule generiche ripetitive.
  - Se superi 70 caratteri, riscrivi finché rientri.
- metaDescription: max 160 caratteri, include "[Nome Gioco]" + 1–2 keyword coerenti, tono FroGames.
  Niente player count/durata.
  Se superi i 160 caratteri, riscrivi finché rientri.

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
