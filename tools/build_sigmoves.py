# -*- coding: utf-8 -*-
"""본편(라스트 오리진) 설정에 맞춘 유닛 전투 데이터 생성: js/sigmoves.js

입력 tools/lo_sig.json — 유닛마다 본편 자료와 분류 결과
  key, cls(light/air/heavy), role(공격기/보호기/지원기), rank, stat(lv100 HP/ATK/DEF/SPD),
  skills[0·1]: 본편 액티브 1·2 — name, target(enemy/team), aoe, elem(none/fire/ice/elec),
               fx, kind(atk/heal/buff/guard/debuff), extra, desc(기술 설명)
  passive: 본편 패시브 하나 — name, kind(heal/buff/guard/taunt/debuff/focus), extra, fx, desc
  desc: 도감 설명
출력 js/sigmoves.js
  - 고유 기술 3개: 본편 액티브 1·2번과 패시브 하나를 이름 그대로 (sig_<key>_1/2/3)
  - 공용 기술은 무기 계열(총기·칼날·폭발·에너지·격투)과 역할·병종·속성에 맞춰 고른다
  - 속성 타입: 본편 액티브의 속성(화염/냉기/전기)
  - 기본 능력치: 본편 lv100 능력치 성향 + 같은 등급 안의 본편 강함 순위
  - 도감 설명
roster.js 가 모든 유닛을 등록한 뒤 SIG_SPECIES 를 덮어쓴다.

사용법: python tools/build_sigmoves.py
"""
import json, os, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
units = json.load(open(os.path.join(HERE, 'lo_sig.json'), encoding='utf-8'))

FX = set('bullet bullets snipe shell barrage bombs beam plasma slash slash3 bite smash dash dive flame fireball napalm ice icebeam blizzard spark thunder wave acid smoke heal shield buff debuff'.split())
RANK_BONUS = {'B': 0, 'A': 5, 'S': 10, 'SS': 15}
# 등급별 기본 능력치 합계의 중심값 (전투에서는 등급 배율 B 1.0 ~ SS 1.4 가 한 번 더 곱해진다).
# 같은 등급 안에서는 본편 능력치가 강할수록 최대 ±SPREAD 만큼 오르내린다.
RANK_TOTAL = {'B': 230, 'A': 255, 'S': 280, 'SS': 305}
SPREAD = 15
RANK_MULT = {'B': 1.0, 'A': 1.12, 'S': 1.25, 'SS': 1.4}
# 서사·진행 보정: 전설(사이드 스토리에서 만나는 존재)과 저항군 지도자는 더 강하게.
# 레모네이드 관장은 체육관 순서에 맞춘다 — 첫 관장 감마와 여섯째 알파는 같은 레벨대 부대가 넘을 수 있게 SS 하단으로
# (tools/balancetest.js 의 관장 승률 검사 기준)
STORY_BONUS = {'blacklilith': 25, 'eternity': 10, 'phoenix': 10, 'hongryun': 25, 'labiata': 10, 'harpy': 15, 'sleipnir': 10, 'cheona': 10,
               'lemongamma': -25, 'lemonbeta': 15, 'lemonepsilon': 15, 'lemonalpha': 20}
LEGENDS = {'blacklilith', 'eternity', 'phoenix', 'hongryun'}
# 시작 유닛은 등급과 무관하게 실전 능력치(합계 × 등급 배율)를 같게, 같은 B급 야생(230)보다 조금 높게
STARTERS = {'leprechaun', 'aqua', 'rhode'}
STARTER_POWER = 265
CHAMPION_TOTAL = 326  # js/data.js lemonomega 기본 능력치 합계

# 무기 계열: 고유 기술의 연출로 정한다
FAMILY = {'bullet': 'gun', 'bullets': 'gun', 'snipe': 'gun', 'acid': 'chem', 'smoke': 'chem',
          'slash': 'blade', 'slash3': 'blade', 'bite': 'blade',
          'shell': 'blast', 'barrage': 'blast', 'bombs': 'blast', 'fireball': 'blast', 'napalm': 'blast',
          'beam': 'energy', 'plasma': 'energy', 'spark': 'energy', 'thunder': 'energy', 'wave': 'energy', 'icebeam': 'energy', 'ice': 'energy', 'flame': 'energy', 'blizzard': 'energy',
          'smash': 'melee', 'dash': 'melee', 'dive': 'melee'}
