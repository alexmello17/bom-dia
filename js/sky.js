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
    update();
    setInterval(update, 60 * 1000);
  }

  return { init, update, setSun, setWeatherMood, sceneForTime, state };
})();
