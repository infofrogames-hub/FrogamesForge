function buildRepairPrompt(basePrompt: string, e: ValidationErrors): string {
  const fixes: string[] = [];

  if (e.html1.some(x => x.includes("È un gioco da tavolo"))) {
    fixes.push(`- RISCRIVI SOLO il 2° <p class="fg-p"> di html1: deve iniziare con "È un gioco da tavolo" e finire con punto.`);
  }
  if (e.html1.some(x => x.includes("chips"))) {
    fixes.push(`- RIGENERA SOLO la riga chips di html1: ESATTAMENTE 4–5 <span class="fg-chip">...</span> dentro <div class="fg-chips">.`);
  }
  if (e.html2.some(x => x.includes("SEO long"))) {
    fixes.push(`- In html2 aggiungi <p class="fg-seo"> (2–3 frasi, 380–520 caratteri) con "gioco da tavolo" + 4 keyword naturali.`);
  }
  if (e.html1.some(x => x.includes("fg-sub")) || e.html2.some(x => x.includes("fg-sub"))) {
    fixes.push(`- Assicurati che html1 e html2 contengano SEMPRE <p class="fg-sub"> (1 riga) per la gerarchia.`);
  }
  if (e.html1.some(x => x.includes("fg-tagline")) || e.html2.some(x => x.includes("fg-tagline"))) {
    fixes.push(`- Assicurati che html1 e html2 contengano SEMPRE <div class="fg-tagline"> (1 frase corta) in evidenza.`);
  }

  // ✅ NEW: forza .fg-grid + @media scoped
  if (
    e.html1.some(x => x.includes(".fg-grid con @media")) ||
    e.html2.some(x => x.includes(".fg-grid con @media"))
  ) {
    fixes.push(
      `- CSS: nello <style> di html1 e html2 DEVI avere .fg-grid e DEVI avere 3 breakpoint @media scoped sull'id:` +
      `  1 col base, 2 col ≥720px, 3 col ≥1050px. (Non lasciare .fg-grid fuori scope).`
    );
  }

  // ✅ NEW: forza contrast lock id-specific con sintassi esatta
  if (
    e.html1.some(x => x.includes("contrast lock")) ||
    e.html2.some(x => x.includes("contrast lock"))
  ) {
    fixes.push(
      `- CONTRAST LOCK: all'inizio dello <style> scoped, inserisci ESATTAMENTE:` +
      `  "#ID, #ID * { color:#FFFFFF !important; }" dove #ID è l'id reale della section di quel blocco (html1 e html2).`
    );
  }

  if (e.html3.length) {
    fixes.push(`- html3: SOLO TESTO PURO (no HTML, no markdown, no asterischi).`);
  }
  if (e.meta.length) {
    fixes.push(`- seoTitle ≤70 (usa “–”, no “:”), metaDescription ≤160.`);
  }

  const repairInstructions =
    fixes.length > 0 ? fixes.join("\n") : `- Rigenera completamente l'output rispettando TUTTI i vincoli.`;

  return `
${basePrompt}

================================================
REPAIR (ALTISSIMA PRIORITÀ)
================================================
Hai fallito la validazione. Correggi e restituisci SOLO JSON valido, senza spiegazioni.

CORREGGI SOLO QUESTE COSE (non cambiare estetica/layout se già presenti):
${repairInstructions}

Regola dura: niente frasi troncate. Ogni paragrafo finisce con un punto.
Rispondi SOLO JSON.
`.trim();
}
