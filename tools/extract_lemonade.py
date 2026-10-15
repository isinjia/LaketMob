# -*- coding: utf-8 -*-
"""레모네이드 자매 7인 + MP(메인스토리) 제타/오메가 추출.
- 관장: PECS 일러스트 (파츠가 나뉜 것은 합성)
- 흑막: MP 일러스트 → mpzeta / mpomega (기존 lemonzeta/lemonomega 파일을 옮김)
출력: assets/full, assets/icon, assets/voice, js/assetsizes.js 갱신
"""
import os, re, shutil, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
src = open(os.path.join(HERE, 'extract_assets.py'), encoding='utf-8').read()
ns = {'__file__': os.path.join(HERE, 'extract_assets.py')}
exec(src.split('def ff(')[0], ns)
FB, IC, VO, VOICE_TAGS = ns['FB'], ns['IC'], ns['VO'], ns['VOICE_TAGS']
OUT = os.path.join(ROOT, 'assets')

# key: (전신 파일들(합성 순서), 아이콘, 음성 폴더, 얼굴 크롭(cx, cy, size) - 아이콘 없을 때)
UNITS = {
    'lemonalpha':   (['FullbodyIMG_PECS_LemonadeAlpha_N_parts1.png', 'FullbodyIMG_PECS_LemonadeAlpha_N_parts2.png'], 'InvenIcon_PECS_LemonadeAlpha_N.png', 'LemonadeAlpha', None),
    'lemongamma':   (['FullbodyIMG_PECS_LemonadeGamma_N_part1.png', 'FullbodyIMG_PECS_LemonadeGamma_N_part2.png'], 'InvenIcon_PECS_LemonadeGamma_N.png', 'LemonadeGamma', None),
    'lemondelta':   (['FullbodyIMG_PECS_LemonadeDelta_N.png'], None, 'LemonadeDelta', (0.5, 0.09, 0.17)),
    'lemonepsilon': (['FullbodyIMG_PECS_LemonadeEpsilon_N_part1.png', 'FullbodyIMG_PECS_LemonadeEpsilon_N_part2.png'], 'InvenIcon_PECS_LemonadeEpsilon_N.png', 'LemonadeEpsilon', None),
    'lemonzeta':    (['FullbodyIMG_PECS_LemonadeZeta_N_DL.png'], None, None, (0.5, 0.09, 0.17)),
    # PECS 오메가 일러스트는 미공개 실루엣이라 공개된 MP 일러스트를 쓴다
    'lemonomega':   (['FullbodyIMG_MP_LemonadeOmega_N.png'], None, None, (0.5, 0.075, 0.16)),
}


def trim(im):
    bb = im.split()[-1].point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def ff(src, dst, args):
    if os.path.exists(dst):
        return
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src] + args + [dst])


def find_voice(folder, tags):
    d = os.path.join(VO, folder)
    if not os.path.isdir(d):
        return None
    fs = sorted(f for f in os.listdir(d) if f.endswith('.mp3'))
    for t in tags:
        for f in fs:
            if t in f:
                return os.path.join(d, f)
    return None


def main():
    # 1) 기존 MP 일러스트(lemonzeta/lemonomega) → mpzeta/mpomega
    for old, new in (('lemonzeta', 'mpzeta'), ('lemonomega', 'mpomega')):
        for sub, ext in (('full', '.webp'), ('icon', '.webp')):
            a = os.path.join(OUT, sub, old + ext); b = os.path.join(OUT, sub, new + ext)
            if os.path.exists(a) and not os.path.exists(b):
                shutil.move(a, b)
        for f in os.listdir(os.path.join(OUT, 'voice')):
            if f.startswith(old + '_'):
                b = os.path.join(OUT, 'voice', new + f[len(old):])
                if not os.path.exists(b):
                    shutil.move(os.path.join(OUT, 'voice', f), b)
    sizes = {}
    for key, (parts, ic, vo, crop) in UNITS.items():
        dst = os.path.join(OUT, 'full', key + '.webp')
        # 파츠는 뒤쪽 레이어(장비)부터 깔고 인물을 위에 (목록 역순)
        ims = [Image.open(os.path.join(FB, p)).convert('RGBA') for p in reversed(parts)]
        base = Image.new('RGBA', ims[0].size)
        for im in ims:
            if im.size != base.size:
                im = im.resize(base.size)
            base.alpha_composite(im)
        im = trim(base)
        full = im.copy(); full.thumbnail((720, 720), Image.LANCZOS)
        full.save(dst, 'WEBP', quality=86, method=6)
        sizes[key] = full.size
        idst = os.path.join(OUT, 'icon', key + '.webp')
        if ic and os.path.exists(os.path.join(IC, ic)):
            Image.open(os.path.join(IC, ic)).convert('RGBA').save(idst, 'WEBP', quality=90)
        else:
            w, h = im.size; cx, cy, s = crop
            side = int(h * s); x0 = int(w * cx - side / 2); y0 = int(h * cy - side / 2)
            im.crop((x0, y0, x0 + side, y0 + side)).resize((126, 126), Image.LANCZOS).save(idst, 'WEBP', quality=90)
        if vo:
            for tag, cands in VOICE_TAGS.items():
                s = find_voice(vo, cands) or (find_voice(vo, ['SpSkill-1', 'SpSkill']) if tag in ('start', 'mvp', 'talk') else find_voice(vo, ['SpSkill-2']))
                if s:
                    ff(s, os.path.join(OUT, 'voice', '%s_%s.mp3' % (key, tag)), ['-ac', '1', '-b:a', '64k'])
        print(key, sizes[key])
    # 2) assetsizes.js 갱신
    p = os.path.join(ROOT, 'js', 'assetsizes.js')
    s = open(p, encoding='utf-8').read()
    s = s.replace('  lemonzeta:', '  mpzeta:').replace('  lemonomega:', '  mpomega:')
    for k, (w, h) in sizes.items():
        line = '  %s: [%d, %d],\n' % (k, w, h)
        if re.search(r'^  %s:' % k, s, re.M):
            s = re.sub(r'^  %s: \[\d+, \d+\],\n' % k, line, s, flags=re.M)
        else:
            s = s.replace('};', line + '};')
    open(p, 'w', encoding='utf-8').write(s)
    print('done')


if __name__ == '__main__':
    main()
