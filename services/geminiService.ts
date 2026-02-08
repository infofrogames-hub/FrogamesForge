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
Obiettivo: descrizione Shopify premium, mobile-first, SEO forte, percorso di vendita chiaro, layout moderno e leggibile.

OUTPUT: restituisci SOLO JSON con:
- html1 (ATMOSFERA)
- html2 (PERCHÉ FUNZIONA AL TAVOLO)
- html3 (COME SI GIOCA: SOLO TESTO)
- seoTitle
- metaDescription

------------------------------------------------
VALIDAZIONE OUTPUT (MANDATORIA)
------------------------------------------------
Se html1 o html2 NON contengono TUTTI questi elementi:
- <section id="fg-
- <style>
- chiusura </style>
- CSS scoped sull'id (usa #fg-[slug] ...)
- .fg-grid con @media (mobile 1 col / tablet 2 col / desktop 3 col)

ALLORA devi rigenerare internamente prima di rispondere.
Non spiegare la rigenerazione. Rispondi solo con JSON valido.

------------------------------------------------
STRUTTURA HTML OBBLIGATORIA
------------------------------------------------
html1 e html2 DEVONO essere:
<section id="fg-[slug]" class="fg-wrap"> ... </section>
<style> ...CSS scoped solo su #fg-[slug]... </style>

Vietato CSS globale. Vietato dipendere solo da inline-style.

------------------------------------------------
CONTRASTO ASSOLUTO (ANTI TESTO NERO)
------------------------------------------------
Nel CSS scoped inserisci SEMPRE, all’inizio:

#fg-[slug],
#fg-[slug] * {
  color: #FFFFFF !important;
}

Per html2 usa l’id con suffisso -2:
#fg-[slug]-2,
#fg-[slug]-2 * { color:#FFFFFF !important; }

Nessun testo può essere nero. Mai.

------------------------------------------------
BACKGROUND & LOOK PREMIUM
------------------------------------------------
- Estrai 3 colori dominanti dalla scatola (c1,c2,c3) e crea un gradiente elegante.
- Usa glass soft, glow delicato, bordi arrotondati, ombre morbide.
- Inserisci un separatore sottile tra sezioni:
  <div class="fg-divider" aria-hidden="true"></div>

------------------------------------------------
LAYOUT GRID OBBLIGATORIO (3x2 desktop)
------------------------------------------------
.fg-grid deve essere una griglia vera e deve garantire:
- mobile: 1 colonna
- tablet ≥ 720px: 2 colonne
- desktop ≥ 1050px: 3 colonne (3×2)

Deve essere fatto con @media nel CSS scoped.

------------------------------------------------
ANTI-MURO (MA SENZA SVUOTARE)
------------------------------------------------
html1:
- ESATTAMENTE 4 paragrafi principali class="fg-p"
- ognuno 260–480 caratteri (non troppo corti)
- max 2 frasi ciascuno
- percorso: curiosità → immersione → differenza → target (con micro-gancio finale)

html2:
- ESATTAMENTE 3 paragrafi principali class="fg-p"
- stesse regole (260–480 caratteri, max 2 frasi)
- percorso: razionalizzazione → scelte/rischio → payoff

------------------------------------------------
SEO POSIZIONATA (OBBLIGATORIA)
------------------------------------------------
- html1, paragrafo 2: deve contenere testualmente “È un gioco da tavolo …” + categoria corretta.
- Se pertinente deve comparire anche “gioco di carte” (una volta).
- html2: deve includere un blocco SEO long class="fg-seo" (2–3 frasi, 380–520 caratteri)
  che contenga “gioco da tavolo” + 4 keyword naturali coerenti (no elenco tecnico).
- No keyword stuffing: max 1 keyword per frase.

------------------------------------------------
CARD CALDE (REGOLA DURA, STILE SPEAKEASY / DANCE OF IBEXES)
------------------------------------------------
Vietate card fredde tipo “SCRUTA / LANCIA / ANALIZZA” o etichette astratte.

Ogni card deve essere una micro-scena di tavolo:
- Titolo: emoji + frase evocativa (massimo ~52 caratteri)
- Testo: 1–2 frasi, massimo ~140 caratteri
- Deve far “sentire” il momento e il payoff

(NOTA: Anche se sotto trovi la regola “verbo max 3 parole”, questa nuova regola “micro-scena”
ha priorità assoluta: vogliamo card calde, non comandi.)

