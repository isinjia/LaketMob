# -*- coding: utf-8 -*-
"""라켓몬스터 에셋 추출기
라스트오리진 Unity 프로젝트(E:/LAO/Google_QA/Assets)에서 게임에 필요한 이미지/사운드만 골라
웹용으로 경량화(webp / mp3)하여 ../assets 아래로 복사한다.

사용법:  python tools/extract_assets.py
"""
import os, sys, subprocess, shutil
from PIL import Image

SRC = "E:/LAO/Google_QA/Assets"
FB = SRC + "/AssetBundleResourceSub/Texture/FullbodyImg"
IC = SRC + "/AssetBundleResource/Texture/PCInvenIcon"
VO = SRC + "/AssetBundleResource/Sounds/Voice"
BGM = SRC + "/AssetBundleResource/Sounds/BGM"
SFX = SRC + "/AssetBundleResource/Sounds/SFX"
BGI = SRC + "/AssetBundleResource/Texture/BGImg"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")

# key : (fullbody file, icon file or None, voice folder or None)
UNITS = {
    # ---- 포획 가능한 바이오로이드 / AGS ----
    "brownie": ("FullbodyIMG_BR_Brownie_N.png", "InvenIcon_BR_Brownie_N.png", "Brownie"),
    "leprechaun": ("FullbodyIMG_BR_Leprechaun_N.png", "InvenIcon_BR_Leprechaun_N.png", "Leprechaun"),
    "leona": ("FullbodyIMG_BR_Leona_N.png", "InvenIcon_BR_Leona_N.png", "Leona"),
    "valkyrie": ("FullbodyIMG_BR_Valkyrie_N.png", "InvenIcon_BR_Valkyrie_N.png", "Valkyrie"),
    "phantom": ("FullbodyIMG_BR_Phantom_N.png", "InvenIcon_BR_Phantom_N.png", "Phantom"),
    "miho": ("FullbodyIMG_BR_Miho_N.png", "InvenIcon_BR_Miho_N.png", "Miho"),
    "bloodypanther": ("FullbodyIMG_BR_BloodyPanther_N.png", "InvenIcon_BR_BloodyPanther_N.png", "BloodyPanther"),
    "impet": ("FullbodyIMG_BR_Impet_N.png", "InvenIcon_BR_Impet_N.png", "Impet"),
    "hyena": ("FullbodyIMG_BR_Hyena_N.png", "InvenIcon_BR_Hyena_N.png", "Hyena"),
    "gremlin": ("FullbodyIMG_BR_Gremlin_N.png", "InvenIcon_BR_Gremlin_N.png", "Gremlin"),
    "perrault": ("FullbodyIMG_3P_CSPerrault_N.png", "InvenIcon_3P_CSPerrault_N.png", "CSPerrault"),
    "alice": ("FullbodyIMG_3P_Alice_N.png", "InvenIcon_3P_Alice_N.png", "Alice"),
    "nymph": ("FullbodyIMG_BR_Nymph_N.png", "InvenIcon_BR_Nymph_N.png", "Nymph"),
    "daika": ("FullbodyIMG_BR_Daika_N.png", "InvenIcon_BR_Daika_N.png", "Daika"),
    "blackhound": ("FullbodyIMG_BR_Blackhound_N.png", "InvenIcon_BR_Blackhound_N.png", "Blackhound"),
    "gnome": ("FullbodyIMG_BR_Gnome_N.png", "InvenIcon_BR_Gnome_N.png", "Gnome"),
    "bulgasari": ("FullbodyIMG_BR_Bulgasari_N.png", "InvenIcon_BR_Bulgasari_N.png", "Bulgasari"),
    "spriggan": ("FullbodyIMG_BR_Spriggan_N.png", "InvenIcon_BR_Spriggan_N.png", "Spriggan"),
    "undine": ("FullbodyIMG_BR_Undine_N.png", "InvenIcon_BR_Undine_N.png", "Undine"),
    "tyrant": ("FullbodyIMG_AGS_Tyrant_N.png", "InvenIcon_AGS_Tyrant_N.png", "Tyrant"),
    "rampart": ("FullbodyIMG_AGS_Rampart_N.png", "InvenIcon_AGS_Rampart_N.png", "Rampart"),
    "gigantes": ("FullbodyIMG_AGS_Gigantes_N.png", "InvenIcon_AGS_Gigantes_N.png", "Gigantes"),
    "goltarion": ("FullbodyIMG_AGS_Goltarion_N.png", "InvenIcon_AGS_Goltarion_N.png", "Goltarion"),
    "echidna": ("FullbodyIMG_BR_Echidna_N.png", "InvenIcon_BR_Echidna_N.png", "Echidna"),
    "efreeti": ("FullbodyIMG_BR_Efreeti_N.png", "InvenIcon_BR_Efreeti_N.png", "Efreeti"),
    "cheona": ("FullbodyIMG_BR_Cheona_N.png", "InvenIcon_BR_Cheona_N.png", "Cheona"),
    "harpy": ("FullbodyIMG_BR_Harpy_N.png", "InvenIcon_BR_Harpy_N.png", "Harpy"),
    "hraesvelgr": ("FullbodyIMG_BR_Hraesvelgr_N.png", "InvenIcon_BR_Hraesvelgr_N.png", "Hraesvelgr"),
    "lindwurm": ("FullbodyIMG_BR_Lindwurm_N.png", "InvenIcon_BR_Lindwurm_N.png", "Lindwurm"),
    "talonfeather": ("FullbodyIMG_BR_TalonFeather_N.png", "InvenIcon_BR_TalonFeather_N.png", "TalonFeather"),
    "sylphid": ("FullbodyIMG_BR_Sylphid_N.png", "InvenIcon_BR_Sylphid_N.png", "Sylphid"),
    "phoenix": ("FullbodyIMG_BR_Phoenix_N.png", "InvenIcon_BR_Phoenix_N.png", "Phoenix"),
    "pixie": ("FullbodyIMG_BR_Pixie_N.png", "InvenIcon_BR_Pixie_N.png", "Pixie"),
    "roc": ("FullbodyIMG_AGS_Roc_N.png", "InvenIcon_AGS_Roc_N.png", "Roc"),
    "fafnir": ("FullbodyIMG_BR_Fafnir_N.png", "InvenIcon_BR_Fafnir_N.png", "Fafnir"),
    "hongryun": ("FullbodyIMG_BR_HongRyun_N.png", "InvenIcon_BR_HongRyun_N.png", "HongRyun"),
    "blacklilith": ("FullbodyIMG_3P_BlackLilith_N.png", "InvenIcon_3P_BlackLilith_N.png", "BlackLilith"),
    "eternity": ("FullbodyIMG_3P_Eternity_N.png", "InvenIcon_3P_Eternity_N.png", "Eternity"),
    # ---- 철충 / 적 ----
    "stalker": ("FullbodyIMG_MP_Stalker_N.png", None, None),
    "nightchick": ("FullbodyIMG_MP_NightChick_N.png", None, None),
    "kidnapper": ("FullbodyIMG_MP_Kidnapper_N.png", None, None),
    "speaker": ("FullbodyIMG_MP_Speaker_N.png", None, None),
    "parasite": ("FullbodyIMG_MP_Metal_Parasite_N.png", None, None),
    "robert": ("FullbodyIMG_MP_Robert_N.png", None, None),
    "rocc": ("FullbodyIMG_MP_RocC_N.png", None, None),
    "metalguard": ("2DModel_MP_MetalGuard.png", None, None),
    "ironprince": ("2DModel_MP_IronPrince_N.png", None, None),
    "azazelalter": ("FullbodyIMG_MP_AzazelAlter_N.png", None, None),
    "lemonbeta": ("FullbodyIMG_PECS_LemonadeBeta_N.png", "InvenIcon_PECS_LemonadeBeta_N.png", "LemonadeBeta"),
    "lemonzeta": ("FullbodyIMG_MP_LemonadeZeta_N.png", None, None),
    "lemonomega": ("FullbodyIMG_MP_LemonadeOmega_N.png", None, None),
    # ---- NPC / 트레이너 ----
    "labiata": ("FullbodyIMG_3P_Labiata_N.png", "InvenIcon_3P_Labiata_N.png", "Labiata"),
    "daphne": ("FullbodyIMG_3P_Daphne_N.png", "InvenIcon_3P_Daphne_N.png", "Daphne"),
    "vanilla": ("FullbodyIMG_3P_Vanilla_N.png", "InvenIcon_3P_Vanilla_N.png", "Vanilla"),
    "constantia": ("FullbodyIMG_3P_ConstantiaS2_NS0.png", "InvenIcon_3P_ConstantiaS2_N.png", "ConstantiaS2"),
    "audrey": ("FullbodyIMG_PECS_Audrey_N.png", "InvenIcon_PECS_Audrey_N.png", "Audrey"),
    "emily": ("FullbodyIMG_BR_Emily_N.png", "InvenIcon_BR_Emily_N.png", "Emily"),
    "alvis": ("FullbodyIMG_BR_Alvis_N.png", "InvenIcon_BR_Alvis_N.png", "Alvis"),
    "amy": ("FullbodyIMG_BR_Amy_N.png", "InvenIcon_BR_Amy_N.png", "Amy"),
    "darkelf": ("FullbodyIMG_PECS_DarkElf_N.png", "InvenIcon_PECS_DarkElf_N.png", "DarkElf"),
    "highelven": ("FullbodyIMG_PECS_HighElven_N.png", "InvenIcon_PECS_HighElven_N.png", "HighElven"),
    "calista": ("FullbodyIMG_BR_Calista_N.png", "InvenIcon_BR_Calista_N.png", "Calista"),
    "raven": ("FullbodyIMG_BR_Raven_N.png", "InvenIcon_BR_Raven_N.png", "Raven"),
    "kheshig": ("FullbodyIMG_BR_Kheshig_N.png", "InvenIcon_BR_Kheshig_N.png", "Kheshig"),
    "mariagrace": ("FullbodyIMG_BR_MariaGrace_N.png", "InvenIcon_BR_MariaGrace_N.png", "MariaGrace"),
    "tomoe": ("FullbodyIMG_BR_Tomoe_N.png", "InvenIcon_BR_Tomoe_N.png", "Tomoe"),
    "fortune": ("FullbodyIMG_PECS_Fortune_N.png", "InvenIcon_PECS_Fortune_N.png", "Fortune"),
    "merlin": ("FullbodyIMG_PECS_Merlin_N.png", "InvenIcon_PECS_Merlin_N.png", "Merlin"),
    "draculina": ("FullbodyIMG_PECS_Draculina_N.png", "InvenIcon_PECS_Draculina_N.png", "Draculina"),
    "sekhmet": ("FullbodyIMG_PECS_Sekhmet_N.png", "InvenIcon_PECS_Sekhmet_N.png", "Sekhmet"),
    "johanna": ("FullbodyIMG_DS_Johanna_N.png", "InvenIcon_DS_Johanna_N.png", "Johanna"),
    "atalanta": ("FullbodyIMG_DS_Atalanta_N.png", "InvenIcon_DS_Atalanta_N.png", "Atalanta"),
    "poi": ("FullbodyIMG_3P_Poi_N.png", "InvenIcon_3P_Poi_N.png", "Poi"),
    "rhea": ("FullbodyIMG_3P_Rhea_N.png", "InvenIcon_3P_Rhea_N.png", "Rhea"),
    "fenrir": ("FullbodyIMG_3P_Fenrir_N.png", "InvenIcon_3P_Fenrir_N.png", "Fenrir"),
    "snowfeather": ("FullbodyIMG_3P_SnowFeather_N.png", "InvenIcon_3P_SnowFeather_N.png", "SnowFeather"),
    "thetis": ("FullbodyIMG_BR_Thetis_N.png", "InvenIcon_BR_Thetis_N.png", "Thetis"),
    "shirayuri": ("FullbodyIMG_BR_Shirayuri_N.png", "InvenIcon_BR_Shirayuri_N.png", "Shirayuri"),
}

