# -*- coding: utf-8 -*-
"""원본 텍스처에서 전신 일러스트 한 장을 다시 만든다 (assets/full/<키>.webp).

사용법 (프로젝트 루트에서):
  python .claude/skills/lao-racket-art/scripts/rebuild_full.py <키> <원본파일> [<원본파일> ...]
      [--strip-x 시작x] [--keep-x 시작x] [--src 폴더]
  - 원본파일은 FullbodyImg 폴더 안의 이름. 여러 개면 앞의 것이 맨 앞 레이어(part1 = 인물)이고 뒤로 갈수록 뒤에 깐다.
  - --strip-x N : 첫 번째 원본에서 왼쪽 끝이 x>=N 인 떨어진 조각을 지운다 (창문 빛 판, 여분 무기 같은 배경·교체용 조각).
  - --keep-x N  : 첫 번째 원본에서 왼쪽 끝이 x>=N 인 조각만 남긴다 (한 장에 인물과 확대 컷이 같이 들어 있을 때).
  - 2048x2048 이 아닌 부품(2560x1440 배경 등)은 넣지 않는다.
결과: 알파 경계로 잘라 긴 변 720, WEBP 품질 86. 끝나면 크기를 출력한다 (크기 표·캐시 번호 갱신은 SKILL.md 참고).
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'E:/LAO/1_Onestre_QA/Assets/AssetBundleResourceSub/Texture/FullbodyImg'
a = sys.argv[1:]
OPTS = {n: a[a.index(n) + 1] for n in ('--strip-x', '--keep-x', '--src') if n in a}
for n in OPTS: i = a.index(n); del a[i:i + 2]
opt = lambda n: (int(OPTS[n]) if n in OPTS else None)
src = OPTS.get('--src', SRC)
key, files = a[0], a[1:]

layers = []
for i, f in enumerate(files):
    im = Image.open(f'{src}/{f}').convert('RGBA')
    if len(files) > 1 and im.size != (2048, 2048):
        print('건너뜀(배경 크기):', f, im.size); continue
    arr = np.array(im)
    if i == 0 and (opt('--strip-x') is not None or opt('--keep-x') is not None):
        lab, n = ndimage.label(ndimage.binary_dilation(arr[:, :, 3] > 8, iterations=4))
        for j, o in enumerate(ndimage.find_objects(lab)):
            x0 = o[1].start
            drop = (opt('--strip-x') is not None and x0 >= opt('--strip-x')) or (opt('--keep-x') is not None and x0 < opt('--keep-x'))
            if drop: arr[lab == j + 1, 3] = 0; print('지움', f, (x0, o[0].start, o[1].stop, o[0].stop))
    layers.append(Image.fromarray(arr))

out = Image.new('RGBA', layers[0].size)
for im in reversed(layers): out.alpha_composite(im)
out = out.crop(out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
out.thumbnail((720, 720), Image.LANCZOS)
out.save(f'assets/full/{key}.webp', 'WEBP', quality=86, method=4)
print(key, list(out.size))
