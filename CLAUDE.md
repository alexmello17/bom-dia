# Bom Dia — guia para o próximo agente

Painel pessoal de início do dia do Alex (Piraju/SP), em **HTML/CSS/JS puro, sem backend, sem build, sem chaves de API**. Abre pelo `index.html` no PC e roda numa Google TV pelo endereço publicado. Fale com o Alex em **português**; ele gosta de respostas curtas com o que mudou e como testar.

## O que não mudar

- **Sem servidor, sem Node em runtime, sem chaves.** Tudo é estático e usa APIs públicas. Não sugerir backend/Raspberry Pi — foi descartado no início.
- **Sem ES modules.** Scripts clássicos carregados em ordem no `index.html`, cada um expõe um objeto global (`Util`, `Sky`, `Weather`, `Radar`, `News`, `Quotes`, `Tips`, `Radio`, `Lights`, `Status`, `Clock`, `App`). Motivo: a página precisa abrir em `file://`, onde módulos são bloqueados.
- **Visual retrowave** já aprovado: céu que muda com a hora (cenas `dawn/morning/afternoon/sunset/night`) e com o tempo (`wx-*`), sol listrado no **centro da tela** apoiado na grade do horizonte, lua com fase real, nuvens SVG com contorno neon, Orbitron nos números grandes, Sora no resto. Não voltar ao visual "sky natural" nem mexer na posição do sol sem pedido.
- **Rádio é um CD player automotivo** (display VFD, knobs VOL/TUNE, presets, SEEK, eject, botão ILL). A iluminação (cor) é **só do rádio**, não do fundo — o Alex foi explícito nisso.
- Dados pessoais: a posição em BTC está hoje no `config.js` público **por decisão do Alex**. Se ele pedir privacidade de volta, o caminho pronto é `js/config.local.js` (gitignored) ou `?btc=…&investido=…` (salva só no navegador).

## Como publicar

```bash
python bump.py            # renova ?v= nos CSS/JS (evita cache antigo na TV)
git add -A && git commit -m "..." && git push
```

GitHub Pages serve `main` na raiz: <https://alexmello17.github.io/bom-dia/> (atualiza em ~1 min; cache de 10 min sem o bump). GitHub CLI está logado como `alexmello17`. Commits terminam com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Como testar

- Servidor local: `python -m http.server 8765` (há `.claude/launch.json` e `serve_me.bat`). Depois de editar CSS/JS, o navegador pode segurar cache: `fetch(url, {cache:'reload'})` antes de recarregar.
- Screenshots headless: `chrome --headless=new --window-size=1920,1080 --virtual-time-budget=12000 --screenshot=... URL`. Use um `--user-data-dir` novo quando quiser cache limpo. Transições CSS não avançam bem no headless; a cena inicial já nasce sem transição (`body.ready`).
- Tamanhos obrigatórios: **1920×1080**, **1366×768** e **960×540 com `?tv=1`** (viewport que a TV reporta). Regra de ouro: nada rola em tela horizontal; em `max-height: 620px` o layout compacta (fonte pela altura, dica em uma linha, rádio sem presets).
- Parâmetros de depuração: `?cena=manha|tarde|por-do-sol|noite|amanhecer`, `?tempo=limpo|parcial|nublado|nevoa|chuva|tempestade|neve`, `?lua=AAAA-MM-DD`, `?tv=1`.

## Mapa do código

| Arquivo | Função |
|---|---|
| `js/config.js` | tudo configurável (nome, cidade, intervalos, fontes RSS, aportes BTC, estações de rádio, iluminação) |
| `js/sky.js` | cena por hora (usa nascer/pôr do sol do clima), atmosfera por tempo, lua com fase (algoritmo local, hemisfério sul) |
| `js/weather.js` | Open-Meteo (clima, 7 dias, UV, vento/direção) + Air Quality; alimenta `Sky` e `Radar` via `Weather.onUpdate` |
| `js/radar.js` | Leaflet (cdnjs) + RainViewer (frames passados e nowcast) sobre tiles Esri; timeline animada |
| `js/news.js` | RSS via rss2json/allorigins; carrossel paginado por altura medida, 10 s por página, setas do teclado |
| `js/quotes.js` | Bitcoin (CoinGecko, Binance reserva) + dólar (AwesomeAPI); posição com `ajusteVenda` do Mercado Pago |
| `js/tips.js` + `tips-data.js` | dica de filme/série 1980–2010; índice amarrado ao relógio (recarregar não reinicia), pôster da Wikipédia |
| `js/radio.js` | streams HTTPS; knobs com roda/arrasto; presets; teclas P [ ] + -; reconexão |
| `js/lights.js` | iluminação do rádio (`--ill-h`/`--ill-l` em `#radio`); tecla L, `,` `.` |
| `js/status.js` | "Atualizado há X min" por seção (`data-status`) |
| `js/app.js` | agendamento com retentativa (`schedule`), evento `online`, modo TV |
| `css/style.css` | um arquivo; seções comentadas; tokens no `:root`; `--bar-h` alinha dica e rádio |

Padrão de módulo: `init()` + `refresh()` que devolve `true/false`; registrar em `app.js` com `schedule(nome, Modulo.refresh, intervalo)`.

## Limitações conhecidas das APIs gratuitas

- **RainViewer** público: radar só até zoom 7 (usamos tiles 512px + `zoomOffset:-1`) e sempre paleta "Universal Blue" (o parâmetro de cor é ignorado). Rate limit: manter poucos frames (6 passados + nowcast).
- **CARTO** passou a exigir chave → mapa-base é Esri (Dark Gray + Reference; imagens para satélite).
- **Google News RSS** não passa em nenhum proxy CORS confiável; **rss2json** funciona para G1/BBC/Folha; Agência Brasil já tem CORS.
- **CoinGecko** falha às vezes → Binance BTCBRL como reserva. Histórico antes de 2020 via BTCUSDT × dólar do dia (AwesomeAPI).
- Wikipédia em inglês fornece os pôsteres (pt.wiki não tem fair use).
- Áudio: streams precisam ser HTTPS (site é HTTPS); autoplay só após interação do usuário.

## Preferências do Alex observadas

- Pede ajustes visuais curtos e iterativos ("centralize o sol", "alinhar com a dica"); confirma com "top/nice". Prefere ver screenshot do resultado.
- Quando algo "não refletiu", quase sempre é cache — por isso existe o `bump.py`.
- Gosta de recursos "vivos": rotação a cada 10 s (notícias e dicas), efeitos, animações discretas.