# 아이콘이 없는 캐릭터의 얼굴 크롭 영역 (트림된 이미지 기준 비율: cx, cy, size)
FACE_CROP = {
    "lemonzeta": (0.50, 0.10, 0.20),
    "lemonomega": (0.50, 0.075, 0.16),
}

VOICE_TAGS = {"start": ["StageStart", "BattleFocus", "SortiePick"], "join": ["_Join", "SquadJoin"],
              "retreat": ["Retreat"], "mvp": ["MVP", "ActionApprove"], "talk": ["Login", "ActionApprove", "Idle_01_01"]}

# 철충 울음소리 (src relative to SFX, out name)
ENEMY_CRIES = {
    "stalker": ["Enemy/Stalker/enemy_04_idle.wav", "Enemy/Stalker/enemy_04_death_01.wav"],
    "nightchick": ["Enemy/NightChick/enemy_01_skill2.wav", "Enemy/BigChick/enemy_02_skill1.wav"],
    "kidnapper": ["Enemy/Kidnapper/enemy_06_skill1.wav", "Enemy/Kidnapper/enemy_06_death_01.wav"],
    "speaker": ["Enemy/UnderWatcher/enemy_12-1_skill1_01.wav", "Enemy/UnderWatcher/enemy_12-1_death.wav"],
    "parasite": ["Enemy/Predator/enemy_07_roar.wav", "Enemy/Predator/enemy_07_death_01.wav"],
    "robert": ["Enemy/Raider/enemy_11_morph_01.wav", "Enemy/Raider/enemy_11_death_01.wav"],
    "rocc": ["Enemy/Harvester/enemy_08_skill1.wav", "Enemy/Harvester/enemy_08_death.wav"],
    "metalguard": ["Enemy/BlackKnight/enemy_14_skill1_01.wav", "Enemy/BlackKnight/enemy_14_death_02.wav"],
    "ironprince": ["dragon/mob_bos1124_act_a1.mp3", "Enemy/Raider/enemy_11_death_FULL.wav"],
    "azazelalter": ["Common/magic/dark_wind_growls_04.wav", "Common/magic/fear_confuse_horror_spell_01.wav"],
    "lemonzeta": ["Enemy/LemonadeZeta/Voice_PECS_LemonadeZeta_N_SpSkill_2.mp3", "Enemy/LemonadeZeta/Voice_PECS_LemonadeZeta_N_ch_SpSkill_2_1.mp3"],
}

