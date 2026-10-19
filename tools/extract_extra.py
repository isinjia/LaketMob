# -*- coding: utf-8 -*-
"""원작 표(lao_data.json)에 없어 expand_roster.py 가 만들지 않는 유닛을 따로 추출한다.
- rhode: 시작 유닛 로데 (PECS_Rhode_N, 파츠 합성)
- lamparion: 램파트 스킨 램파리온 (AGS_Rampart_NS1) 을 별도 전설 유닛으로
- ireina: 엡실론 체육관 관원 이레이나 (PECS_Ireina_N, 트레이너 전용)
출력: assets/full, assets/icon, assets/voice, js/assetsizes.js 갱신
"""
import os, re, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
src = open(os.path.join(HERE, 'extract_lemonade.py'), encoding='utf-8').read()
ns = {'__file__': os.path.join(HERE, 'extract_lemonade.py'), '__name__': 'extract_lemonade'}
exec(src, ns)
VOICE_TAGS, OUT, trim, find_voice = ns['VOICE_TAGS'], ns['OUT'], ns['trim'], ns['find_voice']
# 원본 프로젝트가 E:/LAO_Google_QA 로 옮겨졌다 (extract_assets.py 의 SRC 는 옛 경로)
SRC = 'E:/LAO_Google_QA/Assets'
FB = SRC + '/AssetBundleResourceSub/Texture/FullbodyImg'
IC = SRC + '/AssetBundleResource/Texture/PCInvenIcon'
find_voice.__globals__['VO'] = SRC + '/AssetBundleResource/Sounds/Voice'
try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG = 'ffmpeg'


def ff(src, dst, args):
    if not os.path.exists(dst):
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', src] + args + [dst], check=True)

# key: (전신 파일들(위 레이어부터), 아이콘, 음성 폴더)
UNITS = {
    'rhode': (['FullbodyIMG_PECS_Rhode_N_part1.png', 'FullbodyIMG_PECS_Rhode_N_part2.png'], 'InvenIcon_PECS_Rhode_N.png', 'Rhode'),
    'lamparion': (['FullbodyIMG_AGS_Rampart_NS1.png'], 'InvenIcon_AGS_Rampart_NS1.png', 'RampartNS1'),
    # 엡실론 체육관 관원 (펜리르 대신). 트레이너 초상화·SD 용
    'ireina': (['FullbodyIMG_PECS_Ireina_N_part1.png', 'FullbodyIMG_PECS_Ireina_N_part2.png', 'FullbodyIMG_PECS_Ireina_N_part3.png'], 'InvenIcon_PECS_Ireina_N.png', 'Ireina'),
    # 체육관 부관 (원작 설정): 베타의 잉글리쉬 셰퍼드, 제타의 헤스티아 (델타의 테일러 리스트컷은 2D 모델 그림만 있어 따로 만든다)
    'shepherd': (['FullbodyIMG_PECS_Shepherd_N.png'], 'InvenIcon_PECS_Shepherd_N.png', 'Shepherd'),
    'hestia': (['FullbodyIMG_PECS_Hestia_N_Part1.png', 'FullbodyIMG_PECS_Hestia_N_Part2.png', 'FullbodyIMG_PECS_Hestia_N_Part3.png'], 'InvenIcon_PECS_Hestia_N.png', 'Hestia'),
}


def main():
    sizes = {}
    only = set(__import__('sys').argv[1:])  # 키를 주면 그 유닛만 다시 뽑는다
    for key, (parts, ic, vo) in UNITS.items():
        if only and key not in only: continue
        ims = [Image.open(os.path.join(FB, p)).convert('RGBA') for p in reversed(parts)]
        base = Image.new('RGBA', ims[0].size)
        for im in ims:
            base.alpha_composite(im if im.size == base.size else im.resize(base.size))
        full = trim(base)
        full.thumbnail((720, 720), Image.LANCZOS)
        full.save(os.path.join(OUT, 'full', key + '.webp'), 'WEBP', quality=86, method=6)
        sizes[key] = full.size
        Image.open(os.path.join(IC, ic)).convert('RGBA').save(os.path.join(OUT, 'icon', key + '.webp'), 'WEBP', quality=90)
        for tag, cands in VOICE_TAGS.items():
            s = find_voice(vo, cands) or (find_voice(vo, ['SpSkill-1', 'SpSkill']) if tag in ('start', 'mvp', 'talk', 'join') else find_voice(vo, ['SpSkill_2', 'SpSkill-2']))
            if s:
                ff(s, os.path.join(OUT, 'voice', '%s_%s.mp3' % (key, tag)), ['-ac', '1', '-b:a', '64k'])
        print(key, sizes[key])
    p = os.path.join(ROOT, 'js', 'assetsizes.js')
    b = open(p, 'rb').read()
    nl = '\r\n' if b'\r\n' in b else '\n'
    s = b.decode('utf-8')
    for k, (w, h) in sizes.items():
        line = '  %s: [%d, %d],%s' % (k, w, h, nl)
        if re.search(r'^  %s:' % k, s, re.M):
            s = re.sub(r'^  %s: \[\d+, \d+\],\r?\n' % k, line, s, flags=re.M)
        else:
            s = s.replace('};', line + '};', 1)
    open(p, 'wb').write(s.encode('utf-8'))
    print('done')


if __name__ == '__main__':
    main()
