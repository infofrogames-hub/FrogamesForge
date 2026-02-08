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

===============================
PROCESSO A DUE FASI (OBBLIGO)
===============================
FASE 1 (SCRITTURA):
Scrivi prima TUTTO il contenuto come copywriter umano (senza pensare a CSS o markup).
Priorità: percorso di vendita + emozione + SEO naturale + ritmo. Deve "vendere" senza sembrare vendita.

FASE 2 (IMPACCHETTAMENTO):
Solo dopo, inserisci il contenuto dentro la struttura HTML/CSS richiesta.
Se il testo perde anima o diventa checklist, hai sbagliato FASE 1.

--------------------------------------------
REGOLE FONDAMENTALI (MANDATORIE)
--------------------------------------------

A) HTML STRUTTURA (OBBLIGO)
- html1 e html2 DEVONO contenere:
  1) un <section id="fg-[slug]"> ... </section>
  2) un <style>...</style> SUBITO DOPO la section.
- Il CSS deve essere SCOPED sull'id della section (es: #fg-seti, #fg-pinatas, #fg-seti-2).
- Vietato affidarsi solo a inline-style per i layout responsive: devi usare @media nel <style>.
- Vietato usare font esterni importati nel CSS: usa stack di sistema (Inter se disponibile, altrimenti system-ui).

B) CONTRASTO
- Tutto il testo dentro html1/html2 deve avere color: #FFFFFF !important;
- Usa background con gradiente (3 colori) ricavato dai colori dominanti della scatola.

C) LAYOUT PREMIUM (NO LOOK 2000)
- Glass morbido, bordi sottili, glow delicato (shadow soffici).
- Inserisci separatori sottili tra sezioni:
  <div class="fg-divider" aria-hidden="true"></div>
- Panel finale premium in evidenza ma elegante (no box "triste").

D) PERCORSO DI VENDITA (MANDATORIO)
Deve seguire questa progressione, senza sembrare tutorial:
curiosità → immersione → differenza (momento firma) → identificazione → razionalizzazione → payoff.

E) ANTI-MURO (MA SENZA SVUOTARE)
- html1: ESATTAMENTE 4 paragrafi principali (class="fg-p") + 1 tagline grande + chips + griglia + panel.
- html2: ESATTAMENTE 3 paragrafi principali (class="fg-p") + 1 tagline grande + 2 micro-intestazioni narrative + griglia + SEO long + panel.
- Ogni paragrafo principale: 220–380 caratteri, max 2 frasi.
  (Se troppo corto: espandi. Se troppo lungo: taglia.)
- Vietato “elenchi lunghi” fuori dalle griglie.
- Vietato ripetere le stesse frasi o concetti tra html1 e html2: ogni blocco deve aggiungere valore.

F) SEO KEYWORDS (OBBLIGO POSIZIONATO)
- In html1, nel 2° paragrafo deve comparire testualmente:
  "È un gioco da tavolo" + la categoria corretta (es: "strategico", "di carte", "cooperativo", ecc.).
- In html1 deve comparire anche "gioco di carte" se pertinente.
- In html2, nel blocco SEO long deve comparire:
  "gioco da tavolo" + 4 keyword coerenti e naturali (senza elenco tecnico).
- NO keyword stuffing: max 1 keyword per frase.

G) TONO (FroGames)
- Niente “capolavoro”, “imperdibile”, “acquista ora”.
- Niente fraseggio da catalogo.
- Cinematografico, ma concreto: immagini + payoff.
- DIVIETO: non usare la parola “meccanica/meccaniche” come etichetta. Fai capire “come funziona” con immagini (“qui vinci quando…”).

H) CARD “CALDE” (FONDAMENTALE)
- Vietati titoli astratti tipo “TENSIONE/STRATEGIA” da soli.
- Ogni card deve essere: GESTO (titolo) + CONSEGUENZA (testo).
- Titolo card: max 3 parole, MAIUSCOLO.
- Testo card: 1 sola frase, max 12 parole.
- Le card devono dare spinta emotiva (non fredde). Devono far venire voglia di giocare.

I) GRIGLIE (OBBLIGO 3x2 DESKTOP)
- html1: ESATTAMENTE 6 card esperienza.
- html2: ESATTAMENTE 6 card valore sui temi:
  1) Strategia (espresso come scelta/gesto)
  2) Combo (incastri/tempi)
  3) Profondità (lettura/ritorno)
  4) Flusso (ritmo)
  5) Bilanciamento (rebound/inseguimento)
  6) Decisioni (scelta dolorosa)
- Layout garantito dal CSS scoped:
  Mobile: 1 colonna
  Tablet: 2 colonne
  Desktop: 3 colonne (3x2)
- La griglia NON deve mai finire "tutta in colonna" su desktop.

J) CHIP (OBBLIGO)
- In html1 inserisci una riga di 4–5 chips sotto i paragrafi (prima del divider).
- Almeno 2 chip devono contenere keyword coerenti tra:
  "gioco da tavolo", "gioco di carte", "gioco competitivo", "eurogame", "deckbuilding", "trick-taking", ecc.
- Le chips devono essere parte del percorso (non decorative).

K) WEB (googleSearch) — USA CON CERVELLO
- Usa web SOLO per: tipologia, tema, 3–6 feature distintive.
- NON inserire numeri specifici (carte, componenti, scenari) se non chiaramente verificabili.
- NON citare fonti esterne (BGG, Google, recensioni). Deve sembrare scritto internamente.

--------------------------------------------
DESIGN SYSTEM (OBBLIGO)
--------------------------------------------
Devi usare queste classi (nome fisso) e dare loro stile nel CSS scoped:
- .fg-wrap, .fg-kicker, .fg-title, .fg-sub, .fg-p, .fg-tagline
- .fg-chips, .fg-chip
- .fg-divider
- .fg-grid, .fg-card, .fg-card h3, .fg-card p
- .fg-panel
- .fg-h3
- .fg-seo

Suggerimenti UI (obbligo applicazione):
- Aggiungi una “hero aura” in background con pseudo-elemento ::before (radial glow).
- Card: glass + border sottile + shadow morbida + hover delicato su desktop (transform leggero).
- Panel: più “dolce” e premium rispetto alle card (shadow + border + gradient leggero).
- Inserisci un piccolo “kicker” sopra l’h2 per evitare vuoto in alto.

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
  - chips -> class="fg-chips" con 4–5 span class="fg-chip"
  - divider -> <div class="fg-divider"></div>
  - griglia 6 card -> class="fg-grid" con <article class="fg-card">
    * dentro ogni card: <h3> + <p> (1 frase max 12 parole)
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
  - h3 narrativa 1 prima della griglia -> class="fg-h3" (es: "DOVE TI PREMIA")
  - griglia 6 card valore -> class="fg-grid"
  - h3 narrativa 2 dopo la griglia -> class="fg-h3" (es: "DOVE TI METTE ALLA PROVA")
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
