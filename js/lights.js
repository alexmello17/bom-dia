/* Luzes: cor do fundo e efeitos (como iluminação RGB de teclado gamer) */

const Lights = (() => {
  const MODES = [
    { id: "auto", nome: "Automático", dica: "Céu conforme a hora e o tempo" },
    { id: "cor", nome: "Cor fixa", dica: "Uma cor só, escolhida por você" },
    { id: "arco-iris", nome: "Arco-íris", dica: "Percorre todas as cores" },
    { id: "onda", nome: "Onda", dica: "Faixas de cor deslizando" },
    { id: "respiracao", nome: "Respiração", dica: "Uma cor pulsando devagar" }
  ];
  const SWATCHES = [300, 330, 0, 30, 55, 120, 180, 200, 230, 265];

  const els = {};
  let state = { modo: "auto", matiz: 285, velocidade: 40 };

  // HSL -> "r, g, b" (a grade do horizonte usa rgba(var(--grid), a))
  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map(v => Math.round(v * 255)).join(", ");
  }

  function apply() {
    const b = document.body;
    MODES.forEach(m => b.classList.remove("lights-" + m.id));
    b.classList.add("lights-" + state.modo);
    b.classList.toggle("lights-on", state.modo !== "auto");
    b.style.setProperty("--lh", state.matiz);
    b.style.setProperty("--lspeed", `${state.velocidade}s`);
    b.style.setProperty("--lgrid", hslToRgb(state.matiz, 95, 62));
    Util.storage.set("lights", state);

    if (els.panel) {
      Util.$$("[data-mode]", els.panel).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.mode === state.modo)));
      els.hue.value = String(state.matiz);
      els.speed.value = String(state.velocidade);
      els.panel.dataset.mode = state.modo;
      Util.$$(".swatch", els.panel).forEach(x => x.setAttribute("aria-pressed", String(Number(x.dataset.hue) === state.matiz)));
    }
  }

  function set(patch) { state = { ...state, ...patch }; apply(); }
  const cycle = () => set({ modo: MODES[(MODES.findIndex(m => m.id === state.modo) + 1) % MODES.length].id });

  function buildPanel() {
    els.panel.innerHTML = `
      <div class="lights-head"><b>Luzes</b><span>${Util.escapeHtml(MODES.find(m => m.id === state.modo)?.dica || "")}</span></div>
      <div class="lights-modes">
        ${MODES.map(m => `<button type="button" data-mode="${m.id}" aria-pressed="false" title="${Util.escapeHtml(m.dica)}">${m.nome}</button>`).join("")}
      </div>
      <label class="lights-row lights-hue-row">
        <span>Cor</span>
        <input id="lights-hue" type="range" min="0" max="360" step="1" aria-label="Matiz">
      </label>
      <div class="lights-swatches" role="group" aria-label="Cores rápidas">
        ${SWATCHES.map(h => `<button type="button" class="swatch" data-hue="${h}" style="--sw:${h}" aria-label="Matiz ${h}"></button>`).join("")}
      </div>
      <label class="lights-row">
        <span>Velocidade</span>
        <input id="lights-speed" type="range" min="6" max="120" step="1" aria-label="Velocidade" dir="rtl">
      </label>
      <p class="lights-tip">Tecla <kbd>L</kbd> alterna os modos; <kbd>,</kbd> e <kbd>.</kbd> mudam a cor.</p>`;
    els.hue = Util.$("#lights-hue", els.panel);
    els.speed = Util.$("#lights-speed", els.panel);
    Util.$$("[data-mode]", els.panel).forEach(x => x.addEventListener("click", () => {
      set({ modo: x.dataset.mode });
      Util.$(".lights-head span", els.panel).textContent = MODES.find(m => m.id === state.modo).dica;
    }));
    Util.$$(".swatch", els.panel).forEach(x => x.addEventListener("click", () => set({ matiz: Number(x.dataset.hue), modo: state.modo === "auto" ? "cor" : state.modo })));
    els.hue.addEventListener("input", () => set({ matiz: Number(els.hue.value), modo: state.modo === "auto" ? "cor" : state.modo }));
    els.speed.addEventListener("input", () => set({ velocidade: Number(els.speed.value) }));
  }

  function toggle(open = els.panel.hidden) {
    els.panel.hidden = !open;
    els.btn.setAttribute("aria-expanded", String(open));
  }

  function init() {
    els.btn = Util.$("#lights-btn");
    els.panel = Util.$("#lights-panel");
    if (!els.btn) return;

    const saved = Util.storage.get("lights");
    const cfg = CONFIG.luzes || {};
    state = { modo: cfg.modo || "auto", matiz: cfg.matiz ?? 285, velocidade: cfg.velocidade ?? 40, ...(saved || {}) };
    const url = new URLSearchParams(location.search).get("luz");
    if (url && MODES.some(m => m.id === url)) state.modo = url;

    buildPanel();
    apply();

    els.btn.addEventListener("click", () => toggle());
    document.addEventListener("click", (e) => { if (!els.panel.hidden && !els.panel.contains(e.target) && !els.btn.contains(e.target)) toggle(false); });
    document.addEventListener("keydown", (e) => {
      if (e.target instanceof Element && e.target.matches("input, textarea, [contenteditable]")) return;
      if (e.key === "l" || e.key === "L") { cycle(); e.preventDefault(); }
      if (e.key === ",") { set({ matiz: (state.matiz + 350) % 360, modo: state.modo === "auto" ? "cor" : state.modo }); }
      if (e.key === ".") { set({ matiz: (state.matiz + 10) % 360, modo: state.modo === "auto" ? "cor" : state.modo }); }
      if (e.key === "Escape") toggle(false);
    });
  }

  return { init, set, cycle, MODES };
})();