# (병종, 계열) -> 기본 · 중급 · 마무리
WEAPON = {
    ('light', 'gun'): ['lshot', 'suppress', 'lfocus'], ('light', 'blade'): ['quick', 'blade', 'flash'],
    ('light', 'blast'): ['lshot', 'lgrenade', 'lfocus'], ('light', 'energy'): ['lshot', 'lbeam', 'lbeam2'],
    ('light', 'melee'): ['quick', 'rush', 'lbreak'],
    ('heavy', 'gun'): ['hmg', 'hmgburst', 'hmgfull'], ('heavy', 'blade'): ['hsmash', 'hcrush', 'hbreak'],
    ('heavy', 'blast'): ['shell', 'barrage', 'railgun'], ('heavy', 'energy'): ['shell', 'hbeam', 'railgun'],
    ('heavy', 'melee'): ['hsmash', 'hcrush', 'hbreak'],
    ('air', 'gun'): ['ashot', 'strafe', 'afocus'], ('air', 'blade'): ['dive', 'aslash', 'skyfall'],
    ('air', 'blast'): ['ashot', 'amissile', 'bomb'], ('air', 'energy'): ['aray', 'abeam', 'abeam2'],
    ('air', 'melee'): ['dive', 'aslash', 'skyfall'],
    ('light', 'chem'): ['lchem', 'jam', 'lpierce'], ('heavy', 'chem'): ['hchem', 'jam', 'hpierce'], ('air', 'chem'): ['achem', 'jam', 'apierce'],
}
# 계열별 공용 기술 (위 표에서 쓰는 것 중 아직 없던 것). 타입은 병종이라 자속이 붙는다.
GENERIC = {
    'lshot': {'name': '정밀 사격', 'type': 'light', 'cat': 'atk', 'pow': 55, 'acc': 100, 'pp': 30, 'fx': 'bullet', 'desc': '개인 화기로 한 발씩 정확하게 쏜다.'},
    'lfocus': {'name': '집중 사격', 'type': 'light', 'cat': 'atk', 'pow': 105, 'acc': 90, 'pp': 5, 'crit': 2, 'fx': 'bullets', 'desc': '탄창을 비울 각오로 한 점에 화력을 쏟아붓는다. 치명타가 나기 쉽다.'},
    'lgrenade': {'name': '유탄 발사', 'type': 'light', 'cat': 'atk', 'pow': 80, 'acc': 95, 'pp': 15, 'area': 1, 'fx': 'shell', 'desc': '총열 아래 유탄을 쏘아 일대를 휩쓴다.'},
    'lbeam': {'name': '레이저 사격', 'type': 'light', 'cat': 'atk', 'pow': 80, 'acc': 100, 'pp': 15, 'fx': 'beam', 'desc': '광학 병기로 곧은 빛줄기를 쏜다.'},
    'lbeam2': {'name': '고출력 레이저', 'type': 'light', 'cat': 'atk', 'pow': 110, 'acc': 90, 'pp': 5, 'pierce': 1, 'fx': 'beam', 'desc': '출력을 한계까지 올린 광선으로 장갑을 꿰뚫는다.'},
    'hmg': {'name': '중기관총', 'type': 'heavy', 'cat': 'atk', 'pow': 60, 'acc': 95, 'pp': 25, 'fx': 'bullets', 'desc': '대물 중기관총을 거치해 퍼붓는다.'},
    'hmgfull': {'name': '전탄 사격', 'type': 'heavy', 'cat': 'atk', 'pow': 115, 'acc': 85, 'pp': 5, 'area': 1, 'fx': 'bullets', 'desc': '모든 총열을 동시에 돌려 탄막으로 전장을 덮는다.'},
    'hsmash': {'name': '중장 타격', 'type': 'heavy', 'cat': 'atk', 'pow': 65, 'acc': 100, 'pp': 25, 'fx': 'smash', 'desc': '무거운 의장으로 내리찍는다.'},
    'hbeam': {'name': '입자 포격', 'type': 'heavy', 'cat': 'atk', 'pow': 85, 'acc': 95, 'pp': 15, 'fx': 'beam', 'desc': '거대 입자포로 굵은 빛줄기를 쏜다.'},
    'afocus': {'name': '기총 일제사격', 'type': 'air', 'cat': 'atk', 'pow': 105, 'acc': 90, 'pp': 5, 'crit': 2, 'fx': 'bullets', 'desc': '선회하며 모든 기총을 한 점에 모은다. 치명타가 나기 쉽다.'},
    'aslash': {'name': '급강하 베기', 'type': 'air', 'cat': 'atk', 'pow': 75, 'acc': 100, 'pp': 15, 'fx': 'slash', 'desc': '고공에서 내리꽂히며 날을 휘두른다.'},
    'skyfall': {'name': '낙하 강습', 'type': 'air', 'cat': 'atk', 'pow': 110, 'acc': 90, 'pp': 5, 'recoil': 0.2, 'fx': 'dive', 'desc': '최고 속도로 부딪쳐 상대를 짓눌러 버린다. 반동을 받는다.'},
    'amissile': {'name': '공대지 미사일', 'type': 'air', 'cat': 'atk', 'pow': 80, 'acc': 95, 'pp': 15, 'fx': 'shell', 'desc': '날개 밑 미사일을 쏘아 지상을 타격한다.'},
    'abeam': {'name': '항공 레이저', 'type': 'air', 'cat': 'atk', 'pow': 80, 'acc': 100, 'pp': 15, 'fx': 'beam', 'desc': '기체에 단 광학 병기로 위에서 내리쏜다.'},
    'abeam2': {'name': '궤도 조사', 'type': 'air', 'cat': 'atk', 'pow': 110, 'acc': 90, 'pp': 5, 'area': 1, 'fx': 'beam', 'desc': '상공에서 넓게 빛을 내리쬐어 일대를 태운다.'},
    'hcrush': {'name': '파쇄 일격', 'type': 'heavy', 'cat': 'atk', 'pow': 90, 'acc': 95, 'pp': 10, 'eff': {'foeDef': 0.3}, 'fx': 'smash', 'desc': '온 체중을 실은 일격으로 장갑째 부순다. 상대의 방어를 떨어뜨릴 때가 있다.'},
    'ashot': {'name': '기총 사격', 'type': 'air', 'cat': 'atk', 'pow': 55, 'acc': 100, 'pp': 30, 'fx': 'bullets', 'desc': '기체에 단 기총으로 짧게 끊어 쏜다.'},
    'vital': {'name': '급소 찌르기', 'type': 'light', 'cat': 'atk', 'pow': 70, 'acc': 100, 'pp': 15, 'crit': 2, 'fx': 'slash', 'desc': '날붙이로 관절과 약점만 골라 찌른다. 치명타가 나기 쉽다.'},
    'parry': {'name': '받아넘기기', 'type': 'light', 'cat': 'st', 'acc': 0, 'pp': 15, 'self': {'def': 1, 'atk': 1}, 'fx': 'shield', 'desc': '날로 공격을 흘려 넘기고 반격 자세를 잡는다. 방어와 공격이 오른다.'},
    'barrier': {'name': '방벽 전개', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 10, 'self': {'def': 2}, 'heal': 0.25, 'fx': 'shield', 'desc': '방패와 역장을 겹쳐 세운다. 방어가 크게 오르고 HP를 회복한다.'},
    'nanoheal': {'name': '나노 수복', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 10, 'heal': 0.35, 'self': {'def': 1}, 'fx': 'heal', 'desc': '나노머신을 풀어 상처를 메운다. HP를 회복하고 방어가 오른다.'},
    'rally': {'name': '사기 고양', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 15, 'self': {'atk': 1, 'def': 1}, 'fx': 'buff', 'desc': '부대를 독려해 사기를 끌어올린다. 공격과 방어가 오른다.'},
    'jam': {'name': '전파 교란', 'type': 'phys', 'cat': 'st', 'acc': 95, 'pp': 15, 'foe': {'spd': -2}, 'fx': 'wave', 'desc': '통신과 조준 장치를 교란한다. 상대의 속도가 크게 떨어진다.'},
    'suppress': {'name': '제압 사격', 'type': 'phys', 'cat': 'atk', 'pow': 70, 'acc': 100, 'pp': 15, 'eff': {'foeSpd': 0.5}, 'fx': 'bullets', 'desc': '탄막으로 상대를 엄폐물 뒤에 묶어 둔다. 상대의 속도를 떨어뜨릴 때가 있다.'},
    'charge': {'name': '출력 충전', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 15, 'self': {'atk': 1, 'acc': 1}, 'fx': 'buff', 'desc': '동력로 출력을 끌어올려 다음 일격을 준비한다. 공격과 명중이 오른다.'},
    'menace': {'name': '위압', 'type': 'phys', 'cat': 'st', 'acc': 100, 'pp': 20, 'foe': {'atk': -1}, 'fx': 'debuff', 'desc': '무기를 겨누고 다가서 기세로 누른다. 상대의 공격이 떨어진다.'},
    'hmgburst': {'name': '중기관총 연사', 'type': 'heavy', 'cat': 'atk', 'pow': 22, 'hits': [2, 5], 'acc': 95, 'pp': 15, 'fx': 'bullets', 'desc': '총열이 달아오를 때까지 2~5회 끊어 쏜다.'},
    'quickstep': {'name': '순간 가속', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 15, 'self': {'spd': 2}, 'fx': 'buff', 'desc': '추진기와 다리에 힘을 모아 단숨에 가속한다. 속도가 크게 오른다.'},
    'ironwall': {'name': '장갑 강화', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 15, 'self': {'def': 1, 'atk': 1}, 'fx': 'shield', 'desc': '두꺼운 장갑을 믿고 정면으로 맞선다. 방어와 공격이 오른다.'},
    'lpierce': {'name': '철갑 사격', 'type': 'light', 'cat': 'atk', 'pow': 75, 'acc': 100, 'pp': 15, 'pierce': 1, 'fx': 'bullet', 'desc': '철갑탄으로 갈아 끼워 장갑째 꿰뚫는다. 상대의 방어 강화를 무시한다.'},
    'hpierce': {'name': '철갑탄', 'type': 'heavy', 'cat': 'atk', 'pow': 85, 'acc': 95, 'pp': 10, 'pierce': 1, 'fx': 'shell', 'desc': '대전차 철갑탄을 쏘아 두꺼운 장갑을 뚫는다. 상대의 방어 강화를 무시한다.'},
    'apierce': {'name': '관통 미사일', 'type': 'air', 'cat': 'atk', 'pow': 80, 'acc': 95, 'pp': 10, 'pierce': 1, 'fx': 'shell', 'desc': '탄두가 장갑을 파고든 뒤 터진다. 상대의 방어 강화를 무시한다.'},
    'lchem': {'name': '나노 분무', 'type': 'light', 'cat': 'atk', 'pow': 55, 'acc': 100, 'pp': 25, 'eff': {'foeDef': 0.2}, 'fx': 'acid', 'desc': '나노 머신을 섞은 분무를 뿌려 장갑을 갉아 먹는다. 상대의 방어를 떨어뜨릴 때가 있다.'},
    'hchem': {'name': '부식액 살포', 'type': 'heavy', 'cat': 'atk', 'pow': 60, 'acc': 100, 'pp': 25, 'eff': {'foeDef': 0.2}, 'fx': 'acid', 'desc': '대용량 탱크에서 부식액을 쏟아붓는다. 상대의 방어를 떨어뜨릴 때가 있다.'},
    'achem': {'name': '공중 살포', 'type': 'air', 'cat': 'atk', 'pow': 55, 'acc': 100, 'pp': 25, 'eff': {'foeDef': 0.2}, 'fx': 'acid', 'desc': '공중에서 약품을 흩뿌려 상대를 덮친다. 상대의 방어를 떨어뜨릴 때가 있다.'},
    'lbreak': {'name': '전력 돌파', 'type': 'light', 'cat': 'atk', 'pow': 115, 'acc': 95, 'pp': 5, 'recoil': 0.25, 'fx': 'dash', 'desc': '몸을 아끼지 않고 정면으로 부딪쳐 꿰뚫고 나간다. 반동을 받는다.'},
    'hbreak': {'name': '갑옷 분쇄', 'type': 'heavy', 'cat': 'atk', 'pow': 120, 'acc': 90, 'pp': 5, 'recoil': 0.25, 'fx': 'smash', 'desc': '온몸의 출력을 실어 내리찍어 장갑째 부순다. 반동을 받는다.'},
    'lunge': {'name': '파고들기', 'type': 'light', 'cat': 'atk', 'pow': 55, 'acc': 100, 'pp': 25, 'eff': {'foeDef': 0.2}, 'fx': 'dash', 'desc': '단숨에 품으로 파고들어 날을 찔러 넣는다. 상대의 방어를 떨어뜨릴 때가 있다.'},
    'twinslash': {'name': '연속 베기', 'type': 'light', 'cat': 'atk', 'pow': 30, 'hits': [2, 3], 'acc': 100, 'pp': 15, 'fx': 'slash3', 'desc': '날을 되돌려 2~3회 연달아 벤다.'},
    'bleed': {'name': '깊게 베기', 'type': 'light', 'cat': 'atk', 'pow': 70, 'acc': 100, 'pp': 15, 'eff': {'foeAtk': 0.3}, 'fx': 'slash', 'desc': '힘줄을 노려 깊게 베어 낸다. 상대의 공격을 떨어뜨릴 때가 있다.'},
    'doubletap': {'name': '점사', 'type': 'light', 'cat': 'atk', 'pow': 30, 'hits': [2, 2], 'acc': 100, 'pp': 25, 'fx': 'bullet', 'desc': '두 발씩 끊어 쏘아 같은 곳을 두 번 맞힌다.'},
    'lsweep': {'name': '소탕 사격', 'type': 'light', 'cat': 'atk', 'pow': 95, 'acc': 95, 'pp': 5, 'area': 1, 'fx': 'bullets', 'desc': '탄창을 갈아 끼우며 일대를 쓸어 버린다.'},
    'aburst': {'name': '기총 연사', 'type': 'air', 'cat': 'atk', 'pow': 25, 'hits': [2, 3], 'acc': 95, 'pp': 20, 'fx': 'bullets', 'desc': '스쳐 지나가며 기총을 2~3회 끊어 쏜다.'},
    'carpet': {'name': '융단 폭격', 'type': 'air', 'cat': 'atk', 'pow': 95, 'acc': 90, 'pp': 5, 'area': 1, 'fx': 'bombs', 'desc': '편대를 짜 지상을 빈틈없이 폭격한다.'},
    'hstomp': {'name': '짓밟기', 'type': 'heavy', 'cat': 'atk', 'pow': 65, 'acc': 100, 'pp': 20, 'eff': {'foeSpd': 0.3}, 'fx': 'smash', 'desc': '육중한 다리로 짓밟아 움직임을 묶는다. 상대의 속도를 떨어뜨릴 때가 있다.'},
    'hshellap': {'name': '철갑 포탄', 'type': 'heavy', 'cat': 'atk', 'pow': 60, 'acc': 95, 'pp': 25, 'eff': {'foeDef': 0.2}, 'fx': 'shell', 'desc': '철갑 포탄을 쏘아 장갑을 깎는다. 상대의 방어를 떨어뜨릴 때가 있다.'},
    'hsalvo': {'name': '연속 포격', 'type': 'heavy', 'cat': 'atk', 'pow': 35, 'hits': [2, 3], 'acc': 90, 'pp': 10, 'fx': 'barrage', 'desc': '포문을 번갈아 2~3회 쏘아 댄다.'},
    'aray': {'name': '조준 광선', 'type': 'air', 'cat': 'atk', 'pow': 55, 'acc': 100, 'pp': 25, 'fx': 'beam', 'desc': '위에서 가는 광선을 짧게 끊어 쏜다.'},
    'ldrill': {'name': '천공 일격', 'type': 'light', 'cat': 'atk', 'pow': 75, 'acc': 100, 'pp': 15, 'pierce': 1, 'fx': 'smash', 'desc': '회전하는 끝으로 한 점을 파고들어 장갑을 뚫는다. 상대의 방어 강화를 무시한다.'},
    'provoke': {'name': '도발', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 20, 'self': {'def': 1}, 'foe': {'atk': -1}, 'fx': 'debuff', 'desc': '일부러 앞으로 나서 적의 공격을 끌어낸다. 자신의 방어가 오르고 상대의 공격이 떨어진다.'},
    'lcover': {'name': '엄폐', 'type': 'light', 'cat': 'st', 'acc': 0, 'pp': 15, 'self': {'def': 1}, 'heal': 0.25, 'fx': 'shield', 'desc': '엄폐물 뒤로 몸을 숨겨 숨을 고른다. 방어가 오르고 HP를 조금 회복한다.'},
    'evade': {'name': '회피 기동', 'type': 'air', 'cat': 'st', 'acc': 0, 'pp': 15, 'self': {'def': 1, 'spd': 1}, 'heal': 0.2, 'fx': 'buff', 'desc': '급선회로 적의 조준을 흐트러뜨린다. 방어와 속도가 오르고 HP를 조금 회복한다.'},
}
# 역할별 방어 기술 (병종에 맞는 타입)
DEFEND = {'light': 'lcover', 'heavy': 'fortify', 'air': 'evade'}  # 칼날 계열 경장 보호기는 steelwill(강철의 의지)
ELEM_MOVES = {'fire': ['flamer', 'incend', 'napalm'], 'ice': ['coldshot', 'cryo', 'absolute'], 'elec': ['shock', 'plasma', 'thunder']}


