---
name: lao-racket-art
description: 라켓몬스터(라스트 로이드) 프로젝트에서 라스트오리진 캐릭터의 전신 일러스트(도감·전투·대화 그림, 스킨·중파 그림)와 필드 SD 리그를 원본 Unity 에셋으로 만들거나 고치는 방법. 새 캐릭터·스킨 그림 추가, "일러가 깨진다/얼굴이 떠 있다/몸이 두 개다/실루엣으로 나온다/스킨 파츠 겹침", SD가 안 나오거나 파츠가 빠질 때, 전투에서 그림 위치·방향·발사 지점이 어긋날 때, 그림을 바꿨는데 휴대폰에서 예전 그림이 보일 때 반드시 이 스킬을 쓴다. 버그 리포트에 캐릭터 그림 문제가 섞여 있어도 쓴다.
---

# 라켓몬스터 캐릭터 그림·SD 제작

이 프로젝트(`E:\LAO_MINI_GAME\6_LAO_Laket_Monster`)의 캐릭터 그림은 두 종류다.

| 종류 | 결과물 | 만드는 도구 |
|---|---|---|
| 전신 일러스트 | `assets/full/<키>.webp`(기본), `<키>_<n>.webp`(스킨 n단계), `..._dam.webp`(중파), 아이콘 `assets/icon/<키>.webp` | `tools/extract_assets.py`, `tools/extract_forms.py`, `tools/expand_roster.py`, 이 스킬의 `scripts/` |
| 필드 SD 리그 | `js/sd/<키>.js` + 아틀라스 `js/sd/<키>.a50.webp`(데스크톱)·`.a35.webp`(휴대폰), 목록 `js/sd/index.js` | `tools/sdpipe/build_sd.py`, `tools/sdpipe/unity_ref/` |

원본 위치:
- 최신 전신 그림: `E:/LAO/1_Onestre_QA/Assets/AssetBundleResourceSub/Texture/FullbodyImg` (Google_QA보다 파일이 많다. 먼저 여기를 본다)
- SD 프리팹·클립: `E:/LAO_Google_QA/Assets` (`build_sd.py`의 `ROOT`), Puppet2D: `E:/LAO/Google_QA_6.0/Assets/Libs/Puppet2D`
- Unity: `C:/Program Files/Unity/Hub/Editor/6000.0.58f2/Editor/Unity.exe`
- 원작 이름·스킬·대사: `lo.swaytwig.com/units/<모델명>` (예: `BR_Lindwurm`). 공식 한글 이름은 스킨 이름(`js/skinnames.js`)이나 합류 대사에서 확인한다. 예: 린트블룸.

캐릭터 키 ↔ 원본 모델명: 기본 로스터는 `tools/extract_assets.py`의 `UNITS`, 확장 로스터는 `js/rosterdata.js`의 `sourceId`(`Char_BR_NightAngel_N` → 줄기 `BR_NightAngel`), SD는 `build_sd.py`의 `UNITS`.

## 1. 전신 일러스트

### 원본 고르는 순서
1. `FullbodyIMG_<줄기>_N.png` 한 장짜리. 가장 깨끗하다.
2. 스킨은 `FullbodyIMG_<줄기>_NS<k>.png`. 없으면 부품 `..._NS<k>_part1.png, part2 ...`을 합성한다.
3. `2DModel_<줄기>_N.png`는 마지막 수단이다. 이 텍스처는 움직이는 2D 모델용 아틀라스라서 **표정 교체용 얼굴, 자세 교체용 팔·몸통이 같은 장에 들어 있고**(나이트 앤젤의 떠 있는 얼굴, 스카디의 여분 몸통), 일부는 **검은 실루엣**이다(사이클롭스 프린세스). 한 번 이걸로 37종을 만들었다가 버그 리포트가 왔다. 1번이 있으면 1번으로 바꾼다.

