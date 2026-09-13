/* Clima atual + previsão (Open-Meteo, sem chave) */

const Weather = (() => {
  const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

  // Nomes dos estados brasileiros para casar com o campo admin1 da geocodificação
  const UF = {
    AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
    ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
    PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
    RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins"
  };

  const listeners = [];
  let data = null; // último dado válido (formato interno)

  // ---------- localização ----------
  async function getLocation() {
    if (CONFIG.latitude != null && CONFIG.longitude != null) {
      return { lat: CONFIG.latitude, lon: CONFIG.longitude, nome: CONFIG.cidade, timezone: null };
    }
    const key = `loc:${CONFIG.cidade}|${CONFIG.estado}|${CONFIG.pais}`;
    const cached = Util.storage.get(key);
    if (cached) return cached;

    const url = `${GEO_URL}?name=${encodeURIComponent(CONFIG.cidade)}&count=10&language=pt&format=json&countryCode=${encodeURIComponent(CONFIG.pais)}`;
    const res = await Util.fetchJSON(url);
    const results = res.results || [];
    if (!results.length) throw new Error(`Cidade não encontrada: ${CONFIG.cidade}`);

    const wanted = (UF[CONFIG.estado] || CONFIG.estado || "").toLowerCase();
    const match = results.find(r => (r.admin1 || "").toLowerCase() === wanted) || results[0];
    const loc = { lat: match.latitude, lon: match.longitude, nome: match.name, timezone: match.timezone };
    Util.storage.set(key, loc);
    return loc;
  }

  // ---------- consulta ----------
  async function fetchForecast(loc) {
    const params = new URLSearchParams({
      latitude: loc.lat, longitude: loc.lon,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,uv_index",
      hourly: "temperature_2m,precipitation_probability,precipitation,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max",
      timezone: "auto", forecast_days: 7, forecast_hours: 24
    });
    return Util.fetchJSON(`${FORECAST_URL}?${params}`);
  }

  // Qualidade do ar (opcional: se falhar, o resto do clima continua)
  async function fetchAir(loc) {
    try {
      const j = await Util.fetchJSON(`${AIR_URL}?latitude=${loc.lat}&longitude=${loc.lon}&current=us_aqi,pm2_5,pm10&timezone=auto`, { timeout: 10000 });
      return { aqi: j.current.us_aqi, pm25: j.current.pm2_5, pm10: j.current.pm10 };
    } catch (e) {
      console.warn("[ar]", e.message);
      return null;
    }
  }

  // Escalas em português
  const DIRECOES = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  const windDir = (deg) => deg == null ? "" : DIRECOES[Math.round(deg / 45) % 8];
  function uvLabel(uv) {
    if (uv == null) return "";
    if (uv < 3) return "baixo"; if (uv < 6) return "moderado"; if (uv < 8) return "alto"; if (uv < 11) return "muito alto"; return "extremo";
  }
  function aqiLabel(aqi) {
    if (aqi == null) return "";
    if (aqi <= 50) return "Boa"; if (aqi <= 100) return "Moderada"; if (aqi <= 150) return "Ruim p/ sensíveis"; if (aqi <= 200) return "Ruim"; if (aqi <= 300) return "Muito ruim"; return "Perigosa";
  }

  // Transforma a resposta da API no formato interno usado pela interface
  function normalize(raw, loc, air) {
    const c = raw.current;
    const now = Icons.describe(c.weather_code, c.is_day === 1);
    const hourly = raw.hourly.time.map((t, i) => ({
      time: new Date(t),
      temp: raw.hourly.temperature_2m[i],
      prob: raw.hourly.precipitation_probability[i],
      precip: raw.hourly.precipitation[i],
      code: raw.hourly.weather_code[i]
    }));
    const daily = raw.daily.time.map((t, i) => ({
      date: new Date(t + "T12:00:00"),
      code: raw.daily.weather_code[i],
      ...Icons.describe(raw.daily.weather_code[i], true),
      max: raw.daily.temperature_2m_max[i],
      min: raw.daily.temperature_2m_min[i],
      prob: raw.daily.precipitation_probability_max[i],
      precip: raw.daily.precipitation_sum[i],
      uvMax: raw.daily.uv_index_max ? raw.daily.uv_index_max[i] : null,
      sunrise: new Date(raw.daily.sunrise[i]),
      sunset: new Date(raw.daily.sunset[i])
    }));
    return {
      location: { ...loc, timezone: raw.timezone },
      current: {
        temp: c.temperature_2m, feelsLike: c.apparent_temperature, humidity: c.relative_humidity_2m,
        wind: c.wind_speed_10m, windDir: windDir(c.wind_direction_10m), gusts: c.wind_gusts_10m,
        pressure: c.surface_pressure, cloudCover: c.cloud_cover, uv: c.uv_index,
        precip: c.precipitation, code: c.weather_code, isDay: c.is_day === 1,
        label: now.label, icon: now.icon, mood: now.mood, time: new Date(c.time)
      },
      air,
      today: daily[0],
      hourly, daily,
      updatedAt: new Date()
    };
  }

  // ---------- API pública do módulo ----------
  async function getWeather() {
    const loc = await getLocation();
    const [raw, air] = await Promise.all([fetchForecast(loc), fetchAir(loc)]);
    data = normalize(raw, loc, air);
    Util.storage.set("weather", serialize(data));
    return data;
  }

  const getForecast = () => data ? data.daily : [];
  const getCurrent = () => data;
  const onUpdate = (fn) => listeners.push(fn);

  // Datas viram strings no JSON; reidrata ao ler do cache
  function serialize(d) { return d; }
  function revive(d) {
    const dt = (v) => new Date(v);
    d.updatedAt = dt(d.updatedAt);
    d.current.time = dt(d.current.time);
    d.hourly.forEach(h => h.time = dt(h.time));
    d.daily.forEach(x => { x.date = dt(x.date); x.sunrise = dt(x.sunrise); x.sunset = dt(x.sunset); });
    d.today = d.daily[0];
    return d;
  }

  // ---------- renderização ----------
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  function render(d) {
    const cur = d.current, t = d.today;
    const box = Util.$("#weather");
    box.classList.remove("is-empty");
    Util.$("#weather-icon").innerHTML = Icons.render(cur.icon, "wicon--hero");
    Util.$("#weather-temp").textContent = `${Util.round(cur.temp)}°`;
    Util.$("#weather-label").textContent = cur.label;
    Util.$("#weather-feels").textContent = `Sensação ${Util.round(cur.feelsLike)}°`;
    Util.$("#weather-place").innerHTML = `${Util.escapeHtml(d.location.nome || CONFIG.cidade)}<i class="dot"></i>${Util.escapeHtml(CONFIG.estado)}`;
    Util.$("#weather-max").textContent = `${Util.round(t.max)}°`;
    Util.$("#weather-min").textContent = `${Util.round(t.min)}°`;
    Util.$("#weather-humidity").textContent = `${Util.round(cur.humidity)}%`;
    Util.$("#weather-wind").innerHTML = `${Util.round(cur.wind)} <small>km/h${cur.windDir ? " " + cur.windDir : ""}</small>`;
    Util.$("#weather-wind").title = cur.gusts != null ? `Rajadas de ${Util.round(cur.gusts)} km/h` : "";

    const uv = cur.isDay ? cur.uv : (t.uvMax ?? cur.uv);
    Util.$("#weather-uv").innerHTML = uv != null ? `${Math.round(uv)} <small>${uvLabel(uv)}</small>` : "—";
    Util.$("#weather-uv").title = !cur.isDay && t.uvMax != null ? "Máximo previsto para o dia" : "";
    Util.$("#weather-air").textContent = d.air ? aqiLabel(d.air.aqi) : "—";
    Util.$("#weather-air").title = d.air ? `Índice ${d.air.aqi} (PM2,5: ${Util.fmtNumber(d.air.pm25)} µg/m³)` : "";
    Util.$("#weather-sunrise").textContent = Util.formatHour(t.sunrise);
    Util.$("#weather-sunset").textContent = Util.formatHour(t.sunset);

    const todayKey = new Date().toDateString();
    Util.$("#forecast").innerHTML = d.daily.slice(0, 7).map(day => `
      <li class="day${day.date.toDateString() === todayKey ? " is-today" : ""}" title="${Util.escapeHtml(day.label)}${day.prob ? ` — ${day.prob}% de chance de chuva` : ""}">
        <span class="day-name">${day.date.toDateString() === todayKey ? "Hoje" : DIAS[day.date.getDay()]}</span>
        ${Icons.render(day.icon, "wicon--small")}
        <span class="day-max">${Util.round(day.max)}°</span>
        <span class="day-min">${Util.round(day.min)}°</span>
      </li>`).join("");

    Sky.setSun(t.sunrise, t.sunset);
    Sky.setWeatherMood(cur.mood);
    listeners.forEach(fn => { try { fn(d); } catch (e) { console.error(e); } });
  }

  async function refresh() {
    try {
      const d = await getWeather();
      render(d);
      Status.set("weather", { state: "ok", at: d.updatedAt });
      return true;
    } catch (err) {
      console.warn("[clima]", err.message);
      Status.set("weather", { state: "error", at: data ? data.updatedAt : null });
      return false;
    }
  }

  function init() {
    const cached = Util.storage.get("weather");
    if (cached) {
      try { data = revive(cached); render(data); Status.set("weather", { state: "ok", at: data.updatedAt }); }
      catch (e) { console.warn("cache de clima inválido", e); }
    }
  }

  return { init, refresh, getWeather, getForecast, getCurrent, onUpdate };
})();