def fix_words(t):
    """게임 용어로 맞춘다: 급소 → 치명타/약점."""
    t = t.replace('치명타가 나기 쉽다', '치명타가 나기 쉽다').replace('급소에 맞기', '치명타가 나기')
    return t.replace('급소를', '약점을').replace('급소만', '약점만').replace('급소', '약점')


def elem_of(u):
    es = [s['elem'] for s in u['skills'][:2] if s.get('elem') not in (None, 'none')]
    return max(set(es), key=es.count) if es else None


def family_of(u):
    fs = [FAMILY[s['fx']] for s in u['skills'][:2] if s['kind'] == 'atk' and s['fx'] in FAMILY]
    if not fs: fs = [FAMILY[s['fx']] for s in u['skills'][:2] if s['fx'] in FAMILY]
    return fs[0] if fs else {'light': 'gun', 'heavy': 'blast', 'air': 'gun'}[u['cls']]


def apply_extra(m, extra):
    if extra == 'multi': m['hits'] = [2, 3]; m['pow'] = round(m['pow'] / 2.2)
    elif extra == 'crit': m['crit'] = 2
    elif extra == 'prio': m['prio'] = 1; m['pow'] -= 10
    elif extra == 'pierce': m['pierce'] = 1
    elif extra in ('burn', 'freeze', 'para'):
        # 상태이상은 그 속성 기술만 (화상=화염, 동결=냉기, 감전=전기), 아니면 상대 방어를 깎는 것으로
        if {'burn': 'fire', 'freeze': 'ice', 'para': 'elec'}[extra] == m['type']: m['eff'] = {extra: 0.3}
        else: m['eff'] = {'foeDef': 0.4}
    elif extra in ('foeDef', 'foeAtk', 'foeAcc', 'foeSpd'): m['eff'] = {extra: 0.5}
    elif extra in ('selfAtk', 'selfDef', 'selfSpd'): m['self'] = {extra[4:].lower(): 1}
    elif extra == 'drain': m['drain'] = 0.4
    elif extra == 'recoil': m['recoil'] = 0.25; m['pow'] += 15
    elif extra == 'taunt': m['self'] = {'def': 1}; m['eff'] = {'foeAtk': 0.5}


