/* Inicialização e agendamento das atualizações */

const App = (() => {
  // Agenda uma tarefa periódica; se falhar, tenta de novo mais cedo até dar certo
  function schedule(name, task, intervalSec) {
    let timer = null;
    const run = async () => {
      clearTimeout(timer);
      let ok = false;
      try { ok = await task(); } catch (e) { console.error(`[${name}]`, e); }
      const next = ok ? intervalSec : CONFIG.intervalos.tentarNovamente;
      timer = setTimeout(run, next * 1000);
    };
    run();
    return { run };
  }

  const jobs = {};

  function init() {
    const params = new URLSearchParams(location.search);
    if (params.get("tv") === "1" || CONFIG.modoTV) document.body.classList.add("tv");

    Status.init();
    Sky.init();
    Lights.init();
    Clock.init();

    if (CONFIG.clima) Weather.init();
    if (CONFIG.radar) Radar.init();
    if (CONFIG.noticias) News.init();
    if (CONFIG.cotacoes) Quotes.init();
    if (CONFIG.dicas) Tips.init();
    if (CONFIG.radio) Radio.init();

    document.body.classList.toggle("no-radar", !CONFIG.radar);
    document.body.classList.toggle("no-news", !CONFIG.noticias);
    document.body.classList.toggle("no-weather", !CONFIG.clima);
    document.body.classList.toggle("no-quotes", !CONFIG.cotacoes);
    document.body.classList.toggle("no-tips", !CONFIG.dicas);
    document.body.classList.toggle("no-radio", !CONFIG.radio);

    if (CONFIG.clima) jobs.weather = schedule("clima", Weather.refresh, CONFIG.intervalos.clima);
    if (CONFIG.radar) jobs.radar = schedule("radar", Radar.refresh, CONFIG.intervalos.radar);
    if (CONFIG.noticias) jobs.news = schedule("notícias", News.refresh, CONFIG.intervalos.noticias);
    if (CONFIG.cotacoes) jobs.quotes = schedule("cotações", Quotes.refresh, CONFIG.intervalos.cotacoes);
    if (CONFIG.dicas) jobs.tips = schedule("dica", Tips.refresh, CONFIG.intervalos.dicas);

    // Quando a conexão volta, atualiza tudo imediatamente
    window.addEventListener("online", () => Object.values(jobs).forEach(j => j.run()));

    // Ao voltar para a aba depois de muito tempo, garante dados frescos
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        Clock.updateClock();
        Sky.update();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  return { jobs };
})();
