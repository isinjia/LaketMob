// 배포판 dist/ 만들기 (5_LAO_Defence 방식). GitHub Actions(.github/workflows/pages.yml)가 푸시마다 실행해 Pages 에 올린다.
// - 게임 파일만 담는다 (tools/, 원본 압축본 등 제외)
// - 게임 스크립트는 terser 로 압축·이름 줄이기(주석 제거, 지역 변수 이름 축약) → 배포된 코드를 읽기 어렵게
//   (전역 이름·클래스 이름은 그대로 둔다: constructor.name 비교 등이 있어서)
// - 이미지는 바이트 마스킹한 <파일>.pak 으로 바꾼다 (js/pack.js 가 브라우저 메모리에서 되돌린다)
// 저장소와 로컬 실행은 읽을 수 있는 원본 그대로다.
//   node tools/build_dist.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');

async function loadTerser() {
  try { return await import('terser'); } catch (e) { /* 아직 없음 */ }
  execSync('npm install --no-save --no-audit --no-fund terser@5.31.0', { cwd: ROOT, stdio: 'inherit' });
  return import(pathToFileURL(path.join(ROOT, 'node_modules', 'terser', 'main.js')).href);
}

const FILES = ['index.html'];
const DIRS = ['js', 'assets'];
// 생성 데이터(그림 표·리그·이펙트 표)는 그대로 둔다
const SKIP_MINIFY = /^js\/(assetsizes|forms|rosterdata|battleanchor-data|fximg|skinnames)\.js$|^js\/(sd|fx)\//;
const OPTS = {
  ecma: 2020,
  compress: { passes: 2, keep_classnames: true, keep_fnames: true },
  mangle: { keep_classnames: true, keep_fnames: true }, // 지역 이름만: 전역(Game, UI, World...)과 속성 이름은 그대로
  format: { comments: false },
};

function copyTree(rel) {
  const src = path.join(ROOT, rel), dst = path.join(OUT, rel);
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) copyTree(path.posix.join(rel, f));
  } else fs.copyFileSync(src, dst);
}

// ── 이미지 마스킹 (js/pack.js 와 같은, 자기 자신이 역함수인 바이트 마스크) ──
const K = Array.from('LAO-orca-lastmon', (c) => c.charCodeAt(0));
function mask(buf) {
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) u8[i] ^= K[i % K.length] ^ ((i * 131 + 7) & 255);
  return u8;
}
const DATA_URI = /data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)/g;
const pk = (text) => text.replace(DATA_URI, (m, mime, b64) => 'pk:' + mime + ':' + Buffer.from(mask(Buffer.from(b64, 'base64'))).toString('base64'));
const IMG_EXT = /\.(webp|jpe?g|png)$/i;

function walk(dir, fn) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, fn); else fn(p, f);
  }
}

function packAssets() {
  const sd = path.join(OUT, 'js/sd'), fx = path.join(OUT, 'js/fx');
  let files = 0, dropped = 0;
  // file:// 용 사본(같은 그림을 base64 로 담은 스크립트): http 에서는 쓰지 않고, 그림을 그대로 넘겨 주므로 뺀다
  for (const f of fs.readdirSync(sd)) if (/\.a\d+\.js$/.test(f)) { fs.rmSync(path.join(sd, f)); dropped++; }
  for (const f of fs.readdirSync(fx)) {
    const m = /^(.+)\.js$/.exec(f);
    if (m && !f.endsWith('.m.js') && fs.existsSync(path.join(fx, m[1] + '.m.js'))) { fs.rmSync(path.join(fx, f)); dropped++; }
  }
  // 그림 파일: <파일> -> <파일>.pak (마스킹한 바이트)
  for (const dir of [path.join(OUT, 'assets'), sd, fx]) walk(dir, (p, f) => {
    if (!IMG_EXT.test(f)) return;
    fs.writeFileSync(p + '.pak', mask(fs.readFileSync(p)));
    fs.rmSync(p);
    files++;
  });
  // 스크립트에 박힌 파티클 텍스처 (js/fximg.js)
  const fximg = path.join(OUT, 'js/fximg.js');
  fs.writeFileSync(fximg, pk(fs.readFileSync(fximg, 'utf8')) + '\n;window.PACKED&&PACKED.globals();\n');
  // 되돌리기 켜기 (다른 스크립트보다 먼저 실행되는 인라인 스크립트)
  const htmlFile = path.join(OUT, 'index.html');
  fs.writeFileSync(htmlFile, fs.readFileSync(htmlFile, 'utf8').replace('<head>', '<head>\n<script>window.PACK=1</script>'));
  console.log(`packed: ${files} image files masked, ${dropped} file:// copies dropped, embedded textures masked`);
}

async function main() {
  const { minify } = await loadTerser();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of FILES) copyTree(f);
  for (const d of DIRS) copyTree(d);
  packAssets();

  const scripts = fs.readdirSync(path.join(OUT, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f).filter((f) => !SKIP_MINIFY.test(f));
  let before = 0, after = 0;
  for (const rel of scripts) {
    const file = path.join(OUT, rel), code = fs.readFileSync(file, 'utf8');
    const out = await minify(code, OPTS);
    if (out.code == null) throw new Error('terser failed on ' + rel);
    fs.writeFileSync(file, out.code);
    before += code.length; after += out.code.length;
  }
  // 페이지의 인라인 스크립트와 HTML 주석도
  const htmlFile = path.join(OUT, 'index.html');
  let html = fs.readFileSync(htmlFile, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const m of inline) {
    const out = await minify(m[1], OPTS);
    if (out.code == null) throw new Error('terser failed on an inline script');
    html = html.replace(m[0], () => '<script>' + out.code + '</script>');
  }
  fs.writeFileSync(htmlFile, html);
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  console.log(`dist: ${scripts.length} scripts + ${inline.length} inline minified (${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
