/* Rádio: player de estações ao vivo (streams públicos), abaixo das notícias */

const Radio = (() => {
  const els = {};
  let audio = null;
  let index = 0;
  let wanted = false;      // usuário pediu para tocar
  let retryTimer = null;
  let flashTimer = null;
  let tuneAngle = 0;

  const stations = () => CONFIG.radioOpcoes.estacoes || [];

  function setStatus(text, state = "") {
    els.status.textContent = text;
    els.box.dataset.state = state;
  }

  // Mensagem passageira no display (ex.: VOL 80)
  function flash(text) {
    clearTimeout(flashTimer);
    els.box.classList.add("is-flashing");
    els.desc.dataset.flash = text;
    flashTimer = setTimeout(() => els.box.classList.remove("is-flashing"), 1400);
  }

  function setVolume(v, show = true) {
    audio.volume = Math.min(1, Math.max(0, v));
    els.volume.value = String(Math.round(audio.volume * 100));
    // knob de volume gira de -135° (mudo) a +135° (máximo)
    els.play.style.setProperty("--angle", `${-135 + audio.volume * 270}deg`);
    Util.storage.set("radio", { index, volume: audio.volume });
    if (show) flash(`VOL ${Math.round(audio.volume * 100)}`);
  }

  function renderPresets() {
    els.presets.innerHTML = stations().map((st, i) =>
      `<button type="button" class="preset" data-i="${i}" aria-label="${Util.escapeHtml(st.nome)}" title="${Util.escapeHtml(st.nome)}">${i + 1}</button>`).join("");
    Util.$$(".preset", els.presets).forEach(b => b.addEventListener("click", () => load(Number(b.dataset.i), true)));
  }

  // Liga o comportamento de "girar" a um knob: roda do mouse e arrasto vertical
  function bindKnob(el, onStep) {
    el.addEventListener("wheel", (e) => { e.preventDefault(); onStep(e.deltaY < 0 ? 1 : -1); }, { passive: false });
    let startY = null, acc = 0;
    el.addEventListener("pointerdown", (e) => { startY = e.clientY; acc = 0; el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", (e) => {
      if (startY == null) return;
      const dy = startY - e.clientY;
      const steps = Math.trunc(dy / 12) - acc;
      if (steps) { onStep(steps); acc += steps; el.dataset.dragged = "1"; }
    });
    const end = () => { startY = null; setTimeout(() => delete el.dataset.dragged, 0); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  function showStation() {
    const s = stations()[index];
    if (!s) return;
    els.name.textContent = s.nome;
    els.desc.textContent = s.descricao || "";
    if (els.track) els.track.textContent = String(index + 1).padStart(2, "0");
    Util.$$(".preset", els.presets).forEach((b, i) => b.setAttribute("aria-pressed", String(i === index)));
    els.tune.style.setProperty("--angle", `${tuneAngle}deg`);
    Util.storage.set("radio", { index, volume: audio.volume });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: s.nome, artist: s.descricao || "Rádio ao vivo", album: "Bom Dia" });
    }
  }

  function load(i, autoplay = wanted) {
    const list = stations();
    if (!list.length) return;
    index = (i + list.length) % list.length;
    clearTimeout(retryTimer);
    showStation();
    audio.src = list[index].url;
    if (autoplay) play();
    else setStatus("Pronta para tocar", "idle");
  }

  async function play() {
    wanted = true;
    setStatus("Conectando…", "loading");
    try {
      if (!audio.src) audio.src = stations()[index].url;
      await audio.play();
    } catch (e) {
      // autoplay bloqueado ou stream fora do ar
      console.warn("[rádio]", e.message);
      setStatus(e.name === "NotAllowedError" ? "Toque em ▶ para ouvir" : "Não foi possível conectar", "error");
      if (e.name === "NotAllowedError") wanted = false;
    }
  }

  function pause() {
    wanted = false;
    clearTimeout(retryTimer);
    audio.pause();
    setStatus("Pausada", "idle");
  }

  const toggle = () => (audio.paused ? play() : pause());
  const next = () => { tuneAngle += 30; load(index + 1); };
  const prev = () => { tuneAngle -= 30; load(index - 1); };

  function bindAudio() {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("playing", () => setStatus("Ao vivo", "playing"));
    audio.addEventListener("waiting", () => setStatus("Carregando…", "loading"));
    audio.addEventListener("stalled", () => wanted && setStatus("Reconectando…", "loading"));
    audio.addEventListener("pause", () => { if (!wanted) setStatus("Pausada", "idle"); });
    audio.addEventListener("error", () => {
      if (!wanted) return;
      setStatus("Estação fora do ar. Tentando de novo…", "error");
      // recarrega o stream depois de alguns segundos (queda de conexão é comum em rádio online)
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { audio.load(); play(); }, 8000);
    });
    // se a conexão da internet voltar, retoma
    window.addEventListener("online", () => { if (wanted) { audio.load(); play(); } });
  }

  function init() {
    els.box = Util.$("#radio");
    els.play = Util.$("#radio-play");
    els.prev = Util.$("#radio-prev");
    els.next = Util.$("#radio-next");
    els.name = Util.$("#radio-name");
    els.desc = Util.$("#radio-desc");
    els.status = Util.$("#radio-status");
    els.volume = Util.$("#radio-volume");
    els.presets = Util.$("#radio-presets");
    els.tune = Util.$("#radio-tune");
    els.track = Util.$("#radio-track");
    els.eject = Util.$("#radio-eject");
    if (!els.box || !stations().length) return;

    bindAudio();
    renderPresets();
    const saved = Util.storage.get("radio") || {};
    setVolume(saved.volume ?? (CONFIG.radioOpcoes.volume ?? 0.8), false);
    load(saved.index ?? 0, false);

    // knob VOL: clique liga/desliga (ignorado se foi um arrasto), roda/arrasto ajusta o volume
    els.play.addEventListener("click", () => { if (!els.play.dataset.dragged) toggle(); });
    bindKnob(els.play, (steps) => setVolume(audio.volume + steps * 0.05));
    // knob TUNE: clique avança, roda troca nos dois sentidos
    els.tune.addEventListener("click", () => { if (!els.tune.dataset.dragged) next(); });
    bindKnob(els.tune, (steps) => (steps > 0 ? next() : prev()));
    els.next.addEventListener("click", next);
    els.prev.addEventListener("click", prev);
    if (els.eject) els.eject.addEventListener("click", () => (audio.paused ? play() : pause()));
    els.volume.addEventListener("input", () => setVolume(Number(els.volume.value) / 100));

    // atalhos: P toca/pausa, [ e ] trocam de estação; teclas de mídia do controle também
    document.addEventListener("keydown", (e) => {
      if (e.target instanceof Element && e.target.matches("input, textarea, [contenteditable]")) return;
      if (e.key === "p" || e.key === "P" || e.key === "MediaPlayPause") { toggle(); e.preventDefault(); }
      if (e.key === "+" || e.key === "=") { setVolume(audio.volume + 0.05); e.preventDefault(); }
      if (e.key === "-" || e.key === "_") { setVolume(audio.volume - 0.05); e.preventDefault(); }
      if (e.key === "]" || e.key === "MediaTrackNext") { next(); e.preventDefault(); }
      if (e.key === "[" || e.key === "MediaTrackPrevious") { prev(); e.preventDefault(); }
    });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", play);
      navigator.mediaSession.setActionHandler("pause", pause);
      navigator.mediaSession.setActionHandler("nexttrack", next);
      navigator.mediaSession.setActionHandler("previoustrack", prev);
    }
    if (CONFIG.radioOpcoes.tocarAoAbrir) play(); // só funciona se o navegador permitir autoplay
  }

  return { init, play, pause, toggle, next, prev };
})();
