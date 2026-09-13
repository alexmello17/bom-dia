/* Radar de chuva: mapa Leaflet + camadas de precipitação do RainViewer */

const Radar = (() => {
  const LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  const LEAFLET_CSS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  const RAINVIEWER = "https://api.rainviewer.com/public/weather-maps.json";

  // Mapas-base públicos (Esri), sem chave. Cada opção é [fundo, rótulos].
  const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
  const BASE = {
    mapa: [
      { url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, opts: { maxNativeZoom: 16, maxZoom: 18, attribution: "Esri, HERE, Garmin, OpenStreetMap" } },
      { url: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, opts: { maxNativeZoom: 16, maxZoom: 18, pane: "labels" } }
    ],
    satelite: [
      { url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, opts: { maxNativeZoom: 17, maxZoom: 18, attribution: "Esri, Maxar, Earthstar Geographics" } },
      { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, opts: { maxNativeZoom: 16, maxZoom: 18, pane: "labels" } }
    ]
  };

  const st = {
    map: null, baseLayer: null, baseKind: null, marker: null,
    frames: [], layers: [], index: 0, playing: true, timer: null,
    generatedAt: null, loc: null, mapReady: false
  };
  const els = {};

  // ---------- carregamento do Leaflet (tolerante a falta de internet) ----------
  async function ensureLeaflet() {
    if (window.L) return true;
    try {
      await Promise.all([Util.loadStyle(LEAFLET_CSS), Util.loadScript(LEAFLET_JS)]);
      return !!window.L;
    } catch (e) {
      console.warn("[radar]", e.message);
      return false;
    }
  }

  function buildMap(loc) {
    if (st.mapReady) return;
    st.loc = loc;
    st.map = L.map(els.map, {
      center: [loc.lat, loc.lon], zoom: CONFIG.radarOpcoes.zoom,
      zoomControl: false, attributionControl: true, zoomSnap: 0.5, worldCopyJump: true
    });
    st.map.attributionControl.setPrefix(false);
    st.map.createPane("labels").style.zIndex = 450; // rótulos acima do radar
    st.map.getPane("labels").style.pointerEvents = "none";
    L.control.zoom({ position: "bottomright", zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(st.map);
    setBase(CONFIG.radarOpcoes.mapaPadrao);

    st.marker = L.marker([loc.lat, loc.lon], {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: "pin-wrap", html: `<span class="pin"><i></i><b>${Util.escapeHtml(loc.nome || CONFIG.cidade)}</b></span>`, iconSize: [0, 0] })
    }).addTo(st.map);

    els.wrap.classList.remove("is-loading");
    st.mapReady = true;
    setTimeout(() => st.map.invalidateSize(), 50);
    new ResizeObserver(() => st.map && st.map.invalidateSize()).observe(els.map);
  }

  function setBase(kind) {
    if (!BASE[kind] || kind === st.baseKind) return;
    (st.baseLayer || []).forEach(l => st.map.removeLayer(l));
    st.baseLayer = BASE[kind].map(def => L.tileLayer(def.url, { zIndex: 1, ...def.opts }).addTo(st.map));
    st.baseKind = kind;
    Util.$$("[data-base]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.base === kind)));
  }

  // ---------- quadros do radar ----------
  async function getRainRadar() {
    const json = await Util.fetchJSON(RAINVIEWER);
    const host = json.host;
    const past = (json.radar?.past || []).slice(-CONFIG.radarOpcoes.quadrosPassados);
    const nowcast = json.radar?.nowcast || [];
    const frames = [
      ...past.map(f => ({ ...f, kind: "past" })),
      ...nowcast.map(f => ({ ...f, kind: "nowcast" }))
    ];
    if (past.length) frames[past.length - 1].kind = "now";
    return { host, frames, generatedAt: new Date(json.generated * 1000) };
  }

  function applyFrames({ host, frames, generatedAt }) {
    const color = CONFIG.radarOpcoes.esquemaCores;
    stopTimer();
    st.layers.forEach(l => st.map.removeLayer(l));
    // O serviço público entrega radar até o zoom 7; tiles de 512px dobram o detalhe e o Leaflet amplia o resto
    st.layers = frames.map(f =>
      L.tileLayer(`${host}${f.path}/512/{z}/{x}/{y}/${color}/1_1.png`, { opacity: 0, zIndex: 20, tileSize: 512, zoomOffset: -1, maxNativeZoom: 8, maxZoom: 18, keepBuffer: 0, updateWhenIdle: true }).addTo(st.map)
    );
    st.frames = frames;
    st.generatedAt = generatedAt;

    els.slider.max = String(Math.max(0, frames.length - 1));
    const nowIdx = frames.findIndex(f => f.kind === "now");
    els.timeline.style.setProperty("--now-pos", `${frames.length > 1 ? (Math.max(0, nowIdx) / (frames.length - 1)) * 100 : 100}%`);
    showFrame(nowIdx >= 0 ? nowIdx : frames.length - 1);
    if (st.playing) play();
  }

  function showFrame(i) {
    if (!st.frames.length) return;
    st.index = (i + st.frames.length) % st.frames.length;
    st.layers.forEach((l, k) => l.setOpacity(k === st.index ? 0.85 : 0));
    els.slider.value = String(st.index);
    const f = st.frames[st.index];
    const t = new Date(f.time * 1000);
    els.frameTime.textContent = Util.formatHour(t);
    els.frameKind.textContent = f.kind === "now" ? "agora" : f.kind === "nowcast" ? "previsão" : Util.relativeTime(t);
    els.timeline.dataset.kind = f.kind;
  }

  function play() {
    stopTimer();
    st.playing = true;
    els.play.setAttribute("aria-label", "Pausar animação");
    els.play.classList.add("is-playing");
    const step = () => {
      const f = st.frames[st.index];
      const delay = f && f.kind === "now" ? CONFIG.radarOpcoes.velocidadeMs * 2.4 : CONFIG.radarOpcoes.velocidadeMs;
      st.timer = setTimeout(() => { showFrame(st.index + 1); step(); }, delay);
    };
    step();
  }
  function pause() {
    stopTimer();
    st.playing = false;
    els.play.setAttribute("aria-label", "Reproduzir animação");
    els.play.classList.remove("is-playing");
  }
  function stopTimer() { if (st.timer) clearTimeout(st.timer); st.timer = null; }

  // ---------- estatísticas e leitura da situação ----------
  function updateStats(w) {
    if (!w) return;
    const now = new Date();
    const next = w.hourly.find(h => h.time > now) || w.hourly[1] || w.hourly[0];
    const next3 = w.hourly.filter(h => h.time > now).slice(0, 3);
    const prob3 = next3.length ? Math.max(...next3.map(h => h.prob ?? 0)) : (next?.prob ?? 0);

    els.precipNow.textContent = `${Util.fmtNumber(w.current.precip ?? 0)} mm`;
    els.precipNext.textContent = next ? `${Util.fmtNumber(next.precip ?? 0)} mm` : "—";
    els.prob.textContent = `${Util.round(prob3)}%`;
    els.approach.textContent = approachMessage(w, now);
  }

  function approachMessage(w, now) {
    const c = w.current;
    if ((c.precip ?? 0) >= 0.1 || c.mood === "rain" || c.mood === "storm") {
      const intensity = c.precip >= 4 ? "forte" : c.precip >= 1 ? "moderada" : "fraca";
      return c.mood === "storm" ? `Trovoadas sobre ${CONFIG.cidade} agora` : `Chovendo agora em ${CONFIG.cidade} (${intensity})`;
    }
    // horas ainda não encerradas (a atual + próximas)
    const upcoming = w.hourly.filter(h => h.time.getTime() + 3600e3 > now.getTime());
    const hit = upcoming.find(h => (h.precip ?? 0) >= 0.2 && (h.prob ?? 0) >= 50);
    if (hit) {
      const minutes = Math.round((hit.time - now) / 60000);
      if (minutes <= 10) return "Chuva prevista para os próximos minutos";
      if (minutes <= 6 * 60) {
        const rounded = minutes < 60 ? Math.round(minutes / 5) * 5 : Math.round(minutes / 15) * 15;
        return `Chuva se aproximando em aproximadamente ${Util.futureMinutesLabel(rounded)}`;
      }
      return `Chuva prevista a partir das ${Util.formatHour(hit.time)}`;
    }
    const later = upcoming.find(h => (h.prob ?? 0) >= 60);
    if (later) return `Possibilidade de chuva a partir das ${Util.formatHour(later.time)}`;
    return "Nenhuma chuva significativa se aproximando";
  }

  function updateRadarTime() {
    els.radarAt.textContent = st.generatedAt ? Util.relativeTime(st.generatedAt) : "—";
  }

  // ---------- ciclo ----------
  async function refresh() {
    try {
      if (!st.mapReady) {
        const ok = await ensureLeaflet();
        if (!ok) throw new Error("Mapa indisponível sem conexão");
        const loc = Weather.getCurrent()?.location || await geocodeFallback();
        buildMap(loc);
      }
      const radar = await getRainRadar();
      applyFrames(radar);
      updateRadarTime();
      Status.set("radar", { state: "ok", at: new Date() });
      return true;
    } catch (err) {
      console.warn("[radar]", err.message);
      Status.set("radar", { state: "error", at: st.generatedAt });
      return false;
    }
  }

  // Se o clima ainda não carregou (sem internet no início), usa as coordenadas da configuração ou espera
  async function geocodeFallback() {
    if (CONFIG.latitude != null && CONFIG.longitude != null) return { lat: CONFIG.latitude, lon: CONFIG.longitude, nome: CONFIG.cidade };
    const cached = Util.storage.get(`loc:${CONFIG.cidade}|${CONFIG.estado}|${CONFIG.pais}`);
    if (cached) return cached;
    await Weather.refresh();
    const w = Weather.getCurrent();
    if (!w) throw new Error("Localização indisponível");
    return w.location;
  }

  function init() {
    els.wrap = Util.$("#radar-map-wrap");
    els.map = Util.$("#radar-map");
    els.slider = Util.$("#radar-slider");
    els.play = Util.$("#radar-play");
    els.frameTime = Util.$("#radar-frame-time");
    els.frameKind = Util.$("#radar-frame-kind");
    els.timeline = Util.$("#radar-timeline");
    els.precipNow = Util.$("#radar-precip-now");
    els.precipNext = Util.$("#radar-precip-next");
    els.prob = Util.$("#radar-prob");
    els.radarAt = Util.$("#radar-updated");
    els.approach = Util.$("#radar-approach");

    els.play.addEventListener("click", () => st.playing ? pause() : play());
    els.slider.addEventListener("input", () => { pause(); showFrame(Number(els.slider.value)); });
    Util.$$("[data-base]").forEach(b => b.addEventListener("click", () => st.mapReady && setBase(b.dataset.base)));

    Weather.onUpdate(updateStats);
    const w = Weather.getCurrent();
    if (w) updateStats(w);
    setInterval(updateRadarTime, 30 * 1000);
  }

  return { init, refresh, getRainRadar };
})();