### 부품 합성 규칙
- part1이 맨 앞(인물), 번호가 클수록 뒤 레이어다. 역순으로 깐다(`tools/extract_forms.py`의 `compose`).
- 2048x2048이 아닌 부품(2560x1440 방 배경 등)은 넣지 않는다.
- part1 안에도 배경용 조각이 섞여 있을 수 있다. 창문 빛 판(레오나 NS4, 홍련 NS2)이나 여분 무기 조각(사이클롭스 프린세스 오른쪽 끝)이 그런 예다. 떨어진 조각을 연결 성분으로 찾아 지운다.
- 한 장에 인물과 확대 컷(타원으로 잘린 장면)이 같이 있는 경우도 있다. 흐레스벨그 수영복 NS2가 그렇다. 이때는 필요한 성분만 남긴다(part1은 오른쪽 인물만, part2는 왼쪽 위 조각을 지움).
- 마무리: 알파 경계(8 초과)로 자르고, 긴 변 720, WEBP 품질 86.

도구:
```bash
# 원본으로 다시 만들기 (첫 원본이 맨 앞 레이어)
python .claude/skills/lao-racket-art/scripts/rebuild_full.py nightangel FullbodyIMG_BR_NightAngel_N.png
python .claude/skills/lao-racket-art/scripts/rebuild_full.py cyclopseprincess FullbodyIMG_PECS_CyclopsePrincess_N.png --strip-x 1760
python .claude/skills/lao-racket-art/scripts/rebuild_full.py leona_3 FullbodyIMG_BR_Leona_NS4_part1.png --strip-x 1600
```
```bash
# 전체 점검: 실루엣·떨어진 조각이 있는 그림 목록과 모음 이미지
python .claude/skills/lao-racket-art/scripts/scan_full.py --sheet <스크래치패드>/scan.png
```
점검 결과의 떨어진 조각은 무기·드론·이펙트·소품처럼 정상인 경우가 대부분이다. 모음 이미지를 직접 보고, 인물과 상관없는 판·여분 신체·교체용 얼굴만 고친다. 바꾸기 전 그림은 스크래치패드에 복사해 두고 전/후 모음 이미지로 비교한다.

### 그림을 바꾼 뒤 꼭 같이 고칠 것
같은 파일 이름으로 그림을 바꾸면 아래를 빠뜨리기 쉽다. 하나라도 빠지면 위치가 어긋나거나 예전 그림이 보인다.

1. **캐시 번호**: `js/formsextra.js`의 `Object.assign(ASSET_REV, {...})`에서 `"full/<키>"` 값을 1 올린다(없으면 2로 추가). 주소에 `?r=` 번호가 붙어서, 이 값을 안 올리면 휴대폰과 브라우저가 예전 그림을 계속 쓴다. `js/core.js`에도 기본 표가 있다.
2. **크기 표**: 그림 크기가 바뀌면 `js/assetsizes.js`(`ASSET_SIZES`, 기본 그림), `js/forms.js` / `js/formsextra.js`(`FORM_SIZES`, 스킨 그림)에서 그 키의 `[가로, 세로]`를 새 값으로 바꾼다.
3. **전투 발사 지점**: `tools/attack-anchor-profiles.json`의 `emit`은 그림 안의 비율 좌표다. 새 그림에 표시해 보고(총구·손·칼끝) 고친 뒤 `python tools/build_attack_anchors.py` → `js/battleanchor-data.js`. 이 JSON은 줄 끝이 CRLF라서 파이썬으로 쓰면 CRLF를 되살린다.
4. **방향**: 얼굴·몸이 한쪽을 보면 `js/facing.js`의 `FACING`에 `"<키>": "L"|"R"`. 전투에서 상대를 보도록 뒤집는 데 쓴다.
5. **전투 위치 미세 조정**: `js/battleanchors.js`의 `ART_NUDGE = { 키: [가로비율, 세로비율] }`(예: 타이런트 `[-0.08, 0.06]`은 왼쪽 아래로).
6. 사용자가 직접 준 그림은 덮어쓰지 않는다. `git log -- assets/full/<키>.webp`에 "사용자가 준"이 있으면 건드리기 전에 묻는다(예: LRL).

## 2. 필드 SD 리그

