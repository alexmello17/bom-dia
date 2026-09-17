/* Iluminação do rádio: cor do display, LEDs e marcadores (como o botão ILL dos toca-CDs automotivos) */

const Lights = (() => {
  const MODES = [
    { id: "padrao", nome: "Âmbar", dica: "Iluminação clássica" },
    { id: "cor", nome: "Cor fixa", dica: "Uma cor escolhida por você" },
    { id: "arco-iris", nome: "Arco-íris", dica: "Percorre todas as cores" },
    { id: "respiracao", nome: "Respiração", dica: "A cor pulsa devagar" }
  ];
  const SWATCHES = [36, 0, 330, 300, 265, 230, 200, 180, 120, 55];
  const AMBER = 36;

  const els = {};
  let state = { modo: "padrao", matiz: AMBER, velocidade: 40 };
  let timer = null;

  function setVars(h, l = 64) {
    const r = els.radio.style;
    r.setProperty("--ill-h", h);
    r.setProperty("--ill-l", `${l}%`);
  }

  function apply() {
    clearInterval(timer);
    const h = state.modo === "padrao" ? AMBER : state.matiz;
    setVars(h);
    els.radio.dataset.ill = state.modo;
    Util.storage.set("radio-ill", state);

    // efeitos animados: atualização leve (12×/s) só das variáveis de cor
    const t0 = Date.now();
    const periodo = Math.max(3, state.velocidade) * 1000;
    if (state.modo === "arco-iris") {
      timer = setInterval(() => setVars(((Date.now() - t0) / periodo * 360 + state.matiz) % 360), 80);
    } else if (state.modo === "respiracao") {
      timer = setInterval(() => {
        const f = (Math.sin((Date.now() - t0) / (periodo / 8) * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0..1
        setVars(state.matiz, 40 + f * 30);
      }, 80);
    }

    if (els.panel) {
      Util.$$("[data-mode]", els.panel).forEach(x => x.setAttribute("aria-pressed", String(x.dataset.mode === state.modo)));
      els.hue.value = String(state.matiz);
      els.speed.value = String(state.velocidade);
      els.panel.dataset.mode = state.modo;
      Util.$$(".swatch", els.panel).forEach(x => x.setAttribute("aria-pressed", String(Number(x.dataset.hue) === state.matiz && state.modo !== "padrao")));
      Util.$(".ill-head span", els.panel).textContent = MODES.find(m => m.id === state.modo).dica;
    }
  }

  function set(patch) { state = { ...state, ...patch }; apply(); }
  const cycle = () => set({ modo: MODES[(MODES.findIndex(m => m.id === state.modo) + 1) % MODES.length].id });
  const pickHue = (h) => set({ matiz: h, modo: state.modo === "padrao" || state.modo === "arco-iris" ? "cor" : state.modo });

  function buildPanel() {
    els.panel.innerHTML = `
      <div class="ill-head"><b>Iluminação</b><span></span></div>
      <div class="ill-modes">
        ${MODES.map(m => `<button type="button" data-mode="${m.id}" aria-pressed="false" title="${Util.escapeHtml(m.dica)}">${m.nome}</button>`).join("")}
      </div>
      <label class="ill-row ill-hue-row">
        <span>Cor</span>
        <input id="ill-hue" type="range" min="0" max="360" step="1" aria-label="Matiz">
      </label>
      <div class="ill-swatches" role="group" aria-label="Cores rápidas">
        ${SWATCHES.map(h => `<button type="button" class="swatch" data-hue="${h}" style="--sw:${h}" aria-label="Matiz ${h}"></button>`).join("")}
      </div>
      <label class="ill-row ill-speed-row">
        <span>Velocidade</span>
        <input id="ill-speed" type="range" min="4" max="120" step="1" aria-label="Velocidade" dir="rtl">
      </label>
      <p class="ill-tip"><kbd>L</kbd> alterna os modos · <kbd>,</kbd> <kbd>.</kbd> mudam a cor</p>`;
    els.hue = Util.$("#ill-hue", els.panel);
    els.speed = Util.$("#ill-speed", els.panel);
    Util.$$("[data-mode]", els.panel).forEach(x => x.addEventListener("click", () => set({ modo: x.dataset.mode })));
    Util.$$(".swatch", els.panel).forEach(x => x.addEventListener("click", () => pickHue(Number(x.dataset.hue))));
    els.hue.addEventListener("input", () => pickHue(Number(els.hue.value)));
    els.speed.addEventListener("input", () => set({ velocidade: Number(els.speed.value) }));
  }

  function toggle(open = els.panel.hidden) {
    els.panel.hidden = !open;
    els.btn.setAttribute("aria-expanded", String(open));
  }

  function init() {
    els.radio = Util.$("#radio");
    els.btn = Util.$("#ill-btn");
    els.panel = Util.$("#ill-panel");
    if (!els.radio || !els.btn) return;

    const cfg = CONFIG.radioOpcoes?.iluminacao || {};
    const saved = Util.storage.get("radio-ill");
    state = { modo: cfg.modo || "padrao", matiz: cfg.matiz ?? AMBER, velocidade: cfg.velocidade ?? 40, ...(saved || {}) };
    if (!MODES.some(m => m.id === state.modo)) state.modo = "padrao";

    buildPanel();
    apply();

    els.btn.addEventListener("click", () => toggle());
    document.addEventListener("click", (e) => { if (!els.panel.hidden && !els.panel.contains(e.target) && !els.btn.contains(e.target)) toggle(false); });
    document.addEventListener("keydown", (e) => {
      if (e.target instanceof Element && e.target.matches("input, textarea, [contenteditable]")) return;
      if (e.key === "l" || e.key === "L") { cycle(); e.preventDefault(); }
      if (e.key === ",") pickHue((state.matiz + 350) % 360);
      if (e.key === ".") pickHue((state.matiz + 10) % 360);
      if (e.key === "Escape") toggle(false);
    });
  }

  return { init, set, cycle, MODES };
})();
