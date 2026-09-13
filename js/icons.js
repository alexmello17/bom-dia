/* Ícones meteorológicos (SVG inline, animáveis via CSS) e tabela de códigos WMO */

const Icons = (() => {
  const svg = (inner, cls = "") =>
    `<svg class="wicon ${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

  const sunCore = (cx, cy, r) =>
    `<g class="w-sun" style="transform-origin:${cx}px ${cy}px">
       <circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" fill-opacity=".92" stroke="none"/>
       <g class="w-rays">${[0, 45, 90, 135, 180, 225, 270, 315].map(a =>
         `<line x1="${cx}" y1="${cy - r - 5}" x2="${cx}" y2="${cy - r - 10}" transform="rotate(${a} ${cx} ${cy})"/>`).join("")}</g>
     </g>`;

  const cloudPath = (dx = 0, dy = 0, scale = 1) =>
    `<path class="w-cloud" transform="translate(${dx} ${dy}) scale(${scale})" fill="currentColor" fill-opacity=".18"
       d="M20 44h24a10 10 0 0 0 1.5-19.9A13 13 0 0 0 20.6 22 9 9 0 0 0 20 44z"/>`;

  const moonPath = (dx = 0, dy = 0, scale = 1) =>
    `<path class="w-moon" transform="translate(${dx} ${dy}) scale(${scale})" fill="currentColor" fill-opacity=".9" stroke="none"
       d="M40 14a16 16 0 1 0 12 26.6A13 13 0 0 1 40 14z"/>`;

  const drops = (xs, cls = "w-drop") =>
    xs.map((x, i) => `<line class="${cls}" style="animation-delay:${i * .35}s" x1="${x}" y1="49" x2="${x - 2}" y2="56"/>`).join("");

  const icons = {
    "clear-day": () => svg(sunCore(32, 32, 11)),
    "clear-night": () => svg(moonPath() + `<circle class="w-star" cx="18" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle class="w-star" style="animation-delay:1.2s" cx="26" cy="12" r="1" fill="currentColor" stroke="none"/>`),
    "partly-day": () => svg(sunCore(24, 24, 9) + cloudPath(6, 4, 1)),
    "partly-night": () => svg(moonPath(-8, -6, .7) + cloudPath(6, 4, 1)),
    "cloudy": () => svg(cloudPath(0, -2, 1.05) + cloudPath(12, 8, .7)),
    "fog": () => svg(cloudPath(0, -8, 1) + `<line class="w-fog" x1="18" y1="48" x2="46" y2="48"/><line class="w-fog" style="animation-delay:1.5s" x1="24" y1="55" x2="42" y2="55"/>`),
    "drizzle": () => svg(cloudPath(0, -4, 1) + drops([26, 34, 42], "w-drop w-drop--small")),
    "rain": () => svg(cloudPath(0, -4, 1) + drops([24, 32, 40])),
    "storm": () => svg(cloudPath(0, -6, 1) + `<path class="w-bolt" d="M33 40l-6 10h6l-3 9 9-12h-6l3-7z" fill="currentColor" stroke="none"/>` + drops([22, 44])),
    "snow": () => svg(cloudPath(0, -4, 1) + [24, 32, 40].map((x, i) => `<circle class="w-flake" style="animation-delay:${i * .5}s" cx="${x}" cy="52" r="1.8" fill="currentColor" stroke="none"/>`).join(""))
  };

  // Código WMO → descrição em português + ícone (dia/noite) + "atmosfera" para o fundo
  const WMO = {
    0: { label: "Céu limpo", icon: ["clear-day", "clear-night"], mood: "clear" },
    1: { label: "Predominantemente limpo", icon: ["clear-day", "clear-night"], mood: "clear" },
    2: { label: "Parcialmente nublado", icon: ["partly-day", "partly-night"], mood: "partly" },
    3: { label: "Nublado", icon: ["cloudy", "cloudy"], mood: "cloudy" },
    45: { label: "Névoa", icon: ["fog", "fog"], mood: "fog" },
    48: { label: "Nevoeiro", icon: ["fog", "fog"], mood: "fog" },
    51: { label: "Garoa fraca", icon: ["drizzle", "drizzle"], mood: "rain" },
    53: { label: "Garoa", icon: ["drizzle", "drizzle"], mood: "rain" },
    55: { label: "Garoa forte", icon: ["drizzle", "drizzle"], mood: "rain" },
    56: { label: "Garoa gelada", icon: ["drizzle", "drizzle"], mood: "rain" },
    57: { label: "Garoa gelada forte", icon: ["drizzle", "drizzle"], mood: "rain" },
    61: { label: "Chuva fraca", icon: ["rain", "rain"], mood: "rain" },
    63: { label: "Chuva", icon: ["rain", "rain"], mood: "rain" },
    65: { label: "Chuva forte", icon: ["rain", "rain"], mood: "rain" },
    66: { label: "Chuva gelada", icon: ["rain", "rain"], mood: "rain" },
    67: { label: "Chuva gelada forte", icon: ["rain", "rain"], mood: "rain" },
    71: { label: "Neve fraca", icon: ["snow", "snow"], mood: "snow" },
    73: { label: "Neve", icon: ["snow", "snow"], mood: "snow" },
    75: { label: "Neve forte", icon: ["snow", "snow"], mood: "snow" },
    77: { label: "Grãos de neve", icon: ["snow", "snow"], mood: "snow" },
    80: { label: "Pancadas de chuva fracas", icon: ["rain", "rain"], mood: "rain" },
    81: { label: "Pancadas de chuva", icon: ["rain", "rain"], mood: "rain" },
    82: { label: "Pancadas de chuva fortes", icon: ["rain", "rain"], mood: "rain" },
    85: { label: "Pancadas de neve", icon: ["snow", "snow"], mood: "snow" },
    86: { label: "Pancadas de neve fortes", icon: ["snow", "snow"], mood: "snow" },
    95: { label: "Trovoadas", icon: ["storm", "storm"], mood: "storm" },
    96: { label: "Trovoadas com granizo", icon: ["storm", "storm"], mood: "storm" },
    99: { label: "Trovoadas fortes com granizo", icon: ["storm", "storm"], mood: "storm" }
  };

  function describe(code, isDay = true) {
    const w = WMO[code] || { label: "Tempo indefinido", icon: ["cloudy", "cloudy"], mood: "cloudy" };
    return { label: w.label, icon: w.icon[isDay ? 0 : 1], mood: w.mood };
  }

  function render(name, cls = "") {
    const fn = icons[name] || icons.cloudy;
    return fn().replace('class="wicon ', `class="wicon ${cls} `);
  }

  return { render, describe, WMO };
})();