1. `tools/sdpipe/build_sd.py`의 `UNITS`에 `"<키>": "<모델명>"`을 넣는다(예: `"amy": "BR_Amy_N"`). 스킨 리그는 모델명에 스킨을 쓴다(램파리온 = `AGS_Rampart_NS1`). 동작을 바꾸려면 `CLIP_OVERRIDE`(램파리온은 걷기 대신 `move2` 비행)를 쓴다.
2. **Unity 메시를 먼저 뽑는다.** 메시가 없으면 `tools/sdpipe/lab/fbx`의 FBX 근사로 만들어지는데, 스킨 파츠가 뼈에서 멀리 떨어져 안전장치에 걸려 빠진다(머리카락·날개 없음 같은 증상).
   ```bash
   python tools/sdpipe/unity_ref/setup.py <키> [<키> ...]
   cp tools/sdpipe/unity_ref/Mesh.cs tools/sdpipe/unity_ref/proj/Assets/Editor/RefMesh.cs   # setup.py는 Dump·Render만 복사한다
   "C:/Program Files/Unity/Hub/Editor/6000.0.58f2/Editor/Unity.exe" -batchmode -nographics -quit -projectPath <절대경로>/tools/sdpipe/unity_ref/proj -executeMethod RefMesh.Run -logFile <절대경로>/tools/sdpipe/unity_ref/mesh.log
   ```
   `tools/sdpipe/unity_ref/proj/mesh/<키>.json`이 생겼는지 확인한다. Unity는 오래 걸리니 백그라운드로 돌린다.
3. `python tools/sdpipe/build_sd.py <키> ...` → `js/sd/<키>.js`, `.a50.webp`, `.a35.webp`.
4. `js/sd/index.js`의 `window.SD_LIST`에 키를 넣는다(빌드 도구가 자동으로 고치지 않는다).
5. 확인: 미리보기에서 필드에 세워 본다(아래 "게임에서 확인"). 화면이 안 보일 때는 `python tools/sd_server.py`(8792)를 띄우고, 페이지에서 그린 PNG를 `POST /save?name=…`로 보내면 `tools/sd_out/`에 저장된다. 그 PNG를 열어 본다.

## 3. 게임에서 확인

`.claude/launch.json`에 작업 폴더를 띄우는 설정(`racketmon-wt`, 8796)을 쓴다. 메인 폴더용(`racketmon`, 8791)과 헷갈리지 않는다. 페이지를 연 뒤 콘솔에서:
```js
World.load('nest', 10, 26, 'down'); Scene = World; World.locked = false;   // 원하는 지도로 바로 이동
Game.flags.resortRed = 1;                                                   // 이야기 진행 깃발을 켜서 상태 재현
```
그림은 도감·전투 화면에서 직접 보거나, 파일을 PIL로 배경 위에 합성해 모음 이미지로 본다. 스크린샷은 압축 때문에 색이 밝게 보일 수 있다. 색을 판단할 때는 캔버스 픽셀(`getImageData`)을 읽는다.

## 4. 작업 습관 (이 프로젝트에서 실제로 문제가 됐던 것)
- 메인 폴더는 편집이 막혀 있다. 작업 폴더에서 고치고 커밋한 뒤 `git -C E:/LAO_MINI_GAME/6_LAO_Laket_Monster merge --ff-only <작업 브랜치>`로 메인을 앞으로 당긴다. 메인이 앞서 있으면 먼저 작업 폴더로 `merge --ff-only main`.
- `js/data.js`, `league.js`, `game.js`, `world.js`, `battle.js`, `roster.js`는 줄 끝이 CRLF다. `sed -i`를 쓰지 않는다. 편집 도구나 파이썬 바이너리 치환을 쓰고, 저장 뒤 `\r\n` 개수가 줄 수와 같은지 확인한다.
- 바탕화면 등 다른 폴더의 PDF 버그 리포트는 `pymupdf`로 페이지를 이미지로 렌더해서 읽는다(`pdftoppm`이 없다).
- 푸시는 사용자가 그 세션에서 "푸시해"라고 할 때만 한다. 푸시할 때는 `js/game.js`의 `GAME_VERSION`, `index.html`의 `<title>`과 모든 `?v=` 번호를 올리고, `js/patchnotes.js` 맨 위에 그 버전 항목을 플레이어 말투로 넣는다.
