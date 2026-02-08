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
Obiettivo: creare una descrizione Shopify moderna, mobile-first, premium, con percorso di vendita e SEO forte ma leggibile.

OUTPUT: restituisci SOLO JSON con:
- html1 (ATMOSFERA)
- html2 (PERCHÉ FUNZIONA AL TAVOLO)
- html3 (COME SI GIOCA: SOLO TESTO)
- seoTitle
- metaDescription

--------------------------------------------
REGOLE FONDAMENTALI (MANDATORIE)
--------------------------------------------

A) HTML STRUTTURA (OBBLIGO)
- html1 e html2 DEVONO contenere:
  1) un <section id="fg-[slug]"> ... </section>
  2) un <style>...</style> SUBITO DOPO la section.
- Il CSS deve essere SCOPED sull'id della section (es: #fg-seti, #fg-pinatas).
- Vietato affidarsi solo a inline-style per i layout responsive: devi usare @media nel <style>.

B) CONTRASTO
- Tutto il testo dentro html1/html2 deve avere color: #FFFFFF !important;
- Usa background con gradiente (3 colori) ricavato dai colori dominanti della scatola.

C) LAYOUT PREMIUM (NO LOOK 2000)
- Glass morbido, bordi sottili, glow delicato.
- Inserisci separatori sottili tra sezioni:
  <div class="fg-divider" aria-hidden="true"></div>
- Panel finale premium.

D) PERCORSO DI VENDITA (MANDATORIO)
Deve seguire questa progressione, senza sembrare tutorial:
curiosità → immersione → differenza (momento firma) → identificazione → razionalizzazione → payoff.

E) ANTI-MURO (MA SENZA SVUOTARE)
- html1: ESATTAMENTE 4 paragrafi principali (class="fg-p") + 1 tagline grande + chips + griglia + panel.
- html2: ESATTAMENTE 3 paragrafi principali (class="fg-p") + 1 tagline grande + 2 micro-intestazioni narrative + griglia + SEO long + panel.
- Ogni paragrafo principale: 220–380 caratteri, max 2 frasi. (Se troppo corto: espandi. Se troppo lungo: taglia.)
- Vietato “elenchi lunghi” fuori dalle griglie.

F) SEO KEYWORDS (OBBLIGO POSIZIONATO)
- In html1, nel 2° paragrafo deve comparire testualmente:
  "È un gioco da tavolo" + la categoria corretta (es: "strategico", "di carte", "cooperativo", ecc.).
- In html1 deve comparire anche "gioco di carte" se pertinente (es. SETI ha motore carte, Piñatas è gioco di carte).
- In html2, nel blocco SEO long deve comparire:
  "gioco da tavolo" + 4 keyword coerenti e naturali (senza elenco tecnico).
- NO keyword stuffing: max 1 keyword per frase.

G) TONO (FroGames)
- Niente “capolavoro”, “imperdibile”, “acquista ora”.
- Niente fraseggio da catalogo.
- Deve essere “cinematografico”, ma concreto: immagini + payoff.
- DIVIETO: non usare la parola “meccanica/meccaniche” come etichetta. Fai capire “come funziona” con immagini (“qui vinci quando…”).

H) CARD “CALDE” (FONDAMENTALE)
- Vietati titoli astratti tipo “TENSIONE/STRATEGIA” da soli.
- Ogni card deve essere: GESTO (titolo) + CONSEGUENZA (testo).
- Titolo card: max 3 parole, MAIUSCOLO.
- Testo card: 1 sola frase, max 12 parole.
- Le card devono dare spinta emotiva (non fredde).

I) GRIGLIE (OBBLIGO 3x2 DESKTOP)
- html1: ESATTAMENTE 6 card esperienza (6 cards).
- html2: ESATTAMENTE 6 card valore (6 cards) sui temi:
  1) Strategia (espresso come scelta/gesto)
  2) Combo (incastri/tempi)
  3) Profondità (lettura/ritorno)
  4) Flusso (ritmo)
  5) Bilanciamento (rebound/inseguimento)
  6) Decisioni (scelta dolorosa)