SKILL_FIX = {('goltarion', 2): {'kind': 'atk', 'extra': 'selfAtk', 'fx': 'bombs', 'desc': '데모닉 웨폰을 소환해 전장에 투하한다. 일대를 덮치고 자신의 공격이 오른다.'}}


def sig_move(u, i, s):
    s = dict(s, **SKILL_FIX.get((u['key'], i), {}))
    role, rank = u['role'], u['rank']
    elem = s.get('elem') if s.get('elem') not in (None, 'none') else None
    fx = s['fx'] if s['fx'] in FX else ('heal' if s['kind'] == 'heal' else 'buff')
    m = {'name': s['name'], 'type': elem or u['cls'], 'fx': fx, 'desc': s['desc'], 'sig': u['key']}
    kind, extra = s['kind'], s.get('extra') or 'none'
    # 본편에서 적을 노리는 스킬은 피해를 주는 공격으로 (부가 효과는 그대로 살린다)
    od = s.get('odesc') or ''
    self_only = od and '피해' not in od and any(w in od for w in ('증가', '회복', '부여', '획득'))
    if s.get('target') == 'enemy' and kind != 'atk' and not self_only:
        extra = {'buff': 'selfAtk', 'guard': 'selfDef', 'heal': 'drain'}.get(kind, extra if extra != 'none' else 'foeDef')
        kind = 'atk'
    if s.get('target') == 'team' and kind == 'atk':
        kind = 'guard' if role == '보호기' else 'buff'
    if kind == 'atk':
        # 1번은 레벨 1부터 쓰는 주력기라 초반 기본기 수준, 2번은 16레벨에 배우는 필살기
        if i == 1: pow_ = {'공격기': 60, '보호기': 50, '지원기': 45}[role] + RANK_BONUS[rank] * 3 // 5
        else: pow_ = {'공격기': 95, '보호기': 80, '지원기': 75}[role] + RANK_BONUS[rank] * 4 // 5
        m.update(cat='atk', acc=100, pp=20 if i == 1 else (5 if rank == 'SS' and role == '공격기' else 10))
        if s.get('aoe'):
            m['area'] = 1; pow_ = round(pow_ * 0.9)
        if m['fx'] in ('buff', 'debuff', 'shield', 'heal'):
            m['fx'] = {'light': 'bullet', 'heavy': 'shell', 'air': 'bullets'}[u['cls']]
        m['pow'] = pow_
        apply_extra(m, extra)
        m['pow'] = max(25, m['pow'])
        return m
    m.update(cat='st', acc=0, pp=15 if i == 1 else 10)
    status_move(m, kind, extra, role)
    fit_fx(m, kind, elem_of(u))
    return m


STATUS_FX = {'heal': {'heal'}, 'buff': {'buff'}, 'focus': {'buff'}, 'guard': {'shield'}, 'taunt': {'shield', 'debuff'},
             'debuff': {'debuff', 'smoke', 'wave', 'acid', 'spark', 'thunder', 'ice', 'blizzard', 'flame'}}
ELEM_FX = {'spark': 'elec', 'thunder': 'elec', 'ice': 'ice', 'icebeam': 'ice', 'blizzard': 'ice', 'flame': 'fire', 'fireball': 'fire', 'napalm': 'fire'}


def fit_fx(m, kind, elem):
    """변화기 연출은 효과에 맞게, 속성 연출은 그 속성 유닛만."""
    fx = m['fx']
    if fx in ELEM_FX and ELEM_FX[fx] != elem: fx = None
    if fx not in STATUS_FX.get(kind, {fx}): fx = None
    m['fx'] = fx or {'heal': 'heal', 'buff': 'buff', 'focus': 'buff', 'guard': 'shield', 'taunt': 'shield'}.get(kind, 'debuff')


def status_move(m, kind, extra, role):
    if kind == 'heal':
        m['heal'] = 0.5 if role == '지원기' else 0.35
        if extra in ('selfDef', 'selfAtk', 'selfSpd'): m['self'] = {extra[4:].lower(): 1}
    elif kind == 'buff':
        m['self'] = {'atk': 2} if extra == 'selfAtk' else {'spd': 2} if extra == 'selfSpd' else {'atk': 1, 'acc': 1} if extra == 'selfAcc' else {'atk': 1, 'spd': 1}
        if role == '지원기' and m['self'].get('atk', 0) >= 2: m['self'] = {'atk': 1, 'def': 1}  # 지원기의 지휘는 부대 정비
        if extra == 'heal' or role == '지원기': m['heal'] = 0.25  # 지원기의 강화는 부대를 돌보는 일이기도 하다
    elif kind == 'focus':
        m['self'] = {'atk': 1, 'acc': 1}
        if extra == 'selfSpd': m['self']['spd'] = 1
    elif kind == 'guard':
        m['self'] = {'def': 2} if extra != 'selfSpd' else {'def': 1}
        if extra in ('selfAtk', 'selfSpd'): m['self'][extra[4:].lower()] = 1
        if role == '보호기' or extra == 'heal': m['heal'] = 0.2
    elif kind == 'taunt':
        m['self'] = {'def': 1}; m['foe'] = {'atk': -1}
        if extra == 'heal': m['heal'] = 0.2
    else:  # debuff
        m['acc'] = 95
        if extra in ('burn', 'freeze', 'para'): m['status'] = extra; m['acc'] = 90
        else:
            k = {'foeAtk': 'atk', 'foeAcc': 'acc', 'foeSpd': 'spd'}.get(extra, 'def')
            m['foe'] = {k: -2 if k != 'acc' else -1}


STAGES = ('atk', 'def', 'spd', 'acc')


