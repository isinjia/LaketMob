# -*- coding: utf-8 -*-
"""전신 일러스트 점검: 실루엣(검은 그림)과 본체에서 떨어진 조각이 있는 그림을 찾아 목록과 모음 이미지를 만든다.

사용법 (프로젝트 루트에서):
  python .claude/skills/lao-racket-art/scripts/scan_full.py [키 ...] [--sheet 출력.png]
키를 주지 않으면 assets/full/*.webp 전체를 본다.
떨어진 조각은 무기·소품·이펙트처럼 정상인 경우가 많으니, 모음 이미지를 눈으로 보고 판단한다.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

args = [a for a in sys.argv[1:] if not a.startswith('--')]
sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
if sheet in args: args.remove(sheet)
keys = args or sorted(f[:-5] for f in os.listdir('assets/full') if f.endswith('.webp'))

flagged = []
for k in keys:
    im = np.array(Image.open(f'assets/full/{k}.webp').convert('RGBA'))
    a = im[:, :, 3] > 40
    if not a.any(): continue
    mean = float(im[:, :, :3][a].mean())
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    sz = sorted(ndimage.sum(a, lab, range(1, n + 1)), reverse=True)
    extra = [round(s / a.sum(), 3) for s in sz[1:] if s / a.sum() > 0.003]
    if mean < 30 or extra:
        flagged.append(k)
        print(k, '실루엣' if mean < 30 else '', '떨어진 조각 비율', extra[:5])
print('점검 대상', len(keys), '표시', len(flagged))

if sheet and flagged:
    W, cols = 230, 7
    rows = (len(flagged) + cols - 1) // cols
    out = Image.new('RGB', (W * cols, (W + 14) * rows), (30, 30, 30)); d = ImageDraw.Draw(out)
    for i, k in enumerate(flagged):
        im = Image.open(f'assets/full/{k}.webp').convert('RGBA')
        bg = Image.new('RGBA', im.size, (40, 60, 80, 255)); bg.alpha_composite(im); bg.thumbnail((W - 4, W - 4))
        x, y = (i % cols) * W, (i // cols) * (W + 14)
        out.paste(bg.convert('RGB'), (x + 2, y + 14)); d.text((x + 3, y + 1), k, fill=(255, 255, 0))
    out.save(sheet); print('모음 이미지', sheet)
