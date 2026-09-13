/* Utilidades compartilhadas (DOM, rede, formatação, cache local) */

const Util = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  async function fetchWithTimeout(url, { timeout = 15000, ...opts } = {}) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  const fetchJSON = async (url, opts) => (await fetchWithTimeout(url, opts)).json();
  const fetchText = async (url, opts) => (await fetchWithTimeout(url, opts)).text();

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => { el.remove(); reject(new Error("Falha ao carregar " + src)); };
      document.head.appendChild(el);
    });
  }

  function loadStyle(href) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      el.onload = resolve;
      el.onerror = () => { el.remove(); reject(new Error("Falha ao carregar " + href)); };
      document.head.appendChild(el);
    });
  }

  // ---- cache local (último dado válido) ----
  const storage = {
    get(key) {
      try { const v = localStorage.getItem("bomdia:" + key); return v ? JSON.parse(v) : null; }
      catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem("bomdia:" + key, JSON.stringify(value)); } catch { /* sem espaço ou bloqueado */ }
    }
  };

  // ---- formatação ----
  const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  function formatHour(date) {
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function relativeTime(date, now = new Date()) {
    if (!date || isNaN(date)) return "";
    const diff = Math.max(0, (now - date) / 1000);
    if (diff < 45) return "agora";
    const min = Math.round(diff / 60);
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h} h`;
    const d = Math.floor(h / 24);
    return d === 1 ? "ontem" : `há ${d} dias`;
  }

  function futureMinutesLabel(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h} h e ${m} min` : `${h} h`;
  }

  const fmtNumber = (n, digits = 1) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n);

  const round = (n) => Math.round(n);

  function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function truncate(s, max = 170) {
    if (!s || s.length <= max) return s || "";
    const cut = s.slice(0, max);
    return cut.slice(0, cut.lastIndexOf(" ")) + "…";
  }

  return {
    $, $$, escapeHtml, fetchJSON, fetchText, loadScript, loadStyle, storage,
    capitalize, formatHour, relativeTime, futureMinutesLabel, fmtNumber, round, stripHtml, truncate
  };
})();