def mech_move(u, p):
    """패시브마다 따로 설계한 고유 효과 (tools/lo_sig.json passive.mech) — 범위를 검사해 기술로."""
    x = p['mech']
    elems = {e for e in (s.get('elem') for s in u['skills'][:2]) if e not in (None, 'none')}
    m = {'name': p['name'], 'desc': x['desc'], 'sig': u['key']}
    self_ = {k: max(-1, min(2, int(v))) for k, v in (x.get('self') or {}).items() if k in STAGES and v}
    if sum(v for v in self_.values() if v > 0) > 3: self_ = dict(list(self_.items())[:2])
    if x.get('cat') == 'atk':
        m.update(type=elem_of(u) or u['cls'], cat='atk', pow=max(50, min(95, int(x.get('pow') or 70))), acc=100, pp=10)
        eff = {}
        for k, v in (x.get('eff') or {}).items():
            if k in ('burn', 'freeze', 'para') and {'burn': 'fire', 'freeze': 'ice', 'para': 'elec'}[k] not in elems: continue
            if k in ('burn', 'freeze', 'para', 'foeDef', 'foeAtk', 'foeSpd', 'foeAcc'): eff[k] = max(0.1, min(0.5, float(v)))
        if eff: m['eff'] = eff
        if x.get('drain'): m['drain'] = max(0.1, min(0.5, float(x['drain'])))
        m['fx'] = x.get('fx') if x.get('fx') in FX and x.get('fx') not in ('buff', 'debuff', 'shield', 'heal') else {'light': 'bullet', 'heavy': 'shell', 'air': 'bullets'}[u['cls']]
    else:
        m.update(type='phys', cat='st', acc=0, pp=10)
        foe = {k: max(-2, min(0, int(v))) for k, v in (x.get('foe') or {}).items() if k in STAGES and v}
        if foe: m['foe'] = foe; m['acc'] = 95
        m['fx'] = x.get('fx') if x.get('fx') in ('heal', 'shield', 'buff', 'debuff', 'smoke', 'wave', 'acid') else 'buff'
    if self_: m['self'] = self_
    if x.get('heal'): m['heal'] = max(0.1, min(0.5, float(x['heal'])))
    if m['cat'] == 'st' and not (m.get('self') or m.get('foe') or m.get('heal')): return None
    return m


def guard_stance(u, name):
    """보호기 패시브를 변화기로: 이름에 담긴 뜻에 따라 다른 태세."""
    if any(w in name for w in ('반격', '카운터', '역습', '되갚', '응징')):
        return {'cat': 'st', 'self': {'def': 1, 'atk': 1}, 'fx': 'shield', 'desc': '공격을 받아넘기며 되갚아 줄 자세를 잡는다. 방어와 공격이 오른다.'}
    if any(w in name for w in ('속도', '기동', '추적', '질주', '빠르')):
        return {'cat': 'st', 'self': {'spd': 2, 'def': 1}, 'fx': 'buff', 'desc': '속도를 끌어올려 맞기 전에 비켜선다. 속도가 크게 오르고 방어가 오른다.'}
    if any(w in name for w in ('조심', '지키', '수호', '호위', '보호', '막아', '방패', '님')):
        return {'cat': 'st', 'self': {'def': 1}, 'foe': {'atk': -1}, 'heal': 0.2, 'fx': 'shield', 'desc': '지켜야 할 이를 등 뒤에 두고 적을 막아선다. 방어가 오르고 상대의 공격이 떨어지며 HP를 조금 회복한다.'}
    return {'cat': 'st', 'self': {'def': 1}, 'heal': 0.35, 'fx': 'heal', 'desc': '이를 악물고 버티며 몸을 추스른다. 방어가 오르고 HP를 회복한다.'}


GUARD_TEXT = ['몸을 낮춰 공격을 받아낼 태세를 갖춘다. 방어가 오르고 상대의 공격이 떨어지며 HP를 조금 회복한다.',
              '동료 앞을 막아서며 반격할 틈을 노린다. 방어가 오르고 상대의 공격이 떨어지며 HP를 조금 회복한다.',
              '자세를 다잡고 버티며 적의 기세를 꺾는다. 방어가 오르고 상대의 공격이 떨어지며 HP를 조금 회복한다.']
MECH_FIX = {
    'aqua': {'cat': 'st', 'heal': 0.35, 'self': {'def': 1}, 'fx': 'heal', 'desc': '다친 동료를 다독이며 소독하고 감싸 준다. HP를 회복하고 방어가 오른다.'},
    'harpy': {'cat': 'st', 'self': {'spd': 2, 'acc': 1}, 'fx': 'buff', 'desc': '스텔스 기동으로 레이더에서 사라졌다가 유리한 각도를 잡는다. 속도가 크게 오르고 명중이 오른다.'},
    'cheona': {'cat': 'st', 'self': {'spd': 1, 'atk': 1}, 'fx': 'smoke', 'desc': '그림자에 숨어 기척을 지우고 다음 일격을 노린다. 속도와 공격이 오른다.'},
    'cocowhiteshell': {'cat': 'st', 'self': {'def': 1}, 'foe': {'atk': -1}, 'fx': 'shield', 'desc': '궤도 장갑판을 겹쳐 받아내고 충격을 되돌린다. 방어가 오르고 상대의 공격이 떨어진다.'},
}


def passive_move(u):
    p = u.get('passive')
    if not p or not p.get('name'): return None
    if u['key'] in MECH_FIX:
        p = dict(p, mech=dict(MECH_FIX[u['key']]))
    elif u['role'] == '보호기' and (p.get('mech') or {}).get('cat') == 'atk':
        p = dict(p, mech=guard_stance(u, p['name']))
    if p.get('mech'):
        m = mech_move(u, p)
        if m: return m
    m = {'name': p['name'], 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 10, 'fx': p['fx'] if p['fx'] in FX else 'buff', 'desc': p['desc'], 'sig': u['key']}
    status_move(m, p['kind'], p.get('extra') or 'none', u['role'])
    fit_fx(m, p['kind'], elem_of(u))
    return m


def subtype(u):
    """역할 안의 하위 유형: 고유 기술(액티브·패시브)의 성격으로 정한다."""
    kinds = [s['kind'] for s in u['skills'][:2]] + [((u.get('passive') or {}).get('kind'))]
    extras = [s.get('extra') for s in u['skills'][:2]] + [((u.get('passive') or {}).get('extra'))]
    if u['role'] == '보호기':
        st = u.get('stat') or {}
        if u['cls'] == 'air' and st.get('SPD', 0) >= 4.3: return 'evade'
        return 'taunt' if 'taunt' in kinds or 'taunt' in extras or 'foeAtk' in extras else 'wall'
    if u['role'] == '지원기':
        if kinds.count('heal') or 'heal' in extras: return 'heal'
        if 'debuff' in kinds or sum(1 for e in extras if e and e.startswith('foe')) >= 2: return 'debuff'
        return 'command'
    return 'attack'


ELEM_FX_SET = {'flame', 'fireball', 'napalm', 'ice', 'icebeam', 'blizzard', 'spark', 'thunder'}


def elemental_weapon(u):
    """고유 공격기 연출이 모두 속성 연출이면 속성 자체가 무기다 (화염방사기·냉각포·전격봉 등)."""
    fxs = [x['fx'] for x in u['skills'][:2] if x['kind'] == 'atk']
    return bool(fxs) and all(f in ELEM_FX_SET for f in fxs)


