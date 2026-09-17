# Bom Dia

Página pessoal de início do dia: horário, clima, radar de chuva e notícias em uma única tela, com fundo que muda conforme a hora e o tempo em Piraju/SP.

Visual retrowave: sol listrado nascendo e se pondo num horizonte de grade neon, paleta roxo/magenta/ciano que muda com a hora e o tempo, números grandes em Orbitron com brilho. Feita só com HTML, CSS e JavaScript. Não precisa de servidor, Node, banco de dados ou chave de API: basta abrir o `index.html`.

## Como abrir

1. Dê dois cliques em `index.html` (abre no navegador padrão), ou arraste o arquivo para uma janela do Chrome/Edge.
2. Para tela cheia, pressione `F11`.

### Abrir como "aplicativo" (sem barra de endereço)

Crie um atalho com o comando abaixo (ajuste o caminho da pasta):

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///C:/ia/good-mornig/index.html" --start-fullscreen
```

No Edge, troque o executável por `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`.

### Abrir junto com o Windows

1. Pressione `Win + R`, digite `shell:startup` e confirme.
2. Copie o atalho criado acima para essa pasta.

## Configuração

Tudo fica em [`js/config.js`](js/config.js):

```javascript
const CONFIG = {
  nome: "Alex",
  saudacao: "auto",      // "auto" = Bom dia / Boa tarde / Boa noite; ou um texto fixo
  cidade: "Piraju",
  estado: "SP",
  pais: "BR",
  latitude: null,        // opcional; se vazio, a cidade é localizada automaticamente
  longitude: null,
  clima: true,
  radar: true,
  noticias: true,
  intervalos: { clima: 600, radar: 600, noticias: 300, tentarNovamente: 60 },
  radarOpcoes: { zoom: 8, mapaPadrao: "mapa", ... },
  noticiasOpcoes: { maximo: 9, maximoPorFonte: 3, fontes: [ ... ] }
};
```

- **Cidade**: basta trocar `cidade`/`estado`/`pais`. A localização é resolvida pela geocodificação do Open-Meteo e guardada no navegador.
- **Notícias**: a lista `fontes` aceita qualquer RSS. Feeds que já liberam acesso do navegador (CORS) podem receber `direto: true`; os demais passam pelos conversores listados em `conversores`.
- **Seções**: `clima`, `radar` e `noticias` podem ser desligados individualmente.
- **Carrossel de notícias**: as notícias são divididas em páginas (uma manchete + as que couberem na altura da tela) que trocam a cada `carrossel.intervalo` segundos. Setas ← → do teclado ou do controle remoto mudam de página; o mouse sobre o painel pausa. `intervalo: 0` desliga a troca automática.

### Bitcoin e a sua posição

O bloco de cotação mostra o preço em reais, a variação de 24 h e os últimos 7 dias. Para ver o valor atual do que você investiu, informe seus aportes em `cotacoesOpcoes.aportes`, em qualquer destas formas (pode misturar):

```javascript
aportes: [
  { investido: 5000, data: "2024-03-10" },      // valor em R$ e data da compra
  { investido: 2000, precoMedio: 350000 },      // valor em R$ e preço médio pago por BTC
  { btc: 0.0125 }                               // quantidade de BTC (sem ganho, só valor atual)
]
```

- Com a data, a cotação do dia é buscada uma vez e guardada no navegador (Binance BTC/BRL; para datas antes de 2020, BTC/USD × dólar do dia).
- `exibir: "percentual"` esconde os valores em R$ e mostra só a variação — útil se a página for publicada em um endereço público.
- A lista vazia mostra apenas a cotação.

### Rádio

Player abaixo das notícias com estações de flashback e clássicos ao vivo: Antena 1, Alpha FM, Nova Brasil, Rádio Cidade, Kiss FM, 89 FM e duas webrádios de flashback. Botão ▶ toca/pausa, ‹ › trocam de estação; no teclado ou controle, `P`, `[` e `]` (teclas de mídia também funcionam). A última estação e o volume ficam salvos. Os navegadores só permitem começar a tocar depois de um clique/toque; `radioOpcoes.tocarAoAbrir: true` tenta mesmo assim. As estações ficam em `radioOpcoes.estacoes` (use streams HTTPS).

### Dica de filme ou série

As dicas vêm de uma lista curada de filmes e séries de 1980 a 2010 em [`js/tips-data.js`](js/tips-data.js) — clássicos internacionais e brasileiros, com sinopse curta. A ordem é embaralhada por dia e os títulos trocam a cada `dicasOpcoes.intervalo` segundos (padrão 10; mouse em cima pausa). Com `intervalo: 0` fica um título por dia, e `deslocamento` pula para outro. O pôster vem da Wikipédia (sem chave) e fica em cache. Para editar a lista, basta acrescentar itens no mesmo formato. Clicar na dica abre a busca do título na Wikipédia.

### Pré-visualizar cenas do fundo

Adicione parâmetros à URL para forçar uma cena, sem alterar os dados:

```text
index.html?cena=manha&tempo=chuva
```

`cena`: `amanhecer`, `manha`, `tarde`, `por-do-sol`, `noite`
`tempo`: `limpo`, `parcial`, `nublado`, `nevoa`, `chuva`, `tempestade`, `neve`
`lua`: uma data (`lua=2026-09-26`) para ver a lua naquela fase

À noite a lua aparece com a **fase real**, calculada localmente (sem API) e desenhada como se vê do hemisfério sul — a crescente iluminada pela esquerda. O nome da fase e a porcentagem iluminada ficam logo abaixo dela.

### Na TV (Google TV / Android TV)

A página está publicada no GitHub Pages: **https://alexmello17.github.io/bom-dia/**

No navegador da TV abra com `?tv=1` (margem de segurança contra overscan e efeitos mais leves; também pode ser fixado com `modoTV: true`). Em qualquer tela na horizontal a página se ajusta à altura da janela, sem rolagem.

Para publicar uma alteração: `python bump.py` (renova o número de versão dos arquivos, para o navegador da TV não ficar com CSS/JS antigos em cache), depois `git add -A && git commit -m "..." && git push` — o site atualiza em cerca de um minuto.

### Dados pessoais fora do repositório

O repositório é público, então a posição em Bitcoin não fica no código:

- **PC**: `js/config.local.js` (ignorado pelo Git) com `CONFIG.cotacoesOpcoes.aportes = [...]`.
- **TV/celular**: abra uma vez `…/bom-dia/?tv=1&btc=0.01&investido=5000` — fica salvo só naquele navegador e some da barra de endereço. `?btc=limpar` apaga.

## Fontes de dados

| Dado | Serviço | Observações |
|---|---|---|
| Clima atual e previsão | [Open-Meteo](https://open-meteo.com) | Gratuito, sem chave. Temperatura, sensação, umidade, vento (com direção e rajadas), índice UV, nascer/pôr do sol e previsão de 7 dias. |
| Qualidade do ar | [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | Índice AQI (EUA) com PM2,5 e PM10; se falhar, o resto do clima continua. |
| Radar de chuva | [RainViewer](https://www.rainviewer.com/api.html) | Últimos ~60 min + previsão de 30 min quando disponível. O serviço público entrega radar até o zoom 7; acima disso a imagem é ampliada. |
| Mapa-base | Esri (World Dark Gray / World Imagery) | Tiles públicos com atribuição no próprio mapa. |
| Dólar comercial | [AwesomeAPI](https://docs.awesomeapi.com.br) | Cotação, variação do dia e últimos 7 dias; sem chave. `cotacoesOpcoes.dolar: false` esconde. |
| Bitcoin | [CoinGecko](https://www.coingecko.com/api) (preço, 24 h, 7 dias) e [Binance](https://binance-docs.github.io/apidocs/spot/en/) (reserva e histórico) | Sem chave; [AwesomeAPI](https://docs.awesomeapi.com.br) para o dólar em datas antigas. |
| Notícias | RSS de G1, BBC Brasil, Folha e Agência Brasil | Como a página roda em `file://`, feeds sem CORS passam por [rss2json](https://rss2json.com) (ou allorigins como reserva). |

