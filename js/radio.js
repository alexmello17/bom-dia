/* Rádio: player de estações ao vivo (streams públicos), abaixo das notícias */

const Radio = (() => {
  const els = {};
  let audio = null;
  let index = 0;
  let wanted = false;      // usuário pediu para tocar
  let retryTimer = null;

  const stations = () => CONFIG.radioOpcoes.estacoes || [];

  function setStatus(text, state = "") {
    els.status.textContent = text;
    els.box.dataset.state = state;
  }

  function showStation() {
    const s = stations()[index];
    if (!s) return;
    els.name.textContent = s.nome;
    els.desc.textContent = s.descricao || "";
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
  const next = () => load(index + 1);
  const prev = () => load(index - 1);

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
    if (!els.box || !stations().length) return;

    bindAudio();
    const saved = Util.storage.get("radio") || {};
    audio.volume = saved.volume ?? (CONFIG.radioOpcoes.volume ?? 0.8);
    els.volume.value = String(Math.round(audio.volume * 100));
    load(saved.index ?? 0, false);

    els.play.addEventListener("click", toggle);
    els.next.addEventListener("click", next);
    els.prev.addEventListener("click", prev);
    els.volume.addEventListener("input", () => { audio.volume = Number(els.volume.value) / 100; Util.storage.set("radio", { index, volume: audio.volume }); });

    // atalhos: P toca/pausa, [ e ] trocam de estação; teclas de mídia do controle também
    document.addEventListener("keydown", (e) => {
      if (e.target instanceof Element && e.target.matches("input, textarea, [contenteditable]")) return;
      if (e.key === "p" || e.key === "P" || e.key === "MediaPlayPause") { toggle(); e.preventDefault(); }
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