def learnset(u, elem, fam, has3):
    role, cls, key = u['role'], u['cls'], u['key']
    w = WEAPON[(cls, fam)]
    e = ELEM_MOVES.get(elem)
    n_el = sum(1 for x in u['skills'][:2] if x.get('elem') not in (None, 'none'))
    e2 = e if n_el >= 2 else None  # 두 액티브 모두 속성일 때만 속성 기술로 채운다
    if e2 and elemental_weapon(u): w = list(e2)  # 화염방사기·냉기·전격이 무기 자체인 유닛
    mid = e2[1] if e2 else w[1]
    ult = e[2] if e else w[2]
    s1, s2, s3 = f'sig_{key}_1', f'sig_{key}_2', f'sig_{key}_3'
    defend = 'parry' if cls == 'light' and fam == 'blade' else DEFEND[cls]
    sub = subtype(u)
    if role == '보호기':
        if sub == 'evade':  # 회피형 (빠른 기동형 보호기): 맞지 않는 방어
            kit = [[1, 'evade'], [11, 'smoke'], [21, 'provoke'], [33, 'coverfire' if fam == 'gun' else 'guard']]
        elif sub == 'taunt':  # 도발·엄호형: 적의 공격을 끌어낸다
            kit = [[1, 'guard'], [11, 'provoke'], [21, 'coverfire' if fam == 'gun' else defend], [33, 'taunt']]
        else:  # 방벽형: 버티고 회복한다 (고유 기술이 이미 방어라 공용은 반격 위주)
            kit = [[1, 'guard'], [11, 'barrier'], [21, w[1]], [33, 'fortify' if cls == 'heavy' else defend]]
        ls = [[1, s1], kit[0], [6, w[0]], kit[1], [16, s2], kit[2], [27, mid], kit[3], [40, ult]]
    elif role == '지원기':
        if sub == 'heal':  # 치유형: 회복이 본업
            kit = [[6, 'repair'], [11, 'smoke' if fam in ('gun', 'blast') else 'taunt'], [21, 'nanoheal'], [33, 'rally']]
        elif sub == 'debuff':  # 교란형: 상대를 무디게 한다
            kit = [[6, 'smoke' if cls != 'heavy' else 'taunt'], [11, 'jam'], [21, 'expose' if cls == 'light' else 'taunt'], [33, 'command']]
        else:  # 지휘형: 부대를 이끈다
            kit = [[6, 'command'], [11, 'smoke' if fam in ('gun', 'blast') else 'jam'], [21, 'rally'], [33, 'taunt']]
        ls = [[1, s1], [1, w[0]], kit[0], kit[1], [16, s2], kit[2], kit[3]]
    else:
        sniper = any(x['fx'] == 'snipe' for x in u['skills'][:2])
        if fam == 'gun': crit = 'snipe' if sniper else {'light': 'lpierce', 'heavy': 'hpierce', 'air': 'apierce'}[cls]
        elif fam == 'blade': crit = {'light': 'vital', 'heavy': 'hcrush', 'air': 'aslash'}[cls]
        elif fam == 'melee': crit = {'light': 'ldrill', 'heavy': 'hcrush', 'air': 'aslash'}[cls]
        elif fam == 'energy': crit = 'thunder' if elem == 'elec' else {'light': 'lbeam2', 'heavy': 'hpierce', 'air': 'apierce'}[cls]
        else: crit = {'light': 'lpierce', 'heavy': 'hpierce', 'air': 'apierce'}[cls]
        prep = {'gun': 'aimed', 'blast': 'aimed', 'blade': 'quick' if cls == 'light' else 'rally', 'energy': 'charge', 'melee': 'rally', 'chem': 'aimed'}[fam]
        ls = [[1, s1], [1, w[0]], [6, prep], [11, w[1] if not e2 else e[0]], [16, s2], [21, crit], [27, mid], [40, ult]]
    if cls == 'air' and not e:
        fxs = {x['fx'] for x in u['skills'][:2]}
        if 'bombs' in fxs: ls = [[lv, 'bomb' if m == ult else m] for lv, m in ls]
        elif 'barrage' in fxs or 'shell' in fxs: ls = [[lv, 'bomb' if m == ult else m] for lv, m in ls]
        elif 'beam' in fxs or 'plasma' in fxs: ls = [[lv, 'abeam2' if m == ult else m] for lv, m in ls]
    if fam not in ('gun', 'blast'):
        ls = [[lv, 'menace' if m == 'taunt' else m] for lv, m in ls]
    # 같은 하위 유형 안에서도 본편 능력치 성향으로 한 자리를 바꾼다 (빠른 유닛은 가속, 단단한 유닛은 장갑)
    st = u.get('stat') or {}
    prof = 'fast' if st.get('SPD', 4) >= 4.45 else 'tough' if st.get('DEF', 0) >= 300 or st.get('HP', 0) >= 3800 else None
    if prof and role == '공격기':
        swap = 'quickstep' if prof == 'fast' else 'ironwall'
        ls = [[lv, swap if lv == 6 else m] for lv, m in ls]
    elif prof == 'fast' and role != '공격기':
        ls = [[lv, 'quickstep' if lv == 33 else m] for lv, m in ls]
    if has3: ls.append([30, s3])
    if key in STARTERS:  # 시작 유닛은 본편 필살기(액티브 2)를 첫 관장 전에 배운다
        ls = [[10, m] if m == s2 else [lv, m] for lv, m in ls]
    ls.sort(key=lambda x: x[0])
    seen, out = set(), []
    for lv, m in ls:
        if m not in seen: seen.add(m); out.append([lv, m])
    return out


GUNLIKE = {'lshot', 'ashot', 'hmg', 'lpierce', 'apierce', 'hpierce', 'lfocus', 'afocus', 'hmgfull', 'hmgburst', 'amissile',
           'burst', 'snipe', 'suppress', 'strafe', 'shell', 'barrage', 'lgrenade', 'coverfire', 'taunt'}


def effect_key(m):
    sign = lambda d: sorted(k + ('+' if v > 0 else '-') for k, v in (d or {}).items())
    heal_only = bool(m.get('heal')) and not m.get('self') and not m.get('foe')
    return json.dumps([m.get('cat'), sign(m.get('self')), sign(m.get('foe')), heal_only, sorted((m.get('eff') or {}).keys()), m.get('status')])


ALT = {'quick': 'lunge', 'blade': 'twinslash', 'vital': 'bleed', 'lshot': 'doubletap', 'lfocus': 'lsweep', 'suppress': 'doubletap',
       'ashot': 'aburst', 'bomb': 'carpet', 'strafe': 'aburst', 'hsmash': 'hstomp', 'shell': 'hshellap', 'barrage': 'hsalvo', 'hmgburst': 'hsalvo'}


def variant(key, m):
    """같은 계열 유닛끼리 공용 세트가 똑같지 않게: 유닛 이름으로 정해지는 한쪽을 고른다."""
    if m not in ALT: return m
    h = sum(ord(c) * (i + 1) for i, c in enumerate(key + m))
    return ALT[m] if h % 2 else m