Nenhuma chave de API é usada. Se algum serviço gratuito mudar, a página continua funcionando com o último dado válido e mostra o aviso na seção afetada.

## Sem internet

- A página sempre carrega: relógio, data e fundo não dependem de rede.
- Cada seção mostra "Aguardando atualização…" enquanto não há dados, ou "Não foi possível atualizar os dados. Tentando novamente…" quando uma atualização falha.
- O último clima e as últimas notícias ficam guardados no navegador (`localStorage`) e aparecem imediatamente na próxima abertura.
- Quando a conexão volta, tudo é atualizado na hora (evento `online`), e falhas são reprocessadas a cada `tentarNovamente` segundos.

## Estrutura

```text
index.html          estrutura da página
css/style.css       estilos, cenas do fundo e animações
fonts/              Sora e Orbitron (auto-hospedadas, funcionam offline)
assets/favicon.svg
js/
  config.js         configuração
  utils.js          rede, formatação, cache local
  status.js         indicadores "Atualizado há X min"
  icons.js          ícones meteorológicos (SVG) e tabela de códigos WMO
  sky.js            fundo dinâmico (cena por hora + atmosfera por tempo)
  clock.js          updateClock(), data e saudação
  weather.js        getWeather(), getForecast()
  radar.js          getRainRadar(), mapa e linha do tempo
  news.js           getNews() e carrossel
  quotes.js         getBitcoin(), posição em BTC
  tips.js           getTip() — dica do dia (lista em tips-data.js)
  radio.js          player de rádio ao vivo
  app.js            inicialização e agendamento
```

### Adicionando um módulo

Cada módulo é um objeto com `init()` e `refresh()` (que devolve `true`/`false`). Para um novo bloco — agenda, cotações, tarefas —:

1. Crie `js/meu-modulo.js` seguindo o padrão de `news.js`.
2. Inclua o `<script>` em `index.html` antes de `app.js` e adicione a marcação (um `<section class="panel">`).
3. Em `app.js`, registre `schedule("meu-modulo", MeuModulo.refresh, intervalo)`.
4. Use `Status.set("meu-modulo", …)` com um `<p class="section-status" data-status="meu-modulo">` para o indicador de atualização.

## Desenvolvimento

Para testar em `http://` (útil no DevTools), qualquer servidor estático serve, por exemplo:

```bash
python -m http.server 8765
```

Há um `.claude/launch.json` com essa configuração para o preview do Claude Code.
