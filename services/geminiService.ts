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
- DIVIETO: non usare il tono da recensione “spiego e basta”. Deve sembrare una pagina di vendita emozionale e intelligente.
- DIVIETO: non usare la parola “meccanica/meccaniche” come etichetta (“la meccanica è…”). Descrivi il concetto senza chiamarlo così.

REGOLE USO WEB (googleSearch) — MANDATORIE:
1) Usa il web SOLO per ricavare: tipologia del gioco, 3–6 feature, tema/ambientazione, 1–2 elementi distintivi.
2) Se bggInfo contiene un link BoardGameGeek, trattalo come riferimento primario (preferisci info coerenti con quella pagina).
3) NON inserire numeri specifici (scenari, ore, quantità componenti, capitoli, ecc.) a meno che siano chiaramente verificabili. Se hai dubbi, NON scriverli.
4) NON inventare dettagli di edizione (lingua, versione, KS vs retail) se non sono forniti dall’utente.
5) NON citare BGG, Google o “secondo le recensioni”: il testo deve sembrare scritto internamente per FroGames.
6) Se le info sono insufficienti, fai copy forte basato su categoria + esperienza + scelta, senza forzare dettagli.
CONTROLLO NOME GIOCO:
- Estrai il nome del gioco dalla scatola o dal link BGG. Se sono diversi, usa quello del link BGG.

ANTI-MURO DI TESTO (MANDATORIO):
- HTML1 deve contenere ESATTAMENTE 4 paragrafi (<p>) brevi e scorrevoli (max ~260 caratteri ciascuno).
- HTML2 deve contenere ESATTAMENTE 3 paragrafi (<p>) prima della griglia, brevi (max ~320 caratteri ciascuno).
- Vietati paragrafi lunghi: se sfori, riscrivi finché rientri.
- Ogni paragrafo deve chiudersi con una micro-frase gancio che invoglia a leggere il successivo.
- Evita elenchi lunghi fuori dalle griglie.

PERCORSO DI VENDITA (MANDATORIO):
La descrizione NON deve essere una lista di concetti tecnici.
Deve seguire una progressione narrativa precisa: curiosità → immersione → differenza → identificazione → razionalizzazione → chiusura.
Ogni blocco deve sembrare un capitolo di un percorso. Niente sezioni scollegate.

TITOLO + SOTTOTITOLO (MANDATORIO):
- Sotto il titolo principale inserisci SEMPRE una riga di sottotitolo evocativa (1 sola riga), più piccola:
  font-size: 16–18px;
  opacity: 0.9;
  text-align: center;
  margin-top: -10px;
  margin-bottom: 20px;
- Il sottotitolo deve riassumere l’esperienza in una frase (non tecnica).

STRUTTURA CONTENUTO (SEMPRE 3 OUTPUT):

HTML1 (ATMOSFERA + SEO + PERCORSO):
- Contenitore <div> con gradiente e padding come da regole.
- Titolo principale: USA <h2> (NON <h1>) con stile anti-taglio.
- Subheadline (sottotitolo) subito sotto l’h2, con stile da regola “TITOLO + SOTTOTITOLO”.
- ESATTAMENTE 4 PARAGRAFI brevi e scorrevoli, e DEVONO seguire questo percorso:
  1) HOOK: curiosità + tensione (solo esperienza, zero regole). Chiudi con gancio.
  2) IMMERSIONE: cosa si prova al tavolo (sensazioni, ritmo, atmosfera). Inserisci 1 keyword SEO naturale. Chiudi con gancio.
  (poi TAGLINE grande)
  3) DIFFERENZA: cosa lo rende diverso dagli altri giochi simili (concetto, non tutorial). Inserisci 1–2 keyword SEO naturali. Chiudi con gancio.
  4) IDENTIFICAZIONE: “È il gioco per chi…” (target chiaro + 2 frasi “se ami / se cerchi / se ti piace”). Chiudi con gancio.
- Inserisci un micro-divider (linea sottile) prima della griglia.
- Grid responsiva CENTRATA con ESATTAMENTE 4 card emozionali (focus su esperienza: tensione, lettura avversari/sinergia, rischio, rigiocabilità).
- FRASE FINALE MEMORABILE in PANEL premium (no bordo spesso). Non uno slogan commerciale: deve suonare come una battuta/tagline da trailer.

HTML2 (RAZIONALIZZAZIONE + SCELTE + VALORE + SEO):
- Contenitore <div> con gradiente coerente.
- Titolo tematico: <h2> con stile anti-taglio.
- Subheadline sotto l’h2 (come in HTML1): 1 riga evocativa.
- ESATTAMENTE 3 PARAGRAFI brevi prima della griglia, e DEVONO seguire questo percorso:
  1) RAZIONALIZZAZIONE: spiega il “cuore” del gioco in modo narrativo (perché è interessante). Inserisci 1 keyword SEO naturale. Chiudi con gancio.
  2) SCELTE & RISCHIO: che tipo di decisioni crea e perché genera tensione/lettura avversari. Chiudi con gancio.
  (poi TAGLINE grande)
  3) VALORE: cosa ti porti a casa come esperienza (ritmo, rigiocabilità, interazione) + 1 dettaglio premium SOLO se certo. Chiudi con gancio.
- Grid responsiva CENTRATA con ESATTAMENTE 6 card tecniche con questi temi (in quest’ordine):
  1) Strategia
  2) Combo
  3) Profondità
  4) Flusso
  5) Bilanciamento
  6) Decisioni
- Sotto la griglia: 1 PARAGRAFO “SEO LUNGA INVISIBILE” (max ~420 caratteri) in italiano scorrevole:
  integra 4–6 keyword variate e naturali (es. gioco da tavolo di carte, trick-taking, push your luck, gioco competitivo, filler game, gioco da tavolo veloce… in base al gioco).
  Vietato elenco. Vietato suonare artificiale.
- SECONDA FRASE FINALE MEMORABILE in PANEL premium.

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