def tidy(u, ls, moves, elems):
    """키트 정리: 고유 기술과 효과가 같은 공용 변화기 빼기, 방어 강화·회복 겹침 줄이기,
    속성 무기 유닛의 총·미사일 공용기를 속성 기술로, 지원기의 공격 마무리기를 빼기."""
    sigs = [m for _, m in ls if m.startswith('sig_')]
    sig_keys = {effect_key(moves[m]) for m in sigs if m in moves}
    e = ELEM_MOVES.get(elems[0]) if elems else None
    pool = [x for x in (e or []) if x not in [m for _, m in ls]]
    out = []
    def_up = sum(1 for m in sigs if m in moves and (moves[m].get('self') or {}).get('def', 0) > 0)
    sig_def = def_up > 0
    atk_up = sum(1 for m in sigs if m in moves and moves[m].get('cat') == 'st' and (moves[m].get('self') or {}).get('atk', 0) > 0)
    heals = sum(1 for m in sigs if m in moves and moves[m].get('heal'))
    heal_cap = 2 if subtype(u) == 'heal' else 1
    for lv, m in ls:
        d = moves.get(m) or GENERIC.get(m) or BASE_MOVES.get(m) or {}
        if not m.startswith('sig_'):
            if d.get('cat') == 'st' and effect_key(d) in sig_keys:
                continue  # 고유 기술이 같은 일을 한다
            if (d.get('self') or {}).get('def', 0) > 0 and not d.get('foe'):  # 순수 방어 강화만 센다 (도발은 제외)
                if def_up >= (1 if sig_def else 2):
                    if u['role'] == '보호기' and 'provoke' not in [x for _, x in ls] + [x for _, x in out]:
                        out.append([lv, 'provoke'])  # 버티기는 고유 기술이 맡으니 끌어들이기를 준다
                    continue
                def_up += 1
            if d.get('heal') and d.get('cat') == 'st':
                if heals >= heal_cap: continue
                heals += 1
            if d.get('cat') == 'st' and (d.get('self') or {}).get('atk', 0) > 0:
                if atk_up >= 2: continue
                atk_up += 1
            if e and m in GUNLIKE and elemental_weapon(u):  # 화염방사기·냉기·전격이 무기인 유닛
                if not pool: continue
                m = pool.pop(0)
            if u['role'] == '지원기' and lv >= 40:
                continue  # 지원기는 공격 마무리기 대신 고유 기술과 지원기로 싸운다
        out.append([lv, variant(u['key'], m) if not m.startswith('sig_') else m])
    seen, res = set(), []
    for lv, m in out:
        if m not in seen: seen.add(m); res.append([lv, m])
    return res


def power(u, med):
    st = u['stat']
    hp = st['HP'] if st['HP'] >= 1000 else med['HP']
    return 0.4 * hp / med['HP'] + 0.4 * st['ATK'] / med['ATK'] + 0.2 * max(st['DEF'], 15) / med['DEF']


STAT_FIX = {'goltarion': {'HP': 3900, 'DEF': 300}}  # 본편 표의 골타리온 HP 420 은 자료 오류 (보호기 AGS)


def base_stats(u, med, zrank):
    st = dict(u.get('stat') or {}, **STAT_FIX.get(u['key'], {})) if u.get('stat') else None
    if not st: return None
    hp, atk, de, spd = st['HP'], st['ATK'], st['DEF'], st['SPD']
    if hp < 1000: hp = med['HP']  # 본편 자료 오류(예: 골타리온 HP 420)
    r = [(hp / med['HP']) ** 0.6, (atk / med['ATK']) ** 0.85, (max(de, 15) / med['DEF']) ** 0.45, ((spd - 3.0) / (med['SPD'] - 3.0)) ** 0.8]
    w = [x * 0.25 for x in r]
    total = RANK_TOTAL[u['rank']] + round(SPREAD * zrank) + STORY_BONUS.get(u['key'], 0)
    total = min(total, CHAMPION_TOTAL - (6 if u['key'] == 'lemonalpha' else 8))  # 챔피언 오메가가 가장 강하고, 협회장 알파가 그다음
    if u['key'] in STARTERS: total = round(STARTER_POWER / RANK_MULT[u['rank']])
    b = [total * x / sum(w) for x in w]
    if u['key'] in STARTERS:  # 시작 유닛은 성향을 4분의 1만 살려 한쪽으로 치우치지 않게
        b = [x * 0.25 + total / 4 * 0.75 for x in b]
    if u['role'] == '공격기' and b[2] > b[1]: b[1], b[2] = b[2], b[1]  # 공격기는 공격이 방어 이상
    b = [min(150, max(25, x)) for x in b]
    k = total / sum(b)
    return [round(x * k) for x in b]


med = {k: statistics.median(u['stat'][k] for u in units if u.get('stat')) for k in ('HP', 'ATK', 'DEF', 'SPD')}
# 같은 등급 안에서 본편 강함의 상대 위치(-1 ~ 1)
zrank = {}
for rk in RANK_TOTAL:
    for role in ('공격기', '보호기', '지원기'):  # 지원기는 본편 능력치가 원래 낮아 역할 안에서 순위를 낸다
        ps = sorted((power(u, med), u['key']) for u in units if u['rank'] == rk and u['role'] == role and u.get('stat') and u['key'] not in STARTERS)
        for i, (_, k) in enumerate(ps):
            zrank[k] = (i / max(1, len(ps) - 1)) * 2 - 1
import re as _re
BASE_MOVES = {}
_src = open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read()
for _m in _re.finditer(r"^  (\w+):\s*\{ name: '[^']*', type: '(\w+)', cat: '(\w+)'([^\n]*)\},?$", _src, _re.M):
    _k, _t, _c, _rest = _m.groups()
    _d = {'cat': _c}
    for _f in ('self', 'foe', 'eff'):
        _x = _re.search(_f + r": \{([^}]*)\}", _rest)
        if _x: _d[_f] = {a.strip(): float(b) for a, b in (kv.split(':') for kv in _x.group(1).split(',') if ':' in kv)}
    _h = _re.search(r"heal: ([\d.]+)", _rest)
    if _h: _d['heal'] = float(_h.group(1))
    BASE_MOVES[_k] = _d
moves, species = dict(GENERIC), {}
for u in units:
    elem, fam = elem_of(u), family_of(u)
    for i, s in enumerate(u['skills'][:2], 1):
        moves[f"sig_{u['key']}_{i}"] = sig_move(u, i, s)
    p = passive_move(u)
    if p: moves[f"sig_{u['key']}_3"] = p
    elems = [e for e in dict.fromkeys(x.get('elem') for x in u['skills'][:2]) if e not in (None, 'none')]
    sp = {'types': [u['cls']] + elems, 'moves': tidy(u, learnset(u, elem, fam, bool(p)), moves, elems), 'desc': u['desc']}
    b = base_stats(u, med, zrank.get(u['key'], 0))
    if b: sp['base'] = b
    if u['key'] in LEGENDS: sp['legend'] = True
    species[u['key']] = sp

STAT_WORDS = {'공격': 'atk', '방어': 'def', '속도': 'spd', '명중': 'acc', '적중': 'acc'}
STATUS_WORDS = {'para': ('마비', '감전'), 'burn': ('화상',), 'freeze': ('동결', '빙결시')}
EFF_TEXT = {'foeDef': '상대의 방어를 떨어뜨릴 때가 있다.', 'foeAtk': '상대의 공격을 떨어뜨릴 때가 있다.', 'foeSpd': '상대의 속도를 떨어뜨릴 때가 있다.',
            'foeAcc': '상대의 명중을 떨어뜨릴 때가 있다.', 'burn': '화상을 입힐 때가 있다.', 'freeze': '동결시킬 때가 있다.', 'para': '감전시킬 때가 있다.'}
DESC_FIX = {
    'sig_blackhound_2': 'EMP 탄두 미사일로 상대의 전자 장비를 교란해 방어를 떨어뜨린다.',
    'sig_lemonalpha_2': '케스토스 히마스의 출력을 전개해 상대 회로를 압도한다. 상대의 방어를 떨어뜨릴 때가 있다.',
    'sig_scathy_1': '상대 회로에 과부하를 걸어 장갑 제어를 무너뜨린다. 상대의 방어를 떨어뜨릴 때가 있다.',
    'sig_arachne_2': '전자기 펄스를 펼쳐 상대의 장갑 제어를 흔든다. 상대의 방어를 떨어뜨릴 때가 있다.',
    'sig_ellie_1': '테이저 바늘을 쏘아 상대의 몸을 굳힌다. 상대의 속도를 떨어뜨릴 때가 있다.',
    'sig_alice_2': '미사일을 비처럼 퍼부어 상대 일대를 휩쓴다. 상대의 방어를 떨어뜨릴 때가 있다.',
    'sig_impet_2': '열압력탄을 쏘아 폭압으로 상대를 덮친다. 상대의 방어를 떨어뜨릴 때가 있다.',
    'sig_pa00el_2': '공중에서 소이 폭탄을 쏟아부어 상대 일대를 휩쓴다. 상대의 방어를 떨어뜨릴 때가 있다.',
    'sig_pa00el_3': '하늘을 달리는 기사처럼 급강하하며 폭격하고, 그 기세로 속도가 오른다.',
}
EFFECT_FIX = {'sig_echidna_1': {'drain': 0.3}, 'sig_cyclopseprincess_1': {'drain': 0.3}}  # 설명대로 생기를 빨아들인다
for k, v in EFFECT_FIX.items():
    if k in moves: moves[k].update(v)
