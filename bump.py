"""Atualiza o numero de versao dos arquivos CSS/JS no index.html (evita cache antigo apos publicar).
Uso: python bump.py  (depois: git add -A && git commit && git push)"""
import re, datetime, pathlib
p = pathlib.Path(__file__).with_name("index.html")
h = p.read_text(encoding="utf-8")
v = datetime.datetime.now().strftime("%Y%m%d%H%M")
h = re.sub(r'(href="css/style\.css|src="js/[a-z-]+\.js)(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={v}"', h)
p.write_text(h, encoding="utf-8")
print("versao", v)
