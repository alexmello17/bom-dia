/* =========================================================
   Bom Dia — configuração
   Tudo que é pessoal ou ajustável fica aqui.
   Nenhuma chave de API é necessária para as fontes padrão.
   ========================================================= */

const CONFIG = {
  nome: "Alex",
  // "auto" alterna entre Bom dia / Boa tarde / Boa noite conforme a hora.
  // Qualquer outro texto (ex.: "Bom dia") fica fixo.
  saudacao: "auto",

  cidade: "Piraju",
  estado: "SP",
  pais: "BR",

  // Coordenadas opcionais. Se ficarem em null, a cidade é localizada
  // automaticamente (Open-Meteo Geocoding) e o resultado fica em cache.
  latitude: null,
  longitude: null,

  clima: true,
  radar: true,
  noticias: true,

  cotacoes: true,
  dicas: true, // dica de filme/série do dia

  // Modo TV: margem de segurança nas bordas e efeitos mais leves (também ativável com ?tv=1)
  modoTV: false,

  // Intervalos de atualização (em segundos)
  intervalos: {
    clima: 10 * 60,
    radar: 10 * 60,
    noticias: 5 * 60,
    cotacoes: 2 * 60,
    dicas: 60 * 60, // só confere se o dia virou
    tentarNovamente: 60 // quando uma atualização falha
  },

  radarOpcoes: {
    zoom: 8,
    // Esquema de cores do RainViewer (o serviço público hoje entrega sempre o "Universal Blue")
    esquemaCores: 2,
    quadrosPassados: 6, // últimos ~60 min (1 quadro a cada 10 min)
    velocidadeMs: 650,
    mapaPadrao: "mapa" // "mapa" ou "satelite"
  },

  cotacoesOpcoes: {
    dolar: true, // mostra o dólar comercial (AwesomeAPI, sem chave) ao lado do Bitcoin
    // "tudo" mostra os valores em R$ da sua posição; "percentual" mostra só a variação em %
    // (útil se a página for publicada em um endereço público)
    exibir: "tudo",
    // Ajuste (%) aplicado ao preço só para avaliar a sua posição. Corretoras como o Mercado Pago
    // mostram o valor pelo preço de venda delas, ~0,5% abaixo da média de mercado.
    ajusteVenda: -0.5,
    // Sua posição em Bitcoin. Atenção: este arquivo é público no GitHub Pages — quem tiver o link
    // vê o valor da posição. Para manter privado, apague daqui e use js/config.local.js (ignorado
    // pelo Git) ou abra a página uma vez com ?btc=…&investido=… (fica salvo só naquele navegador).
    // Cada aporte pode ser { btc }, { btc, investido }, { investido, precoMedio } ou { investido, data }.
    aportes: [
      { btc: 0.02006834, investido: 9850 } // comprado por R$ 10.000 no Mercado Pago (R$ 9.850 em BTC + R$ 150 de taxa)
    ]
  },

  radio: true,
  radioOpcoes: {
    volume: 0.8,
    tocarAoAbrir: false, // navegadores só permitem autoplay com som depois de uma interação
    // Iluminação do painel (botão ILL ou tecla L): "padrao" (âmbar), "cor", "arco-iris" ou "respiracao"
    iluminacao: { modo: "padrao", matiz: 36, velocidade: 40 },
    // Streams públicos em HTTPS (necessário no site publicado). Ordem = ordem no player.
    estacoes: [
      { nome: "Antena 1", descricao: "Soft hits e flashbacks, 94,7 São Paulo", url: "https://antenaone.crossradio.com.br/stream/1;" },
      { nome: "Alpha FM", descricao: "Adulto contemporâneo, 101,7 São Paulo", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_ALPHAFM_ADP.aac" },
      { nome: "Nova Brasil FM", descricao: "MPB e música brasileira, 89,7 São Paulo", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASIL_SPAAC.aac" },
      { nome: "Rádio Cidade", descricao: "Rock clássico, 102,9 Rio de Janeiro", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIOCIDADEAAC.aac" },
      { nome: "Kiss FM", descricao: "Classic rock, 92,5 São Paulo", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_KISSFMAAC.aac" },
      { nome: "89 FM", descricao: "A Rádio Rock, São Paulo", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_89FM_ADP.aac" },
      { nome: "Amigos do Flashback", descricao: "Webrádio, só flashback anos 70, 80 e 90", url: "https://stm4.voxhd.com.br:7086/;" },
      { nome: "Studio Flashback", descricao: "Webrádio de flashback", url: "https://stream-163.zeno.fm/6gv76f1xruquv" }
    ]
  },

  dicasOpcoes: {
    intervalo: 10,   // segundos entre uma dica e outra (0 = uma dica por dia)
    deslocamento: 0  // com intervalo 0, pula para outro título sem esperar o dia seguinte
  },

  noticiasOpcoes: {
    maximo: 15,
    maximoPorFonte: 4, // evita que uma fonte muito ativa domine o feed
    carrossel: {
      intervalo: 10, // segundos por página (0 desliga a troca automática)
      pausarComMouse: true
    },
    // Fontes RSS em português. "direto: true" indica que o feed já aceita
    // acesso direto do navegador; os demais passam por um conversor RSS→JSON.
    fontes: [
      { nome: "G1", url: "https://g1.globo.com/rss/g1/politica/" },
      { nome: "G1", url: "https://g1.globo.com/rss/g1/economia/" },
      { nome: "G1", url: "https://g1.globo.com/rss/g1/mundo/" },
      { nome: "BBC Brasil", url: "https://feeds.bbci.co.uk/portuguese/rss.xml" },
      { nome: "Folha", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml" },
      { nome: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", direto: true }
    ],
    // Serviços usados para contornar CORS quando o feed não permite acesso direto.
    // A ordem importa: o primeiro que responder é usado.
    conversores: [
      (url) => ({ tipo: "rss2json", url: "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url) }),
      (url) => ({ tipo: "xml", url: "https://api.allorigins.win/raw?url=" + encodeURIComponent(url) }),
      (url) => ({ tipo: "allorigins", url: "https://api.allorigins.win/get?url=" + encodeURIComponent(url) })
    ]
  }
};
