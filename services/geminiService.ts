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
1) ANALISI COLORI: Identifica 3 colori dominanti della scatola e crea un gradiente armonioso.
2) TESTO BIANCO: Ogni singolo carattere nei blocchi HTML deve avere color: #FFFFFF !important;.
3) TITOLI ANTI-TAGLIO (H2/H3): usa SEMPRE:
   font-size: clamp(22px, 5.5vw, 46px);
   line-height: 1.2;
   word-break: keep-all;
   overflow-wrap: break-word;
   text-align: center;
   font-weight: 900;
   text-transform: uppercase;
   text-shadow: 3px 3px 10px rgba(0,0,0,0.8);
   margin-bottom: 22px;
   width: 100%;
4) CONTAINER:
   background: linear-gradient(135deg, [c1] 0%, [c2] 60%, [c3] 100%);
   padding: 38px 18px;
   font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
   border-radius: 14px;

UI PREMIUM (MANDATORIO – NO LOOK 2000):
- Usa separatori sottili:
  <div style="height: 1px; width: 100%; background: rgba(255,255,255,0.12); margin: 22px 0;"></div>
- Panel finale premium:
  background: rgba(0,0,0,0.22);
  border: 1px solid rgba(255,255,255,0.25);
  box-shadow: 0 16px 50px rgba(0,0,0,0.45);
  border-radius: 18px;
  padding: 22px;

CARD PREMIUM (per le griglie):
- Base card:
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 14px 40px rgba(0,0,0,0.35);
  border-radius: 22px;
  overflow: hidden;
  position: relative;
  width: 100%;
  max-width: 340px;
  text-align: left;
  backdrop-filter: blur(6px);
  padding: 18px;
- Accent bar sempre in alto:
  <div style="height: 4px; width: 100%; background: rgba(255,255,255,0.35); position:absolute; top:0; left:0;"></div>

RITMO VISIVO (MANDATORIO):
- Alterna sempre: frase breve → paragrafo → tagline grande → paragrafo → separatore → griglia → panel finale.
- Tagline grande (1 per blocco):
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
- Niente “imperdibile/capolavoro/acquista ora”.
- Deve suonare scritto per giocatori da tavolo.
- Deve creare bisogno senza dirlo: curiosità, tensione, payoff, “momento firma”.
- DIVIETO: non usare la parola “meccanica/meccaniche” come etichetta.
- Quando descrivi come funziona, fallo capire con immagini (“qui vinci quando…”, “qui scegli se…”).

ANTI-MURO (MANDATORIO, CONTROLLO DURO):
- Ogni paragrafo deve essere massimo 2 frasi.
- Frasi corte, punti netti. Niente periodi lunghi pieni di “mentre/dove/in cui”.
- HTML1: ESATTAMENTE 4 paragrafi (<p>) + 1 sottotitolo + 1 tagline grande + 6 card + 1 panel finale.
- HTML2: ESATTAMENTE 3 paragrafi (<p>) + 1 sottotitolo + 1 tagline grande + 6 card + 1 paragrafo SEO lungo + 1 panel finale.

SEO (MANDATORIO, NATURALE):
- In HTML1 deve comparire almeno una volta: "gioco da tavolo" e "gioco di carte".
- Se è pertinente, usa anche "gioco di prese" e "trick-taking" (una volta ciascuno massimo).
- In HTML2 inserisci keyword coerenti con il gioco (es. gioco competitivo, gestione mano, push your luck, bluff, ecc.) SENZA elenco tecnico.

CHIPS (MANDATORIE, MAX 5):
- Inserisci una riga di “chips” sotto i paragrafi di HTML1, prima del separatore.
- Devono essere in italiano, senza numeri, e includere almeno 2 keyword tra:
  gioco da tavolo, gioco di carte, gioco di prese, gioco competitivo.
- Stile chip:
  display:inline-block; padding:8px 12px; border-radius:999px;
  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.20);
  margin: 6px 6px 0 0; font-size: 12px;

PERCORSO DI VENDITA (MANDATORIO):
- HTML1 = trailer emotivo + differenza + target.
- HTML2 = “perché funziona” al tavolo + che scelte crea + payoff.

CARD “CALDE” (REGOLA FONDAMENTALE):
- Vietati titoli astratti tipo TENSIONE/RISATE/STRATEGIA da soli.
- Ogni card deve essere una micro-scena o gesto (titolo) + conseguenza al tavolo (testo).
- Ogni testo card: 1 sola frase, massimo 11 parole.
- Titolo card: massimo 3 parole, tutto maiuscolo.

GRIGLIE (OBBLIGO 6 CARD):
- HTML1: ESATTAMENTE 6 card (esperienza/atmosfera).
- HTML2: ESATTAMENTE 6 card (valore al tavolo) con questi 6 temi, ma senza essere freddi:
  1) Strategia (espresso come gesto/decisione)
  2) Combo (espresso come “incastro”/tempismo)
  3) Profondità (espresso come lettura e ritorno)
  4) Flusso (espresso come ritmo e turni)
  5) Bilanciamento (espresso come inseguimento/rebound)
  6) Decisioni (espresso come scelta dolorosa)

OUTPUT (SEMPRE 3):

HTML1 (ATMOSFERA):
- <div> container
- <h2> Titolo (nome gioco)
- Sottotitolo: 1 riga evocativa, stile:
  font-size: 16px; opacity: 0.9; text-align:center; margin-top:-10px; margin-bottom:18px;
- 4 paragrafi (max 2 frasi ciascuno) in questo ordine:
  1) Hook cinematografico.
  2) Cosa si prova al tavolo + 1 keyword.
  3) Differenza (il “momento firma”) + 1 keyword.
  4) Target (“È il gioco per chi…”) + gancio.
- Tagline grande tra paragrafo 2 e 3.
- Chips (max 5) sotto i paragrafi.
- Separatore sottile.
- Griglia 6 card calde.
- Panel finale premium con una frase memorabile.

HTML2 (COME FUNZIONA SENZA DIRE “MECCANICA”):
- <div> container
- <h2> Titolo tematico (non ripetere titolo HTML1)
- Sottotitolo 1 riga.
- 3 paragrafi (max 2 frasi ciascuno) in questo ordine:
  1) “Il cuore” raccontato bello da leggere (no tutorial).
  2) Scelte e rischio (cosa ti costringe a decidere).
  3) Payoff: perché una partita “resta addosso” (rigiocabilità/interazione).
- Tagline grande tra paragrafo 2 e 3.
- Griglia 6 card calde sui 6 temi.
- Paragrafo SEO lungo (max 420 caratteri) scorrevole, con 4–6 keyword naturali.
- Panel finale premium con frase memorabile.

HTML3 (COME SI GIOCA) — SOLO TESTO PULITO:
- Solo testo, niente HTML, niente markdown, niente asterischi.
- Titoli in MAIUSCOLO.
- Righe vuote tra paragrafi.
- Passi del turno con 1) 2) 3) 4).
- Spiegazione breve, leggibile.

SEO META:
- seoTitle: max 70 caratteri, formato:
  "[Nome Gioco] – [hook tematico] + 1 keyword coerente"
  Usa sempre “–” e mai “:”.
- metaDescription: max 160 caratteri, include nome + 1–2 keyword coerenti, tono FroGames, niente player count/durata.

RISPOSTA: solo JSON con "html1", "html2", "html3", "seoTitle", "metaDescription".
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