- Layout:
  Mobile: 1 colonna
  Tablet: 2 colonne
  Desktop: 3 colonne (3x2)
  Deve essere garantito da CSS @media nello style scoped.

J) CHIP (OBBLIGO)
- In html1 inserisci una riga di 4–5 chips sotto i paragrafi (prima del divider).
- Almeno 2 chip devono contenere keyword tra:
  "gioco da tavolo", "gioco di carte", "gioco competitivo", "eurogame", "deckbuilding", "trick-taking", ecc. (coerenti col gioco).

K) WEB (googleSearch) — USA CON CERVELLO
- Usa web SOLO per: tipologia, tema, 3–6 feature distintive.
- NON inserire numeri specifici (carte, componenti, scenari) se non chiaramente verificabili.
- NON citare fonti esterne (BGG, Google, recensioni). Deve sembrare scritto internamente.

--------------------------------------------
STRUTTURA DETTAGLIATA
--------------------------------------------

HTML1 (ATMOSFERA)
- <section id="fg-[slug]" class="fg-wrap">
  - kicker (una riga piccola, evocativa) -> class="fg-kicker"
  - h2 (nome gioco) -> class="fg-title"
  - sottotitolo (1 riga) -> class="fg-sub"
  - 4 paragrafi principali class="fg-p" in quest’ordine:
    1) HOOK: scena + curiosità. Chiudi con micro-gancio.
    2) COSA SI PROVA + SEO: deve contenere "È un gioco da tavolo ..." (obbligo). Chiudi con micro-gancio.
    3) DIFFERENZA: “momento firma” (cosa lo rende diverso) + 1 keyword coerente. Chiudi con micro-gancio.
    4) TARGET: "È il gioco per chi…" (2 micro-frasi “se ami / se cerchi / se ti piace”). Chiudi con micro-gancio.
  - tagline grande (una frase corta) -> class="fg-tagline"
  - chips -> class="fg-chips"
  - divider -> <div class="fg-divider"></div>
  - griglia 6 card -> class="fg-grid" con <article class="fg-card">
  - panel finale premium -> class="fg-panel"

- </section>
- <style> scoped + @media </style>

HTML2 (PERCHÉ FUNZIONA AL TAVOLO)
- <section id="fg-[slug]-2" class="fg-wrap">
  - kicker + h2 tematico (non ripetere titolo html1) + sottotitolo
  - 3 paragrafi principali class="fg-p":
    1) IL CUORE: spiegato bello da leggere (no tutorial), 1 keyword coerente. Micro-gancio.
    2) SCELTE & RISCHIO: cosa ti costringe a decidere, tensione. Micro-gancio.
    3) PAYOFF: perché resta addosso, rigiocabilità/interazione. Micro-gancio.
  - tagline grande class="fg-tagline"
  - due micro-intestazioni narrative (non tecniche) come H3, class="fg-h3":
    - una prima della griglia (es: "DOVE TI PREMIA")
    - una seconda dopo la griglia (es: "DOVE TI METTE ALLA PROVA")
  - griglia 6 card valore
  - SEO long: 2–3 frasi, 380–520 caratteri totali, class="fg-seo"
    Deve contenere "gioco da tavolo" + 4 keyword coerenti naturali (no elenco).
  - panel finale class="fg-panel"
- </section>
- <style> scoped + @media </style>

HTML3 (COME SI GIOCA)
- SOLO TESTO PULITO. Niente HTML. Niente markdown. Niente asterischi.
- Titoli in MAIUSCOLO.
- Righe vuote tra paragrafi.
- Turno con 1) 2) 3) 4).
- Breve e leggibile.

SEO META
- seoTitle: max 70 caratteri, formato: "[Nome] – [hook] + 1 keyword"
  usa “–” e mai “:”
- metaDescription: max 160 caratteri, include nome + 1–2 keyword, tono FroGames, niente player count/durata.

RISPOSTA: SOLO JSON.
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
