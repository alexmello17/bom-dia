/* Relógio, data e saudação */

const Clock = (() => {
  const els = {};
  const dateFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let lastDateKey = null;

  function greeting(now) {
    if (CONFIG.saudacao && CONFIG.saudacao !== "auto") return CONFIG.saudacao;
    const h = now.getHours();
    if (h >= 5 && h < 12) return "Bom dia";
    if (h >= 12 && h < 18) return "Boa tarde";
    return "Boa noite";
  }

  function updateClock() {
    const now = new Date();
    els.time.textContent = timeFmt.format(now);
    els.seconds.textContent = String(now.getSeconds()).padStart(2, "0");

    const key = now.toDateString() + greeting(now);
    if (key !== lastDateKey) {
      lastDateKey = key;
      els.date.textContent = Util.capitalize(dateFmt.format(now));
      els.greeting.textContent = `${greeting(now)}, ${CONFIG.nome}`;
      document.title = `${greeting(now)}, ${CONFIG.nome}`;
    }
  }

  function init() {
    els.time = Util.$("#clock-time");
    els.seconds = Util.$("#clock-seconds");
    els.date = Util.$("#date");
    els.greeting = Util.$("#greeting");
    updateClock();
    // alinha o tick com o início de cada segundo
    setTimeout(() => { updateClock(); setInterval(updateClock, 1000); }, 1000 - (Date.now() % 1000));
  }

  return { init, updateClock, greeting };
})();
