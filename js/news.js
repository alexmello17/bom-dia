/* Notícias: várias fontes RSS mescladas em um único feed ao vivo */

const News = (() => {
  let items = [];        // último conjunto válido
  let updatedAt = null;

  // ---------- leitura de feeds ----------
  function parseXml(text, fonte) {
    const doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML inválido");
    const nodes = Array.from(doc.querySelectorAll("item, entry"));
    return nodes.map(n => {
      const get = (sel) => n.querySelector(sel)?.textContent?.trim() || "";
      const linkEl = n.querySelector("link");
      const link = linkEl?.getAttribute("href") || linkEl?.textContent?.trim() || "";
      const media = n.querySelector("content[url], thumbnail[url], enclosure[url]");
      const desc = get("description") || get("summary") || get("content");
      return normalizeItem({
        titulo: get("title"), link, data: get("pubDate") || get("published") || get("updated") || get("date"),
        resumo: desc, imagem: media?.getAttribute("url") || imgFromHtml(desc)
      }, fonte);
    });
  }

  function parseRss2Json(json, fonte) {
    if (json.status !== "ok" || !Array.isArray(json.items)) throw new Error(json.message || "rss2json falhou");
    return json.items.map(it => normalizeItem({
      titulo: it.title, link: it.link,
      data: it.pubDate ? it.pubDate.replace(" ", "T") + "Z" : "", // rss2json entrega em UTC
      resumo: it.description || it.content,
      imagem: it.thumbnail || it.enclosure?.link || imgFromHtml(it.description)
    }, fonte));
  }

  function imgFromHtml(html) {
    const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html || "");
    return m ? m[1] : "";
  }

  function normalizeItem(raw, fonte) {
    let titulo = Util.stripHtml(raw.titulo || "");
    const suffix = new RegExp(`\\s[-–|]\\s${fonte.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    titulo = titulo.replace(suffix, "");
    const data = raw.data ? new Date(raw.data) : null;
    return {
      titulo, link: raw.link || "", fonte: fonte.nome,
      data: data && !isNaN(data) ? data : null,
      resumo: Util.truncate(Util.stripHtml(raw.resumo || ""), 180),
      imagem: (raw.imagem || "").startsWith("http") ? raw.imagem : ""
    };
  }

  async function fetchFeed(fonte) {
    const tentativas = [];
    if (fonte.direto) tentativas.push({ tipo: "xml", url: fonte.url });
    CONFIG.noticiasOpcoes.conversores.forEach(c => tentativas.push(c(fonte.url)));

    let lastErr = null;
    for (const t of tentativas) {
      try {
        if (t.tipo === "rss2json") return parseRss2Json(await Util.fetchJSON(t.url, { timeout: 12000 }), fonte);
        if (t.tipo === "allorigins") {
          const j = await Util.fetchJSON(t.url, { timeout: 12000 });
          return parseXml(j.contents, fonte);
        }
        return parseXml(await Util.fetchText(t.url, { timeout: 12000 }), fonte);
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("Sem estratégia disponível");
  }

  // ---------- API do módulo ----------
  async function getNews() {
    const fontes = CONFIG.noticiasOpcoes.fontes;
    const results = await Promise.allSettled(fontes.map(fetchFeed));
    const ok = results.filter(r => r.status === "fulfilled");
    results.forEach((r, i) => { if (r.status === "rejected") console.warn(`[notícias] ${fontes[i].nome}:`, r.reason?.message); });
    if (!ok.length) throw new Error("Nenhuma fonte respondeu");

    const seen = new Set();
    const merged = ok.flatMap(r => r.value)
      .filter(it => it.titulo && it.link)
      .filter(it => {
        const k = it.titulo.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 80);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      })
      .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));

    // limita itens por fonte para manter variedade no topo do feed
    const porFonte = {}, cap = CONFIG.noticiasOpcoes.maximoPorFonte || Infinity;
    return merged.filter(it => (porFonte[it.fonte] = (porFonte[it.fonte] || 0) + 1) <= cap)
      .slice(0, CONFIG.noticiasOpcoes.maximo);
  }

  // ---------- renderização (carrossel) ----------
  const car = { pages: [], index: 0, timer: null, paused: false, box: null, dots: null, panel: null };
  const stacked = () => matchMedia("(max-width: 899px), (orientation: portrait)").matches;

  const meta = (it) => `<span class="news-meta"><span class="news-source">${Util.escapeHtml(it.fonte)}</span><time datetime="${it.data ? it.data.toISOString() : ""}">${it.data ? Util.relativeTime(it.data) : ""}</time></span>`;

  const leadHtml = (lead) => `
      <a class="news-lead" href="${Util.escapeHtml(lead.link)}" target="_blank" rel="noopener noreferrer"
         ${lead.imagem ? `style="--img:url('${encodeURI(lead.imagem)}')"` : ""}>
        <span class="news-lead-body">
          <span class="news-title">${Util.escapeHtml(lead.titulo)}</span>
          ${lead.resumo ? `<span class="news-summary">${Util.escapeHtml(lead.resumo)}</span>` : ""}
          ${meta(lead)}
        </span>
      </a>`;

  const itemsHtml = (list) => `
      <ul class="news-items">
        ${list.map(it => `
          <li>
            <a href="${Util.escapeHtml(it.link)}" target="_blank" rel="noopener noreferrer" title="${Util.escapeHtml(it.resumo || it.titulo)}">
              <span class="news-title">${Util.escapeHtml(it.titulo)}</span>
              ${meta(it)}
            </a>
          </li>`).join("")}
      </ul>`;

  // Quantas notícias cabem em uma página: mede a altura livre abaixo da manchete
  function itemsPerPage(list) {
    const box = car.box;
    box.innerHTML = leadHtml(list[0]) + itemsHtml([list[1] || list[0]]);
    const cs = getComputedStyle(box);
    const inner = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const lead = box.querySelector(".news-lead").offsetHeight;
    const ul = box.querySelector(".news-items");
    const ucs = getComputedStyle(ul);
    const rowH = parseFloat(ucs.gridAutoRows) || ul.querySelector("li").offsetHeight;
    const rowGap = parseFloat(ucs.rowGap) || 0;
    const cols = ucs.gridTemplateColumns.split(" ").length;
    const avail = inner - lead - (parseFloat(cs.rowGap) || 0);
    const rows = Math.max(1, Math.floor((avail + rowGap) / (rowH + rowGap)));
    return rows * cols;
  }

  // Divide a lista em páginas; em cada página a primeira notícia com imagem vira manchete
  function paginate(list, perPage) {
    const pages = [];
    for (let i = 0; i < list.length; i += perPage + 1) {
      const chunk = list.slice(i, i + perPage + 1);
      const li = chunk.findIndex(it => it.imagem);
      if (li > 0) chunk.unshift(...chunk.splice(li, 1));
      pages.push(chunk);
    }
    return pages;
  }

  function render(list) {
    if (!list.length) return;
    const box = car.box;
    box.classList.remove("is-empty");

    if (stacked()) {
      car.pages = [list];
    } else {
      const per = itemsPerPage(list);
      car.pages = paginate(list, per);
    }
    if (car.index >= car.pages.length) car.index = 0;
    showPage(car.index, false);
    renderDots();
    restartTimer();
  }

  function showPage(i, fade = true) {
    const page = car.pages[i];
    if (!page) return;
    car.index = i;
    const paint = () => {
      car.box.innerHTML = leadHtml(page[0]) + itemsHtml(page.slice(1));
      car.box.classList.remove("is-fading");
      updateDots();
    };
    if (fade && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      car.box.classList.add("is-fading");
      setTimeout(paint, 260);
    } else paint();
  }

  function renderDots() {
    car.dots.innerHTML = car.pages.length > 1
      ? car.pages.map((_, i) => `<button type="button" aria-label="Página ${i + 1} de ${car.pages.length}"></button>`).join("")
      : "";
    car.dots.style.setProperty("--dur", `${CONFIG.noticiasOpcoes.carrossel.intervalo || 0}s`);
    Util.$$("button", car.dots).forEach((b, i) => b.addEventListener("click", () => { showPage(i); restartTimer(); }));
    updateDots();
  }

  function updateDots() {
    Util.$$("button", car.dots).forEach((b, i) => {
      b.setAttribute("aria-current", String(i === car.index));
      if (i === car.index) { b.classList.remove("is-running"); void b.offsetWidth; b.classList.toggle("is-running", !car.paused); }
    });
  }

  const next = () => { showPage((car.index + 1) % car.pages.length); restartTimer(); };
  const prev = () => { showPage((car.index - 1 + car.pages.length) % car.pages.length); restartTimer(); };

  function restartTimer() {
    clearInterval(car.timer);
    const sec = CONFIG.noticiasOpcoes.carrossel.intervalo;
    if (!sec || car.pages.length < 2 || car.paused || stacked()) return;
    car.timer = setInterval(() => showPage((car.index + 1) % car.pages.length), sec * 1000);
  }

  function setPaused(p) {
    car.paused = p;
    car.panel.classList.toggle("is-paused", p);
    updateDots();
    restartTimer();
  }

  function refreshTimes() {
    Util.$$("#news-list time[datetime]").forEach(t => {
      if (t.dateTime) t.textContent = Util.relativeTime(new Date(t.dateTime));
    });
  }

  async function refresh() {
    try {
      const list = await getNews();
      items = list; updatedAt = new Date();
      Util.storage.set("news", { items, updatedAt });
      render(items);
      Status.set("news", { state: "ok", at: updatedAt });
      return true;
    } catch (err) {
      console.warn("[notícias]", err.message);
      Status.set("news", { state: "error", at: updatedAt });
      return false;
    }
  }

  function init() {
    car.box = Util.$("#news-list");
    car.dots = Util.$("#news-dots");
    car.panel = Util.$(".news");

    if (CONFIG.noticiasOpcoes.carrossel.pausarComMouse) {
      car.panel.addEventListener("mouseenter", () => setPaused(true));
      car.panel.addEventListener("mouseleave", () => setPaused(false));
    }
    document.addEventListener("keydown", (e) => {
      if ((e.target instanceof Element && e.target.matches("input, textarea, [contenteditable]")) || car.pages.length < 2) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { next(); e.preventDefault(); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { prev(); e.preventDefault(); }
    });
    // Reorganiza as páginas quando a área muda de tamanho (janela, modo TV, orientação)
    let resizeTimer = null;
    new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => items.length && render(items), 200); }).observe(car.box);

    const cached = Util.storage.get("news");
    if (cached?.items?.length) {
      items = cached.items.map(it => ({ ...it, data: it.data ? new Date(it.data) : null }));
      updatedAt = new Date(cached.updatedAt);
      render(items);
      Status.set("news", { state: "ok", at: updatedAt });
    }
    setInterval(refreshTimes, 30 * 1000);
  }

  return { init, refresh, getNews, next, prev };
})();
