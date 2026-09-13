/* Indicadores discretos de atualização por seção ("Atualizado há 2 min") */

const Status = (() => {
  const sections = {}; // id -> { el, state, at, message }

  function render(id) {
    const s = sections[id];
    if (!s || !s.el) return;
    let text = "";
    if (s.state === "waiting") text = "Aguardando atualização…";
    else if (s.state === "error") text = s.at
      ? `Não foi possível atualizar. Tentando novamente… (dados ${Util.relativeTime(s.at)})`
      : "Não foi possível atualizar os dados. Tentando novamente…";
    else if (s.state === "ok") text = s.at ? `Atualizado ${Util.relativeTime(s.at)}` : "Atualizado";
    if (s.message) text = s.message;
    s.el.textContent = text;
    s.el.dataset.state = s.state;
  }

  function set(id, { state, at, message } = {}) {
    const s = sections[id] || (sections[id] = { el: document.querySelector(`[data-status="${id}"]`) });
    if (state) s.state = state;
    if (at !== undefined) s.at = at;
    s.message = message || "";
    render(id);
  }

  function init() {
    Util.$$("[data-status]").forEach(el => {
      sections[el.dataset.status] = { el, state: "waiting", at: null };
      render(el.dataset.status);
    });
    setInterval(() => Object.keys(sections).forEach(render), 30 * 1000);
  }

  return { init, set };
})();
