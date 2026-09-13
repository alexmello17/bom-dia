/* Cotações: Bitcoin em reais, variação do dia, últimos 7 dias e a sua posição */

const Quotes = (() => {
  const GECKO = "https://api.coingecko.com/api/v3";
  const BINANCE = "https://api.binance.com/api/v3";

  let data = null; // último dado válido
  const els = {};

  const brl = (n, digits = 0) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
  const pct = (n) => `${Math.abs(n).toLocaleString("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`;
  const btcFmt = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 9 });

  // ---------- preço atual ----------
  async function getBitcoin() {
    try {
      const j = await Util.fetchJSON(`${GECKO}/simple/price?ids=bitcoin&vs_currencies=brl,usd&include_24hr_change=true&include_last_updated_at=true`, { timeout: 10000 });
      const b = j.bitcoin;
      return { brl: b.brl, usd: b.usd, change24h: b.brl_24h_change, at: new Date(b.last_updated_at * 1000), fonte: "CoinGecko" };
    } catch (e) {
      // reserva: Binance, par BTC/BRL
      const t = await Util.fetchJSON(`${BINANCE}/ticker/24hr?symbol=BTCBRL`, { timeout: 10000 });
      return { brl: Number(t.lastPrice), usd: null, change24h: Number(t.priceChangePercent), at: new Date(), fonte: "Binance" };
    }
  }

  // ---------- últimos 7 dias (cache de 30 min) ----------
  async function getSparkline() {
    const cached = Util.storage.get("btc-7d");
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) return cached.points;
    try {
      const j = await Util.fetchJSON(`${GECKO}/coins/bitcoin/market_chart?vs_currency=brl&days=7`, { timeout: 10000 });
      const points = j.prices.map(p => p[1]);
      Util.storage.set("btc-7d", { at: Date.now(), points });
      return points;
    } catch (e) {
      return cached ? cached.points : null;
    }
  }

  // ---------- cotação em uma data passada (cache permanente) ----------
  async function priceOn(dateStr) {
    const key = `btc-hist:${dateStr}`;
    const cached = Util.storage.get(key);
    if (cached) return cached;
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) throw new Error(`Data inválida: ${dateStr} (use AAAA-MM-DD)`);
    const start = Date.UTC(y, m - 1, d);
    const kline = async (symbol) => {
      const k = await Util.fetchJSON(`${BINANCE}/klines?symbol=${symbol}&interval=1d&startTime=${start}&limit=1`, { timeout: 10000 });
      return k.length && k[0][0] - start <= 86400000 ? Number(k[0][4]) : null;
    };
    let close = await kline("BTCBRL"); // par em reais existe desde 2020
    if (close == null) {
      // datas mais antigas: BTC em dólar × dólar do dia (AwesomeAPI)
      const usd = await kline("BTCUSDT");
      if (usd == null) throw new Error(`Sem cotação para ${dateStr}`);
      const fmt = (t) => new Date(t).toISOString().slice(0, 10).replace(/-/g, "");
      const fx = await Util.fetchJSON(`https://economia.awesomeapi.com.br/json/daily/USD-BRL/6?start_date=${fmt(start - 5 * 86400000)}&end_date=${fmt(start)}`, { timeout: 10000 });
      if (!Array.isArray(fx) || !fx.length) throw new Error(`Sem cotação do dólar para ${dateStr}`);
      close = usd * Number(fx[0].bid); // o primeiro item é o mais recente do intervalo
    }
    Util.storage.set(key, close);
    return close;
  }

  // Aportes informados pela URL (?btc=…&investido=…) ficam salvos só neste navegador
  function aportesFromUrl() {
    const p = new URLSearchParams(location.search);
    if (!p.has("btc") && !p.has("investido")) return;
    if (p.get("btc") === "limpar") { localStorage.removeItem("bomdia:aportes"); }
    else {
      const a = {};
      for (const k of ["btc", "investido", "precoMedio"]) if (p.get(k)) a[k] = Number(String(p.get(k)).replace(",", "."));
      if (p.get("data")) a.data = p.get("data");
      Util.storage.set("aportes", [a]);
    }
    // limpa os parâmetros da barra de endereço
    ["btc", "investido", "precoMedio", "data"].forEach(k => p.delete(k));
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash);
  }

  const aportesAtivos = () => Util.storage.get("aportes") || CONFIG.cotacoesOpcoes.aportes || [];

  // Converte os aportes configurados em quantidade de BTC e total investido
  async function resolvePosition() {
    const aportes = aportesAtivos();
    if (!aportes.length) return null;
    let btc = 0, investido = 0, investidoConhecido = true;
    for (const a of aportes) {
      if (a.btc != null) {
        btc += Number(a.btc);
        if (a.investido != null) investido += Number(a.investido);
        else if (a.precoMedio != null) investido += Number(a.btc) * Number(a.precoMedio);
        else investidoConhecido = false;
      } else if (a.investido != null && a.precoMedio != null) {
        btc += Number(a.investido) / Number(a.precoMedio);
        investido += Number(a.investido);
      } else if (a.investido != null && a.data) {
        const preco = await priceOn(a.data);
        btc += Number(a.investido) / preco;
        investido += Number(a.investido);
      } else {
        throw new Error("Aporte inválido: informe btc, investido+precoMedio ou investido+data");
      }
    }
    return { btc, investido: investidoConhecido ? investido : null };
  }

  // ---------- renderização ----------
  function sparklineSvg(points) {
    if (!points || points.length < 2) return "";
    const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
    const w = 100, h = 30;
    const pts = points.map((p, i) => `${(i / (points.length - 1) * w).toFixed(2)},${(h - 2 - (p - min) / span * (h - 4)).toFixed(2)}`);
    const last = pts[pts.length - 1].split(",");
    return `<svg class="quote-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Últimos 7 dias">
      <polyline points="${pts.join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="2.2" fill="currentColor" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  const arrow = (n) => n >= 0 ? "▲" : "▼";
  const dir = (n) => n >= 0 ? "up" : "down";

  function render(d) {
    els.box.classList.remove("is-empty");
    els.price.textContent = brl(d.price.brl);
    els.change.textContent = `${arrow(d.price.change24h)} ${pct(d.price.change24h)} hoje`;
    els.change.className = `quote-change ${dir(d.price.change24h)}`;
    els.spark.innerHTML = sparklineSvg(d.spark);
    els.spark.className = `quote-spark-wrap ${d.spark ? dir(d.spark[d.spark.length - 1] - d.spark[0]) : ""}`;

    const pos = d.position;
    if (!pos) { els.position.hidden = true; return; }
    els.position.hidden = false;
    const ajuste = 1 + (Number(CONFIG.cotacoesOpcoes.ajusteVenda) || 0) / 100;
    const valor = pos.btc * d.price.brl * ajuste;
    const soPct = CONFIG.cotacoesOpcoes.exibir === "percentual";
    let html = `<span class="quote-pos-label">Sua posição</span>`;
    if (!soPct) html += `<b>${brl(valor, valor < 1000 ? 2 : 0)}</b>`;
    if (pos.investido != null && pos.investido > 0) {
      const ganho = valor - pos.investido, p = ganho / pos.investido * 100;
      html += `<span class="quote-delta ${dir(ganho)}">${arrow(ganho)} ${soPct ? pct(p) : `${brl(Math.abs(ganho), Math.abs(ganho) < 100 ? 2 : 0)} (${pct(p)})`}</span>`;
      html += `<span class="quote-pos-note">${soPct ? "sobre o investido" : `investido ${brl(pos.investido)}`}${ajuste !== 1 ? ", preço de venda" : ""}</span>`;
    } else {
      const var24 = valor - valor / (1 + d.price.change24h / 100);
      html += `<span class="quote-delta ${dir(var24)}">${arrow(var24)} ${soPct ? pct(d.price.change24h) : brl(Math.abs(var24), Math.abs(var24) < 100 ? 2 : 0)} hoje</span>`;
    }
    html += `<span class="quote-pos-note">${btcFmt(pos.btc)} BTC</span>`;
    els.position.innerHTML = html;
  }

  async function refresh() {
    try {
      const [price, spark, position] = await Promise.all([getBitcoin(), getSparkline(), resolvePosition()]);
      data = { price, spark, position, updatedAt: new Date() };
      Util.storage.set("quotes", data);
      render(data);
      Status.set("quotes", { state: "ok", at: data.updatedAt });
      return true;
    } catch (err) {
      console.warn("[cotações]", err.message);
      Status.set("quotes", { state: "error", at: data ? data.updatedAt : null, message: /Aporte|Sem cotação/.test(err.message) ? err.message : "" });
      return false;
    }
  }

  function init() {
    aportesFromUrl();
    els.box = Util.$("#quotes");
    els.price = Util.$("#quote-price");
    els.change = Util.$("#quote-change");
    els.spark = Util.$("#quote-spark");
    els.position = Util.$("#quote-position");
    const cached = Util.storage.get("quotes");
    if (cached) {
      try {
        cached.updatedAt = new Date(cached.updatedAt);
        cached.price.at = new Date(cached.price.at);
        data = cached; render(data);
        Status.set("quotes", { state: "ok", at: data.updatedAt });
      } catch (e) { console.warn("cache de cotações inválido", e); }
    }
  }

  return { init, refresh, getBitcoin, getSparkline, resolvePosition };
})();