------------------------------------------------
GRIGLIE
------------------------------------------------
- html1: ESATTAMENTE 6 card esperienza
- html2: ESATTAMENTE 6 card valore sui temi (senza essere fredde):
  1) Strategia (scelta/gesto)
  2) Combo (incastri/tempo)
  3) Profondità (lettura/ritorno)
  4) Flusso (ritmo)
  5) Bilanciamento (inseguimento/rebound)
  6) Decisioni (scelta dolorosa)

------------------------------------------------
CHIPS (OBBLIGO)
------------------------------------------------
In html1 inserisci una riga chips class="fg-chips" con 4–5 pill.
Almeno 2 pill devono contenere keyword (coerenti) tra:
“gioco da tavolo”, “gioco di carte”, “gioco competitivo”, “eurogame”, “deckbuilding”, “trick-taking”.

Le chips devono essere SOLO HTML (span), non testo libero.

------------------------------------------------
NO INVENTARE NUMERI
------------------------------------------------
Non inserire numeri specifici (componenti, carte, ore, scenari, ecc.)
a meno che siano chiaramente verificabili. Se dubbio: ometti.

------------------------------------------------
HTML3 (COME SI GIOCA)
------------------------------------------------
- Solo testo puro, niente HTML, niente markdown, niente asterischi
- Titoli in MAIUSCOLO
- Righe vuote tra paragrafi
- Turno: 1) 2) 3) 4)
- Breve e leggibile

------------------------------------------------
SEO META
------------------------------------------------
- seoTitle ≤ 70 caratteri, usa “–” mai “:”
  formato: “[Nome] – hook + 1 keyword”
- metaDescription ≤ 160 caratteri, nome + 1–2 keyword, tono FroGames
  niente player count/durata

------------------------------------------------
STRUTTURA DETTAGLIATA HTML1
------------------------------------------------
<section id="fg-[slug]" class="fg-wrap">
  <p class="fg-kicker">...</p>
  <h2 class="fg-title">NOME GIOCO</h2>
  <p class="fg-sub">Sottotitolo 1 riga</p>

  <p class="fg-p">[1 HOOK]</p>
  <p class="fg-p">[2 IMMERSIONE + “È un gioco da tavolo ...”]</p>

  <div class="fg-tagline">Tagline grande (1 frase)</div>

  <p class="fg-p">[3 DIFFERENZA / momento firma]</p>
  <p class="fg-p">[4 TARGET “È il gioco per chi…”]</p>

  <div class="fg-chips">...chips...</div>

  <div class="fg-divider" aria-hidden="true"></div>

  <h3 class="fg-h3">Perché NOME GIOCO ti resta in testa</h3>

  <div class="fg-grid">
    ... 6 <article class="fg-card"> ... </article>
  </div>

  <div class="fg-panel">Frase finale memorabile</div>
</section>
<style>CSS scoped + @media + contrast lock</style>

------------------------------------------------
STRUTTURA DETTAGLIATA HTML2
------------------------------------------------
<section id="fg-[slug]-2" class="fg-wrap">
  <p class="fg-kicker">...</p>
  <h2 class="fg-title">Titolo tematico (NON ripetere nome)</h2>
  <p class="fg-sub">Sottotitolo 1 riga</p>

  <p class="fg-p">[1 CUORE]</p>
  <p class="fg-p">[2 SCELTE & RISCHIO]</p>

  <div class="fg-tagline">Tagline grande (1 frase)</div>

  <p class="fg-p">[3 PAYOFF]</p>

  <h3 class="fg-h3">Dove ti premia</h3>

  <div class="fg-grid">
    ... 6 card valore ...
  </div>

  <h3 class="fg-h3">Dove ti mette alla prova</h3>

  <p class="fg-seo">SEO long 2–3 frasi</p>

  <div class="fg-panel">Frase finale memorabile</div>
</section>
<style>CSS scoped + @media + contrast lock</style>

------------------------------------------------
WEB (googleSearch)
------------------------------------------------
Usa web SOLO per: tipologia, tema, 3–6 feature distintive.
Non citare fonti esterne. Non dire “BGG/Google/recensioni”.

RISPOSTA: SOLO JSON con "html1", "html2", "html3", "seoTitle", "metaDescription".
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
