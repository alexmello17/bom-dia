/* Dica de hoje: um filme ou série (1980–2010) por dia, com pôster da Wikipédia */

const Tips = (() => {
  const WIKI = "https://en.wikipedia.org/api/rest_v1/page/summary/";
  const els = {};
  let current = null;

  // Ordem embaralhada (fixa por dia) para percorrer a lista inteira sem repetir
  let ordem = [], pos = 0, timer = null;
  function shuffled(list) {
    const dias = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    let seed = dias * 9301 + 49297;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const idx = list.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  }

  function currentTip() {
    if (!ordem.length) ordem = shuffled(DICAS);
    const intervalo = Number(CONFIG.dicasOpcoes?.intervalo) || 0;
    const i = intervalo > 0 ? pos : (CONFIG.dicasOpcoes?.deslocamento || 0); // sem intervalo: um título por dia
    return DICAS[ordem[i % ordem.length]];
  }

  async function posterFor(dica) {
    const key = `poster:${dica.wiki}`;
    const cached = Util.storage.get(key);
    if (cached != null) return cached;
    try {
      const j = await Util.fetchJSON(WIKI + encodeURIComponent(dica.wiki.replace(/ /g, "_")), { timeout: 10000 });
      const poster = j.thumbnail?.source || j.originalimage?.source || "";
      Util.storage.set(key, poster);
      return poster;
    } catch (e) {
      return null; // tenta de novo na próxima vez
    }
  }

  async function getTip() {
    const dica = currentTip();
    if (!dica) return null;
    return { ...dica, poster: (await posterFor(dica)) || "" };
  }

  async function advance() {
    pos = (pos + 1) % ordem.length;
    const t = await getTip();
    if (!t) return;
    // pré-carrega o pôster do próximo para a troca ser instantânea
    posterFor(DICAS[ordem[(pos + 1) % ordem.length]]);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { render(t); current = t; return; }
    els.box.classList.add("is-fading");
    setTimeout(() => { render(t); current = t; els.box.classList.remove("is-fading"); }, 260);
  }

  function render(t) {
    els.box.classList.remove("is-empty");
    els.box.href = `https://pt.wikipedia.org/w/index.php?search=${encodeURIComponent(`${t.titulo} ${t.ano} ${t.tipo.toLowerCase()}`)}`;
    els.title.textContent = t.titulo;
    els.meta.innerHTML = `<span>${Util.escapeHtml(t.tipo)}</span><span>${t.ano}</span>`;
    els.synopsis.textContent = t.sinopse;
    if (t.poster) {
      els.poster.style.backgroundImage = `url("${t.poster}")`;
      els.poster.classList.add("has-image");
    } else {
      els.poster.style.backgroundImage = "";
      els.poster.classList.remove("has-image");
    }
  }

  async function refresh() {
    try {
      const t = await getTip();
      if (!t) return false;
      if (!current || current.titulo !== t.titulo || current.poster !== t.poster) render(t);
      current = t;
      return true;
    } catch (err) {
      console.warn("[dica]", err.message);
      return false;
    }
  }

  function init() {
    els.box = Util.$("#tip");
    els.poster = Util.$("#tip-poster");
    els.title = Util.$("#tip-title");
    els.meta = Util.$("#tip-meta");
    els.synopsis = Util.$("#tip-synopsis");
    // mostra o título imediatamente; o pôster chega depois
    const t = currentTip();
    if (t) render({ ...t, poster: Util.storage.get(`poster:${t.wiki}`) || "" });

    const intervalo = Number(CONFIG.dicasOpcoes?.intervalo) || 0;
    if (intervalo > 0) {
      const start = () => { clearInterval(timer); timer = setInterval(advance, intervalo * 1000); };
      start();
      // mouse em cima pausa a troca
      els.box.addEventListener("mouseenter", () => clearInterval(timer));
      els.box.addEventListener("mouseleave", start);
    }
  }

  return { init, refresh, getTip };
})();