BGMS = {
    "title": "01 BGM_Title.mp3",
    "town": "SW12_JandiCamp_Town.mp3",
    "base": "02 BGM_Lobby.mp3",
    "route": "19 BGM_Summer_01.mp3",
    "forest": "18 BGM_Forest_of_Elves.mp3",
    "coast": "SW02_Dipluce Horizon District.mp3",
    "nest": "21 BGM_Thrill_01.mp3",
    "center": "07 BGM_Talk_01.mp3",
    "wild": "03 BGM_Battle_01.mp3",
    "trainer": "05 BGM_Battle_02.mp3",
    "boss": "04 BGM_Battle_Boss_01.mp3",
    "final": "73 BGM_Zeta Boss.mp3",
    "legend": "31 BGM_Battle_Boss_03.mp3",
    "intro": "25 BGM_Mystic.mp3",
    "ending": "36 BGM_WithYou_01.mp3",
    "lab": "26 BGM_Talk_06.mp3",
}

SFXS = {
    "confirm": "UI/pick_basic.wav",
    "levelup": "UI/Rank_UP.mp3",
    "catch": "UI/generate_S.wav",
    "catch_ss": "UI/pick_SS.wav",
    "encounter": "UI/Trainsition_in.wav",
    "door": "UI/Trainsition_out.wav",
    "battle_start": "UI/battle_start.wav",
    "win_jingle": "UI/battle_win_music.wav",
    "win_sfx": "UI/battle_win_sfx.wav",
    "heal": "UI/Reinforce_unit.wav",
    "buy": "UI/item_purchase.wav",
    "coin": "UI/collect_coin_03.wav",
    "save": "UI/stage_clear.wav",
    "item_get": "UI/Character_Item_Complete_SFX.wav",
    "badge": "UI/Rank_UP_SS.mp3",
    "stage_in": "UI/stage_in.wav",
    "warning": "UI/Warning_infinite.wav",
    "like": "UI/Likeability_up-1.wav",
    "hit_phy": "Common/Hit/Common/hit_Phy_mid-1.wav",
    "hit_phy_big": "Common/Hit/Common/hit_Phy_big-1.wav",
    "hit_gun": "Common/Hit/Common/hit_Gun_mid-1.wav",
    "hit_gun_big": "Common/Hit/Common/hit_Gun_Big-1.wav",
    "hit_fire": "Common/Hit/Common/hit_common_fire_2.wav",
    "hit_ice": "Common/Hit/Common/hit_common_ice_2.wav",
    "hit_elec": "Common/Hit/Common/hit_common_electric_2.wav",
    "hit_slash": "Common/Hit/Common/hit_common_slasl_2.wav",
    "hit_smash": "Common/Hit/Common/hit_common_smash_2.wav",
    "hit_robot": "Common/Hit/Robot/hit_robot_phy_big.wav",
    "atk_rifle": "Common/Atk/Shot/atk_Rifle-1.wav",
    "atk_laser": "Common/Atk/Energy/atk_Beam1.wav",
    "atk_elec": "Common/Atk/Energy/atk_elec.wav",
    "atk_energy": "Common/Atk/Energy/atk_energy.wav",
    "atk_light": "Common/Atk/Energy/atk_light.wav",
    "atk_quake": "Common/Atk/Energy/atk_earthquake.wav",
    "atk_swing": "Common/Atk/Swing/CHR_SW_At_Act_Sword_ML_7.mp3",
    "explosion": "Common/Explosion/explosion_mid.wav",
    "explosion_big": "Common/Explosion/explosion_big.wav",
    "fireball": "Common/magic/fireball_blast_03.wav",
    "flame": "Common/magic/fire_burner_01.mp3",
    "shine": "Common/magic/shine_spell_02.wav",
    "charge": "Common/magic/conjure_charge2_03.wav",
    "whoosh": "Common/magic/whoosh_spell_03.wav",
    "ice": "effect/ice_effect.wav",
    "spark": "Common/sci-fi_spark_electric_device_active_03.wav",
    "shield": "Common/sci-fi_shield_power_on_impact_02.wav",
    "lightning": "Common/elec_lightning_magic_spell_11.wav",
    "shake": "Common/shake.wav",
    "rise": "Common/effectRise.wav",
    "snap": "Common/HUMAN-SNAP-FINGERS.mp3",
    "cloth": "Common/foley_cloth_light_fast_movement_05.wav",
    "water": "Common/water/Water_small.wav",
    "question": "comedy/QuestionMark.wav",
    "footstep": "Common/Move/Walk/footstep_grass_run_08.wav",
}

