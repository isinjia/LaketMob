# Battle effect review - 2026-10-17

Result: 92/100, self-assessment of battle effect presentation only.

| Criterion | Score | Evidence and limits |
| --- | --- | --- |
| Origins | 32/35 | 313 image profiles reviewed; final annotated pass over 171 focus poses corrected another 43 profiles. Fixed artwork cannot physically re-aim its weapons. |
| Transform alignment | 25/25 | 626 comparisons against actual Canvas draw matrices, both sides, movement, scale, recoil and outer zoom/translation; maximum error under 0.000105px. |
| Timing/contact | 18/20 | Opposite-direction shot impacts follow 115ms travel, endpoint error zero; barrage projectiles and explosions share destinations. Area effects intentionally spread. |
| Motion/readability | 8/10 | Small flashes, short tracers, approach/contact/return, perspective scaling and top margin; static poses limit animation. |
| Compatibility | 9/10 | 104 effect executions: 26 types, both directions, WebGL and Canvas fallback. Portrait browser smoke passes; physical phone testing unavailable. |

Implementation: separate gun/blade/mouth/focus landmarks per image including skins; shared sprite/socket transform for flip, feet offset, scale, bob, recoil and movement. Self effects use body anchors. Static landmarks add about 23KB and no textures or full-size pixel scans on phones. Melee restores position/scale and shadows follow movement.

Verification:
- effectcheck.cjs: 626 geometry checks, no failures or missing images; melee distances 42.60 / 42.25px; shot timing 0.132 / 0.1344 simulation seconds, exact endpoints; 52 WebGL plus 52 Canvas effect executions; no page errors. Position/scale restoration checked after every effect.
- effectvisual.cjs: rendered gun pairs, Khan muzzle, Gnome hand, Habetrot device, Eternity hand, raised-hand poses, both-side melee and 390x844 portrait battle. Final melee bounds: top 23.77 / 147.43px, bottom 323.77 / 447.43px. No page errors.
- Existing mobile/roster smoke: 196 unique species, valid moves/stats, all 316 expanded assets; no eager loading of expanded portraits; context talk, legacy button selection, rotation, dex paging and Khan battle entry pass without errors.
- Syntax and whitespace checks pass. Landmark rebuild reports 313 entries and no alpha correction exceeding 8% of image dimensions. Alpha contact does not prove semantic muzzle correctness; source positions were also visually reviewed.
- Two concurrent browser smoke runs timed out at boot; sequential reruns passed. No game error reproduced in successful reruns.

Reproduce: serve repository over HTTP and run node tools/effectcheck.cjs or node tools/effectvisual.cjs using Playwright with Chrome. GAME_URL defaults to http://127.0.0.1:8792/; PLAYWRIGHT_MODULE optionally specifies module path; EFFECT_OUTPUT optionally selects the screenshot directory. Rebuild metadata with python tools/build_attack_anchors.py. Review screenshots default to the system temporary directory.

This score is a visual judgment, not a whole-game rating, an independent review or a measured phone performance score.
