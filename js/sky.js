/* Fundo dinâmico: cena conforme a hora do dia + atmosfera conforme o tempo */

const Sky = (() => {
  const SCENES = ["dawn", "morning", "afternoon", "sunset", "night"];
  const MOODS = ["clear", "partly", "cloudy", "fog", "rain", "storm", "snow"];

  const state = {
    scene: null,
    mood: null,
    sunrise: null,   // Date
    sunset: null,    // Date
    forced: readForced()
  };

  function readForced() {
    const p = new URLSearchParams(location.search);
    const map = { manha: "morning", tarde: "afternoon", "por-do-sol": "sunset", noite: "night", amanhecer: "dawn" };
    const cena = p.get("cena");
    const tempo = p.get("tempo");
    const moodMap = { limpo: "clear", parcial: "partly", nublado: "cloudy", nevoa: "fog", chuva: "rain", tempestade: "storm", neve: "snow" };
    return {
      scene: SCENES.includes(cena) ? cena : (map[cena] || null),
      mood: MOODS.includes(tempo) ? tempo : (moodMap[tempo] || null)
    };
  }

  function sceneForTime(now = new Date()) {
    const sr = state.sunrise || atHour(now, 6, 0);
    const ss = state.sunset || atHour(now, 18, 0);
    const min = 60 * 1000;
    if (now < sr - 50 * min) return "night";
    if (now < sr + 40 * min) return "dawn";
    if (now.getHours() < 12) return "morning";
    if (now < ss - 80 * min) return "afternoon";
    if (now < ss + 35 * min) return "sunset";
    return "night";
  }

  function atHour(base, h, m) {
    const d = new Date(base); d.setHours(h, m, 0, 0); return d;
  }

  // Duas camadas de gradiente que se alternam para permitir transição suave
  let activeLayer = 0;
  function applyScene(scene) {
    if (scene === state.scene) return;
    const layers = Util.$$(".sky-layer");
    const next = layers[1 - activeLayer];
    next.className = `sky-layer scene-${scene}`;
    next.style.opacity = "1";
    layers[activeLayer].style.opacity = "0";
    activeLayer = 1 - activeLayer;

    SCENES.forEach(s => document.body.classList.remove("scene-" + s));
    document.body.classList.add("scene-" + scene);
    state.scene = scene;
  }

  function applyMood(mood) {
    if (mood === state.mood) return;
    MOODS.forEach(m => document.body.classList.remove("wx-" + m));
    document.body.classList.add("wx-" + mood);
    state.mood = mood;
  }

  // ---------- lua com fase real ----------
  const SYNODIC = 29.530588853; // dias entre duas luas novas
  const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14); // lua nova de referência

  // 0 = nova, 0.25 = quarto crescente, 0.5 = cheia, 0.75 = quarto minguante
  function moonPhase(date = new Date()) {
    const days = (date - NEW_MOON_REF) / 86400000;
    const p = (((days % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC;
    const k = (1 - Math.cos(2 * Math.PI * p)) / 2; // fração iluminada
    const names = [
      [0.033, "Lua nova"], [0.217, "Lua crescente"], [0.283, "Quarto crescente"], [0.467, "Crescente gibosa"],
      [0.533, "Lua cheia"], [0.717, "Minguante gibosa"], [0.783, "Quarto minguante"], [0.967, "Lua minguante"], [1.01, "Lua nova"]
    ];
    return { phase: p, illumination: k, waxing: p < 0.5, name: names.find(n => p < n[0])[1] };
  }

  function renderMoon() {
    const el = Util.$("#sky-moon");
    if (!el) return;
    // ?lua=2026-09-26 força a fase de uma data (para conferir o desenho)
    const forced = new URLSearchParams(location.search).get("lua");
    const m = moonPhase(forced ? new Date(forced + "T21:00:00") : new Date());
    const r = 48;
    const c = Math.cos(2 * Math.PI * m.phase); // +1 nova, 0 quarto, -1 cheia
    const rx = Math.abs(c) * r;
    // metade direita iluminada; o arco de volta (terminador) é uma elipse que
    // bojuda para o lado claro na fase côncava e para o lado escuro na gibosa
    const sweep = c > 0 ? 0 : 1;
    const lit = `M 0 ${-r} A ${r} ${r} 0 0 1 0 ${r} A ${rx} ${r} 0 0 ${sweep} 0 ${-r} Z`;
    // hemisfério sul enxerga a lua "de cabeça para baixo": crescente iluminada à esquerda
    const south = (Weather.getCurrent()?.location?.lat ?? -23) < 0;
    const mirror = (!m.waxing) !== south; // minguante XOR sul
    el.innerHTML = `
      <svg viewBox="-50 -50 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="moon-lit" cx="38%" cy="34%" r="80%">
            <stop offset="0" stop-color="#fff8ff"/><stop offset=".55" stop-color="#dccbff"/><stop offset="1" stop-color="#9f83e6"/>
          </radialGradient>
          <clipPath id="moon-clip"><path d="${lit}"/></clipPath>
        </defs>
        <circle r="${r}" fill="rgba(14, 8, 40, .92)"/>
        <g transform="scale(${mirror ? -1 : 1} 1)">
          <path d="${lit}" fill="#e6dbff"/>
          <path d="${lit}" fill="url(#moon-lit)"/>
          <g fill="rgba(90, 60, 150, .22)" clip-path="url(#moon-clip)">
            <circle cx="-14" cy="-10" r="9"/><circle cx="16" cy="6" r="6"/><circle cx="-4" cy="22" r="5"/><circle cx="20" cy="-22" r="4"/>
          </g>
        </g>
      </svg>`;
    el.style.setProperty("--moon-k", m.illumination.toFixed(2));
    el.title = `${m.name} (${Math.round(m.illumination * 100)}% iluminada)`;
    const label = Util.$("#sky-moon-label");
    if (label) label.textContent = `${m.name}, ${Math.round(m.illumination * 100)}%`;
    state.moon = m;
  }

  function buildStars() {
    const layers = Util.$$(".sky-stars i");
    layers.forEach((el, li) => {
      const shadows = [];
      const n = 70;
      for (let i = 0; i < n; i++) {
        const x = Math.round(Math.random() * 100 * 100) / 100;
        const y = Math.round(Math.random() * 70 * 100) / 100;
        const size = li === 0 ? 1 : 1.6;
        shadows.push(`${x}vw ${y}vh 0 ${Math.random() > .8 ? size * .6 : 0}px rgba(255,255,255,${.35 + Math.random() * .6})`);
      }
      el.style.boxShadow = shadows.join(",");
    });
  }

  function update() {
    applyScene(state.forced.scene || sceneForTime());
    if (state.forced.mood) applyMood(state.forced.mood);
    else if (!state.mood) applyMood("clear");
  }

  function setSun(sunrise, sunset) {
    if (sunrise instanceof Date && !isNaN(sunrise)) state.sunrise = sunrise;
    if (sunset instanceof Date && !isNaN(sunset)) state.sunset = sunset;
    update();
  }

  function setWeatherMood(mood) {
    if (!state.forced.mood) applyMood(mood);
  }

  function init() {
    buildStars();
    renderMoon();
    update();
    // só liga as transições depois do primeiro quadro: a cena inicial aparece pronta, sem sol "deslizando"
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("ready")));
    setInterval(update, 60 * 1000);
    setInterval(renderMoon, 60 * 60 * 1000);
    Weather.onUpdate(() => renderMoon()); // o hemisfério vem da localização
  }

  return { init, update, setSun, setWeatherMood, sceneForTime, moonPhase, renderMoon, state };
})();