BGS = {
    "base": "BG_Lobby.png", "route": "BG_7_1.png", "forest": "BG_EV_jungle.png", "town": "BG_EV_05_startcity.png",
    "coast": "BG_CoastCity.png", "cliff": "BG_Cliff.png", "nest": "BG_Ruin.png", "nightcliff": "BG_CliffNight.png",
    "lighttower": "BG_LightTower.png", "hangar": "BG_SubmarineHangar.png", "camp": "BG_Camp1.png", "beach": "BG_EV_beach.png",
    "sky": "BG_Sky_01.png", "hospital": "BG_Hospital01.png", "px": "BG_PX_01.png",
}


def ff(src, dst, args):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst):
        return
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src] + args + [dst])
    if r.returncode:
        print("ffmpeg fail", src)


def find_voice(folder, tags):
    d = os.path.join(VO, folder)
    if not os.path.isdir(d):
        return None
    files = sorted(f for f in os.listdir(d) if f.endswith(".mp3"))
    for t in tags:
        for f in files:
            if t in f:
                return os.path.join(d, f)
    return None


def trim(im):
    a = im.split()[-1]
    bb = a.point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def main():
    os.makedirs(OUT, exist_ok=True)
    for sub in ("full", "icon", "voice", "bgm", "sfx", "bg"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)

    sizes = {}
    for key, (fb, ic, vo) in UNITS.items():
        dst = os.path.join(OUT, "full", key + ".webp")
        im = None
        if not os.path.exists(dst) or (ic is None and not os.path.exists(os.path.join(OUT, "icon", key + ".webp"))):
            im = trim(Image.open(os.path.join(FB, fb)).convert("RGBA"))
            full = im.copy()
            full.thumbnail((720, 720), Image.LANCZOS)
            full.save(dst, "WEBP", quality=86, method=6)
        full = Image.open(dst)
        sizes[key] = full.size
        idst = os.path.join(OUT, "icon", key + ".webp")
        if not os.path.exists(idst):
            if ic:
                Image.open(os.path.join(IC, ic)).convert("RGBA").save(idst, "WEBP", quality=90)
            else:
                if im is None:
                    im = trim(Image.open(os.path.join(FB, fb)).convert("RGBA"))
                w, h = im.size
                cx, cy, s = FACE_CROP.get(key, (0.5, 0.5, 0.0))
                if s == 0.0:  # 철충: 전체를 정사각형으로 맞춤
                    side = max(w, h)
                    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
                    sq.paste(im, ((side - w) // 2, (side - h) // 2))
                else:
                    side = int(h * s)
                    x0 = int(w * cx - side / 2); y0 = int(h * cy - side / 2)
                    sq = im.crop((x0, y0, x0 + side, y0 + side))
                sq = sq.resize((126, 126), Image.LANCZOS)
                sq.save(idst, "WEBP", quality=90)
        if vo:
            for tag, cands in VOICE_TAGS.items():
                src = find_voice(vo, cands)
                if src:
                    ff(src, os.path.join(OUT, "voice", "%s_%s.mp3" % (key, tag)), ["-ac", "1", "-b:a", "64k"])
        if key in ENEMY_CRIES:
            for i, rel in enumerate(ENEMY_CRIES[key]):
                tag = "start" if i == 0 else "retreat"
                ff(os.path.join(SFX, rel), os.path.join(OUT, "voice", "%s_%s.mp3" % (key, tag)), ["-ac", "1", "-b:a", "64k", "-t", "3.5"])
        print("unit", key, sizes[key])

    for k, f in BGMS.items():
        ff(os.path.join(BGM, f), os.path.join(OUT, "bgm", k + ".mp3"), ["-b:a", "112k"])
    for k, f in SFXS.items():
        ff(os.path.join(SFX, f), os.path.join(OUT, "sfx", k + ".mp3"), ["-ac", "1", "-b:a", "96k", "-t", "6"])
    for k, f in BGS.items():
        dst = os.path.join(OUT, "bg", k + ".jpg")
        if not os.path.exists(dst):
            Image.open(os.path.join(BGI, f)).convert("RGB").resize((1280, 720), Image.LANCZOS).save(dst, "JPEG", quality=84)

    # 이미지 크기 표 (JS에서 레이아웃 계산용)
    with open(os.path.join(OUT, "..", "js", "assetsizes.js"), "w", encoding="utf-8") as fp:
        fp.write("// auto-generated by tools/extract_assets.py\nconst ASSET_SIZES = {\n")
        for k, (w, h) in sizes.items():
            fp.write('  %s: [%d, %d],\n' % (k, w, h))
        fp.write("};\n")
    print("done")


if __name__ == "__main__":
    main()
