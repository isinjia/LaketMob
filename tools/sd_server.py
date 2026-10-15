# -*- coding: utf-8 -*-
"""SD 렌더링용 로컬 서버: 프로젝트 폴더를 제공하고 POST /save?name=xxx 로 받은 PNG를 tools/sd_out/ 에 저장한다."""
import http.server, os, urllib.parse, base64
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'sd_out')
os.makedirs(OUT, exist_ok=True)

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(q.get('name', ['x'])[0])
        data = self.rfile.read(int(self.headers['Content-Length']))
        if data.startswith(b'data:'): data = base64.b64decode(data.split(b',', 1)[1])
        open(os.path.join(OUT, name), 'wb').write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('127.0.0.1', 8792), H).serve_forever()