for m in moves.values():
    if not m.get('sig') or m.get('cat') != 'atk': continue
    eff = m.get('eff') or {}
    for st, words in STATUS_WORDS.items():
        if st not in eff and any(w in m['desc'] for w in words):
            keep = [x for x in m['desc'].replace('!', '.').split('. ') if x and not any(w in x for w in words)]
            text = '. '.join(x.rstrip('.') for x in keep)
            extra = ' '.join(EFF_TEXT[k] for k in eff if k in EFF_TEXT)
            m['desc'] = ((text + '. ') if text else '') + extra if extra else (text + '.')
# 본편 플레이어 자료가 없는 레모네이드 델타·제타·오메가: 게임 설정(문리버 인형 부대·관측과 효율·챔피언의 절대 명령)으로 만든 고유 기술
HAND = {
    'lemondelta': {
        'moves': {
            'sig_lemondelta_1': {'name': '인형 부대 돌격', 'type': 'air', 'cat': 'atk', 'pow': 30, 'hits': [2, 4], 'acc': 100, 'pp': 20, 'fx': 'slash3', 'desc': '마리오네트 인형 부대를 일제히 날려 보내 2~4회 연달아 할퀸다.'},
            'sig_lemondelta_2': {'name': '질투의 업화', 'type': 'fire', 'cat': 'atk', 'pow': 95, 'acc': 100, 'pp': 10, 'area': 1, 'eff': {'burn': 0.3}, 'fx': 'napalm', 'desc': '질투가 폭발하면 무대가 불바다가 된다. 일대를 태우고 화상을 입힐 때가 있다.'},
            'sig_lemondelta_3': {'name': '무대 의상 교체', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 10, 'self': {'atk': 1, 'spd': 1}, 'heal': 0.2, 'fx': 'buff', 'desc': '최신작 드레스로 갈아입고 무대에 다시 선다. 공격과 속도가 오르고 HP를 조금 회복한다.'},
        },
        'learn': [[1, 'sig_lemondelta_1'], [1, 'dive'], [6, 'afterburn'], [11, 'flamer'], [16, 'sig_lemondelta_2'], [21, 'apierce'], [26, 'incend'], [30, 'sig_lemondelta_3'], [40, 'napalm']],
    },
    'lemonzeta': {
        'moves': {
            'sig_lemonzeta_1': {'name': '관측 사격', 'type': 'elec', 'cat': 'atk', 'pow': 70, 'acc': 100, 'pp': 20, 'eff': {'foeDef': 0.5}, 'fx': 'snipe', 'desc': '위성 관측 자료로 약점을 계산해 쏜다. 상대의 방어를 떨어뜨릴 때가 있다.'},
            'sig_lemonzeta_2': {'name': '효율 연산: 과부하', 'type': 'elec', 'cat': 'atk', 'pow': 95, 'acc': 100, 'pp': 10, 'area': 1, 'eff': {'para': 0.3}, 'fx': 'plasma', 'desc': '최적 출력을 계산해 전류를 한꺼번에 흘려보낸다. 감전시킬 때가 있다.'},
            'sig_lemonzeta_3': {'name': '데이터 수집', 'type': 'phys', 'cat': 'st', 'acc': 95, 'pp': 10, 'foe': {'def': -1}, 'self': {'acc': 1}, 'fx': 'debuff', 'desc': '상대의 움직임을 관측해 기록한다. 상대의 방어가 떨어지고 자신의 명중이 오른다.'},
        },
        'learn': [[1, 'sig_lemonzeta_1'], [1, 'quick'], [6, 'shock'], [11, 'emp'], [16, 'sig_lemonzeta_2'], [21, 'lpierce'], [26, 'plasma'], [30, 'sig_lemonzeta_3'], [40, 'thunder']],
    },
    'lemonomega': {
        'moves': {
            'sig_lemonomega_2': {'name': '오메가 섬멸 포격', 'type': 'heavy', 'cat': 'atk', 'pow': 110, 'acc': 90, 'pp': 5, 'pierce': 1, 'fx': 'beam', 'desc': '모든 포문의 출력을 하나로 모아 꿰뚫는다. 상대의 방어 강화를 무시한다.'},
            'sig_lemonomega_3': {'name': '챔피언의 위엄', 'type': 'phys', 'cat': 'st', 'acc': 0, 'pp': 10, 'self': {'atk': 1, 'spd': 1}, 'fx': 'buff', 'desc': '자매들의 정점에 선 자의 여유로 전장을 내려다본다. 공격과 속도가 오른다.'},
        },
        'learn': [[1, 'order'], [1, 'shell'], [11, 'guard'], [16, 'sig_lemonomega_2'], [21, 'plasma'], [26, 'railgun'], [30, 'sig_lemonomega_3'], [36, 'thunder']],
    },
}
for k, h in HAND.items():
    for mid, m in h['moves'].items():
        m['sig'] = k; moves[mid] = m
    species[k] = {'moves': h['learn']}

for m in moves.values():
    m['desc'] = fix_words(m['desc'])
    if m.get('sig') and m.get('cat') == 'st' and 'self' in m:
        d = m['desc']
        if any(w in d for w in ('오르', '올린', '올라', '높', '끌어올')):
            for w, k in STAT_WORDS.items():
                if w in d and k not in m['self'] and not any(x in d for x in ('상대의 ' + w, '상대 ' + w, '적의 ' + w)):
                    m['self'][k] = 1
for sp in species.values():
    if 'desc' in sp: sp['desc'] = fix_words(sp['desc'])
for k, v in DESC_FIX.items():
    if k in moves: moves[k]['desc'] = v
for m in moves.values():
    if m.get('heal') and '회복' not in m['desc']:
        m['desc'] = m['desc'].rstrip() + (' HP를 조금 회복한다.' if m['heal'] < 0.3 else ' HP를 회복한다.')
out = os.path.join(ROOT, 'js', 'sigmoves.js')
with open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write('// auto-generated by tools/build_sigmoves.py : 본편 스킬을 옮긴 고유 기술, 무기 계열·역할별 습득표, 속성·능력치·도감 설명\n')
    f.write('Object.assign(MOVES, ' + json.dumps(moves, ensure_ascii=False, separators=(',', ':')) + ');\n')
    f.write('const SIG_SPECIES = ' + json.dumps(species, ensure_ascii=False, separators=(',', ':')) + ';\n')
    # js/data.js 에 직접 정의한 고유 기술: 램파리온 전용기와 레모네이드 오메가의 절대 명령
    f.write("for (const k of ['knuckle', 'protect', 'drillknee', 'shining', 'bravefuse', 'heavenhell']) if (MOVES[k]) MOVES[k].sig = 'lamparion';\n")
    f.write("if (MOVES.order) MOVES.order.sig = 'lemonomega';\n")
print('units', len(species), 'moves', len(moves), 'median', {k: round(v, 2) for k, v in med.items()})
