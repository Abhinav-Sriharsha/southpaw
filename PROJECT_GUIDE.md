# South Paw: project guide

This guide explains what every folder and file does, how they fit together, and where to go for the changes you are most likely to make. Read the first two sections once; after that, use the file sections and the "Common tweaks" list as a reference.

---

## 1. How the game is put together

**No build step.** `game/index.html` loads plain JavaScript files one after another with `<script>` tags. There is nothing to compile: edit a file, reload the page.

**One shared scope.** The files are classic scripts, not modules. Anything a file declares at the top level (`const`, `let`, `function`) can be used by every file loaded after it. That means:

- **Order matters.** A file can only use things from files above it in `index.html` while it is loading. Functions called later (by events or the frame loop) can live in any file.
- **Names must be unique across the whole game.** Two files declaring the same top-level name stop the game from loading. If you add a helper, give it a specific name.

**Load order** (as listed at the bottom of `game/index.html`):

1. Libraries from the internet: three.js (3D) and PeerJS (online).
2. `data/` (config, rules, CPU levels, fighter looks, sound list).
3. `assets/anim/clips.js` (the animation data).
4. `src/` files, from basic helpers up to the frame loop, then `src/main.js` starts everything.

**Two halves: the fight sim and the presentation.**

- **The fight sim** (`src/sim/`, plus `src/anim/clips.js`, `src/anim/reactions.js` and `src/ai/cpu.js`) decides everything that matters: where fighters are, what they are doing, damage, stamina, knockdowns, rounds. It advances only through `step()` in `src/sim/match.js`, 120 times a second, from one small "input word" per player per tick.
- **The presentation** (`src/render/`, `src/ui/`, `src/audio/`) only shows what the sim decided: models, camera, effects, HUD, sound. It never changes the fight.

**Why this split matters for online play.** Online, both players' browsers run the same sim from the same inputs and must reach exactly the same result (the netcode in `src/net/online.js` checks this). So, inside the fight sim:

- Use `dsin`, `dcos`, `datan2`, `dexp`, `dhyp` from `src/core/util.js`, never `Math.sin`, `Math.cos`, `Math.atan2` or `Math.exp`. Different browsers round those slightly differently.
- Never use `Math.random()`, the clock or anything from the screen. The only exception is the CPU (`src/ai/cpu.js`), which only runs offline.
- Whenever you change fight rules or punch data, bump `version` and `roomPrefix` in `data/config.js` so old and new versions never meet online.

---

## 2. Folder map

```
southpaw/
├── README.md                 How to run and host the game
├── PROJECT_GUIDE.md          This file
├── netlify.toml              Netlify settings (publishes the game/ folder)
├── .github/workflows/
│   └── deploy-pages.yml      Publishes game/ to GitHub Pages on every push
├── docs/
│   └── south-paw-mechanics.xlsx   The fight rules spreadsheet (matches data/rules.js)
├── game/                     EVERYTHING PLAYERS DOWNLOAD. Host this folder.
│   ├── index.html            The page: menus, HUD, touch buttons, script list
│   ├── _headers              Cache rules for Netlify and Cloudflare Pages
│   ├── manifest.webmanifest  App settings for installing to the home screen
│   ├── sw.js                 Service worker: makes the game installable and playable offline
│   ├── styles/main.css       All styling
│   ├── data/                 Numbers and settings you will tweak most
│   │   ├── config.js         Version and online settings
│   │   ├── rules.js          Damage, stamina, guard, knockdowns, round length
│   │   ├── cpu.js            CPU difficulty levels
│   │   ├── fighters.js       The two corners' colours
│   │   └── sounds.js         Which sound file plays for what
│   ├── assets/
│   │   ├── anim/clips.js     All animations (generated, do not edit)
│   │   └── sounds/*.mp3      All sounds
│   └── src/                  The game code
│       ├── core/             Helpers, page state, the frame loop
│       ├── anim/             Animation decoding and pose building
│       ├── sim/              The fight itself
│       ├── ai/               The CPU opponent
│       ├── net/              Online play
│       ├── render/           3D scene, boxers, camera, effects
│       ├── practice/         The heavy bag
│       ├── ui/               HUD, menus, buttons, installing as an app
│       ├── input/            Keyboard, touch, input sampling
│       ├── audio/            Sound engine
│       └── main.js           Starts the game
└── tools/                    For you, never uploaded
    ├── anim/                 Mixamo FBX files and the converter to clips.js
    ├── sounds/               Original recordings and the script that prepares them
    ├── peer-server/          Your own matchmaking server, for when you outgrow the free one
    └── turn-worker/          Optional Cloudflare Worker that hands out relay (TURN) credentials
```

---

## 3. `game/` top level

### `game/index.html`
The page itself. It holds:

- **Head:** title, phone viewport settings, fonts, `styles/main.css`.
- **Markup:** the canvas, the HUD (`#hud`, health and stamina bars), the touch controls (`#touch`, the stick and the Left, Right, Block, Dodge and Taunt buttons), the practice toolbar, and the screens: title (`#title`), pause (`#pause`, which includes the Full screen button), match end (`#end`), online (`#online`), the private room lobby (`#lobby`), the get-up meter and the rotate-your-phone notice.
- **App settings:** `manifest.webmanifest` and the icons in `assets/icons/` let players add South Paw to their home screen, where it opens full screen in landscape.
- **Scripts:** the libraries, then every game file in load order.

**Edit it when** you add or rename a menu, button or on-screen element (give it an `id`, then wire it up in `src/ui/buttons.js` or `src/ui/screens.js`), change the title-screen text, or add a new script file. Add new scripts in the right place in the list.

### `game/styles/main.css`
All styling: colours as CSS variables at the top, the HUD bars, the touch buttons (their sizes and positions are the `#tbL`, `#tbR`, `#tbBlock`, `#tbDodge`, `#tbTaunt` and `#stick` rules), announcements (`.ann`), pops, menus, and phone layouts (`@media` rules).

**Edit it when** you move or resize touch buttons, change HUD colours, or restyle menus.

### `game/_headers`
Tells Netlify and Cloudflare Pages how long browsers may cache each folder. Animations and sounds are cached for a day; code and data are checked on every visit so updates show up straight away.

---

## 4. `game/data/`: the numbers you will tweak

### `data/config.js`
- `version`: shown to the other player in online handshakes. Bump it with any rules change.
- `roomPrefix`: every online room and quick-match slot starts with this. Different prefixes never meet, so bumping it keeps versions apart.
- `quickMatchSlots`: how many quick-match queue slots are scanned.
- `peerServer`: empty uses the free public PeerJS server. Fill it in to use your own (see `tools/peer-server`).
- `iceServers`: how two browsers find each other. STUN servers find a direct route; TURN servers relay the fight when a network blocks direct connections (common on mobile data and office Wi-Fi).
- `openRelay`: a free public relay (Open Relay by metered.ca) added on top. Set it to `null` to turn it off.
- `turnUrl`: optional. Point it at your own credentials service, for example `tools/turn-worker`, which uses Cloudflare's TURN. This is the most reliable option once you have regular players.

### `data/rules.js`
The fight rules, matching `docs/south-paw-mechanics.xlsx`:

- `punches`: for each punch key, `[damage, stamina cost, power shot, opponent stamina drained]`. Keys: `L`/`R` is the hand, then `0` jab/cross, `1` hook, `2` uppercut, `3` power uppercut, `4` body straight, `5` body hook. `2s`/`3s` are the short-range uppercut versions, `R1L` is the long right hook, `Rc` is the cross thrown straight after a jab. A power shot (third value `1`) breaks a guard on its own.
- `ROUND_SECONDS`, `ROUNDS_TO_WIN`.
- Health and stamina: `HP0`, `ST0`, `ST_RATE`, `ST_DELAY`, `ST_BLOCK`, `GAS_UNLOCK`.
- Guard: `GUARD_HITS`, `GUARD_HEAL`, `GB_STUN`.
- `CTR`: counter multiplier.
- Knockdowns: `KD_HP`, `KD_ST`, `KD_TAPS`, `WOB_MS`.

Each value has a comment in the file. Change a number, reload, and it applies. Bump the version in `config.js` too.

### `data/cpu.js`
`CPU_LEVELS`: one entry per difficulty (`easy`, `normal`, `hard`), with how fast the CPU reacts, how often it defends, dodges, punches and parries, how quickly it learns your habits, and its name. The comment at the top explains every field. The menu buttons pick these by key, so adding a level needs a button in `index.html` too.

### `data/fighters.js`
`FIGHTER_LOOKS`: red corner first, blue second. Skin, trunks, trim and glove colours as `0xRRGGBB`, `hair` (or `null` for bald), and `trail` (the punch trail colour).

### `data/sounds.js`
`SOUND_FILES`: the short name the code uses, then the file in `assets/sounds/`. The comment says where each one plays. To swap a sound, replace the mp3 with one of the same name. To add a new one, add a line here and play it from `src/audio/sound.js`.

---

## 5. `game/assets/`

### `assets/anim/clips.js`
Every animation the fighters use: about 50 Mixamo clips, compressed into one file and stored as `window.SP_ANIM`. It is generated by `tools/anim/export.mjs`; never edit it by hand. The clip names (`idle`, `jc1`, `hook`, `hLL`, `liv` and so on) are listed in `CLIPN` in `src/anim/clips.js`.

### `assets/sounds/*.mp3`
The ten sounds, already trimmed, mono and loudness-matched by `tools/sounds/prepare.sh`. See `data/sounds.js` for which is which.

---

## 6. `game/src/`: the code

Files are listed in load order.

### `src/core/util.js` (shared helpers)
- `$` for finding page elements; `clamp`, `lerp`, `rand`, and easing curves.
- **Deterministic maths for the fight sim:** `dsin`, `dcos`, `datan`, `datan2`, `dexp`, `dhyp`. These give identical results in every browser, which online play depends on.
- `TOUCH`: true on phones and tablets.
- A stop with a clear message if three.js did not load.

### `src/anim/clips.js` (animation decoding and pose building)
- `AD` is the animation data; `BIDX` maps bone names to numbers. `CLIPN` lists every clip name, and the order must match `tools/anim/export.mjs`. `CI.name` gives a clip's index.
- `CL`: decoded clips. `sampleClip` reads one frame, and `blendPose` mixes two poses.
- `mirrorPose` and `maskLeftArm` are left from when right-hand punches mirrored left-hand clips. They are still available for new clips.
- `bodyMods`: one formula for how dodges, body-shot crouches and lean-backs bend the spine. The sim and the renderer both use it, so what you see is what gets hit.
- `evalPose`: builds a fighter's full pose from the visual state (idle, footwork, the current action, blends).
- `aimArm`: lifts the punching arm at the shoulder so Mixamo punches (made for a shorter target) reach the opponent's jaw.

**Edit it when** you add a clip (add its name to `CLIPN`), or change how poses blend.

### `src/core/state.js`
Page-level state shared by menus and the renderer: `STEP` (one sim tick, 1000/120 ms) and `G` (mode, pause, map).

### `src/audio/sound.js` (sound engine)
`Sfx` plays the recorded sounds from `data/sounds.js`:

- `init` runs as soon as the page opens and loads every sound, so the first bell and punches are never silent. Browsers keep audio paused until the first tap or key; `wake` starts it then, and again whenever a phone paused it (switching apps, a call, a notification). On iPhone it also asks to play even with the silent switch on, like a video.
- `punch` picks the punch, face or body impact by punch type and dips the crowd under it (`duck`) so punches are always heard. The same punch always sounds the same (no random pitch); only power and combos change it. Blocks use the punch sound, muffled.
- `SND_HIT` (top of the file): where the smack is inside each recording. Playback starts there so the sound lands exactly on contact. If you replace `punch.mp3`, `face.mp3` or `body.mp3`, re-measure where its hit starts and update this.
- `react` (crowd reactions) plays one reaction at a time. `REACT` lists each one: its priority, the file, where its loud part starts (`off`) and how long it plays. A bigger moment (knockout over gasp over cheer over ooh) cuts in over a smaller one, and a smaller one waits, so reactions never pile up.
- `bell`, `knockdown` and `boom` (knockout) handle the rest, and `applause` uses the cheer.
- `update` runs every frame. It fades the ambience between the walk-in crowd (`introAmb`) and the in-round crowd (`roundAmb`), swells it with excitement, and muffles everything when your fighter is badly hurt.

**Edit it when** you change which sound plays for what, or the volumes. Volumes are the second argument of each `this.play(...)`.

### `src/render/scene.js` (3D scene)
- **Screen size:** `resize` sizes the picture from the canvas's real size, and `fitCheck` (called every frame from the loop) redoes it whenever that size changes. Don't go back to relying only on the browser's resize event: iPhone home-screen apps often skip it or report the old size after rotating, which stretches a portrait picture across the screen.
- **Sharpness:** the game renders at the screen's full pixel density, capped at 2× on computers and 1.75× on phones. `adaptRes` only lowers it if the device genuinely can't keep up (under about 33 fps for two checks in a row, never while loading), and raises it again as soon as frames are smooth.
- The renderer, resolution scaling for slower phones (`adaptRes`), the ink-outline shader (`OUTLINE`) and toon shading (`toon`, `GRAD`).
- Lights.
- The ring: canvas (`makeCanvasTex`), apron with the "SOUTH PAW" logo (`makeApronTex`), ropes and posts. `updateRingFade` makes ring sides near the camera see-through.
- The crowd: instanced figures that bounce with excitement.

**Edit it when** you change the arena, ring branding, lighting or crowd.

### `src/render/boxer.js` (the fighter model)
`makeBoxer(look)` builds a boxer from simple rounded shapes attached to the Mixamo skeleton (units are centimetres): trunks, waistband, torso, round head, hair, eyes, brows, ears, arms, gloves and cuffs, legs and shoes. Colours come from `data/fighters.js`.

**Edit it when** you restyle the characters. Each `ell(bone, material, sizeX, sizeY, sizeZ, x, y, z)` call is one shape on one bone.

### `src/render/pose.js` (putting poses on models)
- `applyVis` runs every frame: it builds the pose with `evalPose` and applies dodges, crouches, the head snap and glove squash.
- `inertialize` smooths the switch between animations.
- `footLockDodge` and `legIK` keep the feet planted during dodges and body shots.

### `src/render/corners.js`
Creates the two boxer models on screen (`B[0]` red, `B[1]` blue).

### `src/anim/reactions.js` (animation timing tables)
- `ALLK`: every field of a fighter's visual state, which is copied for replays and blending.
- `BLEND`: how long each action blends in.
- `HSEG`: hit reactions as `[start, snap peak, settled]` frames. `BSEG`: the same for blocked hits.
- `GETUP` and `downFrame`: how the knockdown fall and the get-up play, including the push-up while you mash.
- `blankVis`: an empty visual state.

**Edit it when** a reaction looks too long or short (adjust its frames), or you add a reaction clip.

### `src/sim/snapshot.js`
`dcopy` (fast deep copy for rollback snapshots), and `serState`/`deserState` (state as text for online resync).

### `src/sim/skeleton.js` (the sim's skeleton)
`fkLocal` and `simPoint` work out where any point of a boxer is (a glove, the head, the torso) from the animation state alone, using deterministic maths. `simHead` and `simBody` are the head and body target points, and `HEAD_FWD` and `BODY_FWD` are how far they sit in front of the fighter.

### `src/sim/punches.js` (the punch book)
- `TPL`: timing templates for each punch clip: `startup`/`active`/`recovery` (ms), `stun`, knockback `kb`, screen shake, hitstop `stop`, and which clip frames are the wind-up, impact and end (`f0`, `fw`, `fi`, `fr`).
- `addMove`: every punch is registered once. It measures where the glove really is at impact (`g`), and from that the ideal distance (`ideal`) and `reach`. Damage and stamina then come from `RULES.punches`.
- **Aim pass:** for each head punch it finds the shoulder lift (`aim`) that brings the glove to jaw height.
- `PCODE`: the input codes for punches and dodges.

**Edit it when** a punch should be faster or slower (`startup`, `recovery`), or you give a punch a new clip (change its `clip` and frame numbers in `TPL`, or add a template).

### `src/practice/bag.js`
The heavy bag in practice mode: its model, swinging physics (`stepBag`), the dent where it is hit, and drawing it (`applyBag`).
- **Size:** `BAG_R` (radius), `BAG_HH` (half the height) and `BAG_DROP` (how far the bag's middle sits below the swing point `BAG_L`). The bag is 1.3 m tall with its bottom about 0.65 m off the floor, so body shots land on it.
- **It's solid:** `bagContact` checks every tick whether the punching glove touches the leather. The hit is then decided right there, and the punch is frozen at the frame it touched, between ticks, so the glove stops on the surface and then pulls straight back (`updateAnim` in `fighter.js`). A glove within 1.5 cm counts as a touch.
- `bagCollide` runs after every tick. Your head, chest and both gloves push the bag away, so it swings off you and bounces back instead of passing through you. The punching glove is left to `bagContact` until its punch lands or misses. If the bag is already at full swing, you get pushed back instead.

### `src/sim/footwork.js`
Stepping in and out and circling, built from the Mixamo step clips. A tap is a short step, holding gives a walk, and circling has short, medium and long steps. `FOOT` holds each step clip's settings.

### `src/sim/fighter.js` (fighter state and actions)
- `newFighter`, `freshHealth` (the start-of-round reset), `newSim` (a whole new fight state `S`).
- `updateAnim`: the animation state machine. It turns what a fighter is doing (idle, punching, hit, blocking, dodging, down, getting up, taunting) into a visual state.
- `atkFrame`: which clip frame a punch shows at each moment. After contact, `updateAnim` holds the glove where it touched for a moment, so punches don't pass through bodies.
- `canAct`, `decide` (what to do with the buffered input), `moveFor` (which punch a button press becomes at this distance), `startAttack`, `startSlip` (dodges), `startTaunt`.
- `spend` (stamina and gassing), `resetPose`, `corner` (the between-rounds reset).

### `src/sim/combat.js` (hitting, blocking, knockdowns)
- **Hit detection:** `contact` tests the real glove against the opponent's head sphere, torso capsule and guard gloves every tick of a punch. Sizes are `GLOVE_R`, `HEAD_R` and `TORSO_R`.
- `dodgeCheck`: which dodge beats which punch.
- `resolveFighter`: counters, too-close and fingertip range, blocks, parries.
- `guardBreak`, `blockReact`, `react`: the block and hit reactions.
- `land`: health damage, the body-hook stamina drain, stun, which reaction clip plays, knockdown checks.
- `liverShot`: down to one knee, not a knockdown.
- `knockdown` and `stepDown`: the count, mashing, get-up, TKO on the second.
- `stepFighter`: one tick for a fighter. Stamina refill, guard recovery, timers, punch contact and movement all happen here.
- `spacing` and `clampRing`: fighters can't overlap or leave the ring.

**Edit it when** you change how hits, blocks or knockdowns work. Most balance numbers are in `data/rules.js` instead.

### `src/ai/cpu.js` (the CPU)
- `makeAI(level)` builds a CPU from `data/cpu.js`.
- `aiObserve` learns your punch mix, follow-ups and defence habits. `aiPlan` picks a game plan each round (pressure, body, box, counter).
- `aiChoose` picks a punch that suits your weaknesses and the range. `COMBOS` holds its follow-ups.
- `aiThink` runs every tick: defend, read you, counter, move, attack.
- Offline only. It is allowed to use `Math.random`.

### `src/sim/match.js` (inputs, rounds, the tick)
- **Input words:** `enc` packs one player's input for one tick into a single number (movement, block, punch or dodge, ready, skip, taunt). `applyWord` unpacks it.
- **Replays:** the last 10 seconds are recorded (`REC`) for knockout replays.
- **Round and match flow:** `startRoundS`, `triggerKO`, `timeUp`, `roundEnd`, `judge` (most damage wins a round on time), `fire` (timed events), and `startReplayS`/`finishReplayS`.
- `step(W)`: one 120 Hz tick of the whole fight. The single place the fight moves forward.
- `simHash`: a fingerprint of the fight state, used online to check both players agree.

### `src/render/fx.js` (effects)
Hit sparks, rings and streaks (`spawnFx`), punch trails, screen shake (`addTrauma`), screen flash, phone vibration (`buzz`), and the crowd's camera flashes.

### `src/ui/hud.js` (HUD and reactions to events)
- `announce` (big text such as "ROUND 1", "K.O." and the count), `pop`/`popAt` (small text over a fighter such as "Counter" or "Gassed"), `updateHUD` (bars, timer, get-up meter), `renderPips` (rounds won).
- `drainEvents`: the sim reports what happened (hits, knockdowns, pops) as events, and this function turns each one into sound, effects and text, once each, even when online rollback replays a moment. It remembers which events it has handled (`SEEN`). `enterSim` in `screens.js` clears that list for every new fight. Without that, a new fight's punches looked like the title-screen fight's and stayed silent.

**Edit it when** you change on-screen text, or which crowd reaction goes with which moment.

### `src/ui/screens.js` (menus and modes)
- `MAP`: the keyboard layout. `KEYHELP`: the on-screen key hints.
- `startAttract` (the idle fight behind the title screen), `startMatch` (vs CPU), `startPractice`.
- `showEnd` (the match-end card, stats and brag line), `setPaused`, `cycleSpeed`/`cycleCam` (practice tools), `checkOrient` (the rotate-your-phone notice).
- `goFull`, `fsToggle`, `fsUpdate`: full screen. Browsers only allow it during a real tap, click or key press. A finger's first touch (`pointerdown`) doesn't count, so the game listens for the tap ending (`pointerup`, `touchend`, `click`) and keys, and keeps trying until it works. If the player leaves full screen on purpose, only the button, Ready and starting a fight ask again. The corner button `#fsBtn` shows on every menu, and the pause menu has `#btnFull`. iPhones don't support full screen for web pages, so on iPhone the button shows `#fsHint` (Share, then Add to Home Screen); opened from the home screen, `manifest.webmanifest` makes it full screen.

### `src/input/local.js` (your input each tick)
- `STICK`, `TB` (touch block) and `PBT` (punch buttons) hold the state of touch and keys.
- `punchDown`/`punchUp`: a tap is a straight, and holding for `HOLD_MS` turns it into a hook. The stick direction makes it an uppercut or a body shot.
- `dodgeDown` (slip, duck or pull back by stick direction) and `tauntDown`.
- `sampleLocal`: turns all of that into one input word per tick. It also stops circling for a moment while you aim a punch, which is not needed while blocking.

### `src/net/online.js` (online play)
- **Private rooms:** `hostRoom` makes a 4-letter room and opens the lobby. `joinRoom` (also used when someone opens an invite link such as `/#ABCD`) opens the same lobby and keeps retrying for about a minute, in case the host is still connecting or switched apps to send the link.
- **Lobby** (bottom of the file): `LOBBY` holds the lobby state. `lobbyOpen`, `lobbyRender` (the red and blue corner cards), `lobbySetReady` and `lobbyCheck` (when both players are ready, the host starts the match), `lobbyLost` (a player left), `lobbyCopy` (copies the invite link) and `lobbyLeave`. The host is always the red corner and the guest the blue corner, but each player sees themselves on the left of their own screen.
- **Quick match:** `quickMatch` scans `CONFIG.quickMatchSlots` queue slots and starts straight away, with no lobby.
- **Relays:** `prepareIce` builds the STUN and TURN list from `data/config.js` before connecting.
- **Rollback netcode:**
  - `netFrame` runs every frame, with input delay and prediction.
  - `netRollback` rewinds and re-plays when a late input arrives.
  - `saveSnap` keeps a snapshot each tick.
  - `netChecksums` compares `simHash` with the other player.
  - `netDesync`/`netApplySync` resync from the host if they ever disagree.
- `NET`: all connection state.

**Edit it with care.** Any change must keep both players' sims identical. Test with two browsers.

**If friends can't connect:**
- **The host must keep South Paw open on the room screen until the friend joins.** On a phone, switching apps to send the link can pause the page; coming back reconnects it.
- **Strict networks need a relay.** If players on mobile data or office Wi-Fi still can't connect, deploy `tools/turn-worker` and set `turnUrl`.

### `src/render/camera.js`
- `updateCamera` sets up the broadcast camera, which sits side-on and pulls back only as the fighters' gap grows (`zoom`).
- It also handles the close and front cameras for practice, the knockdown and knockout shots, the replay orbit, the round-intro sweep, and the winner shot.
- `camFar` adjusts distance for tall phone screens.

### `src/core/loop.js` (the frame loop)
`frame()` runs every display frame:
- It runs the sim at a fixed 120 Hz: offline directly, online through `netFrame`.
- It smooths between ticks (`lerpVis`), poses the models, moves the camera, and updates effects, sound and the HUD, then draws.
- It also adapts resolution to keep phones smooth.

### `src/input/keyboard.js`
Key presses: punches, dodge, taunt, pause, mute, and the practice keys. The layout itself is `MAP` in `src/ui/screens.js`.

### `src/input/touch.js`
The fixed stick (`sizeStick` sets its size from the screen; touching near it steers from its centre) and the touch buttons (Block holds, Dodge, Taunt, Left/Right tap or hold).

### `src/ui/buttons.js`
Wires up every menu button: CPU fight, difficulty, online (create, join, quick match, copy invite), practice, pause, sound, quit, rematch, copy brag, and the practice toolbar.

### `src/ui/install.js`
Installing South Paw as an app; from the home screen it opens full screen.
- **Android and computers (Chrome, Edge, Samsung Internet):** the browser tells the page it can be installed (`beforeinstallprompt`). The game then shows "Install the app" on the title menu and, on phones, a one-time banner. One tap opens the browser's own install box. Browsers only offer this over https and only when `sw.js` is in place.
- **iPhone and iPad:** Apple lets no website install itself, so the button and banner explain Share, then Add to Home Screen.
- The banner shows once per phone; after Install or Not now it stays hidden (remembered in the browser).

### `sw.js` (service worker)
The service worker sits between the game and the network. It always fetches the newest files when online and keeps a copy for playing offline. It never touches matchmaking traffic. You normally never edit it; if you ever need everyone's saved copy cleared, change `CACHE` to a new name.

### `src/main.js`
Starts the idle fight behind the title screen, joins a room straight away if the link has a `#CODE`, and starts the frame loop.

---

## 7. How a punch travels through the code

1. **Press:** you press Right on the touch screen. `punchDown` (`src/input/local.js`) records it. On release (tap) or after `HOLD_MS` (hold), `firePunch` sets the punch code.
2. **Input word:** `sampleLocal` packs it into this tick's input word. Online, the word is also sent to the other player.
3. **Tick:** `step()` (`src/sim/match.js`) applies the word. `decide()` (`src/sim/fighter.js`) picks the punch with `moveFor` and starts it with `startAttack`, which spends stamina.
4. **Animation:** each tick, `updateAnim` and `atkFrame` advance the punch clip. In the late wind-up, `stepFighter` (`src/sim/combat.js`) starts testing `contact`.
5. **Contact:** on contact, `resolveFighter` decides block, parry, counter or range. `land` applies damage, picks the reaction clip and reports events.
6. **Presentation:** `drainEvents` (`src/ui/hud.js`) turns those events into the punch sound (`Sfx.punch`), sparks (`spawnFx`), shake and text. The renderer shows the poses.

---

## 8. Common tweaks

| I want to… | Edit |
|---|---|
| Change a punch's damage or stamina cost | `data/rules.js` → `punches`, then bump `data/config.js` version |
| Make stamina refill faster or slower | `data/rules.js` → `ST_RATE`, `ST_DELAY` |
| Change health or stamina after a knockdown | `data/rules.js` → `KD_HP`, `KD_ST` |
| Change round length or best-of | `data/rules.js` → `ROUND_SECONDS`, `ROUNDS_TO_WIN` |
| Make the guard break easier or harder | `data/rules.js` → `GUARD_HITS`, `GUARD_HEAL` |
| Make a punch faster or slower | `src/sim/punches.js` → `TPL` (`startup`, `recovery`) |
| Make the CPU easier or harder | `data/cpu.js` |
| Change fighter colours | `data/fighters.js` |
| Change the fighter's shape | `src/render/boxer.js` |
| Swap a sound | Replace the mp3 in `game/assets/sounds/` (same name), or run `tools/sounds/prepare.sh` on a new original |
| Change sound volumes | `src/audio/sound.js` (the `this.play(name, volume, …)` calls) |
| Move or resize touch buttons | `game/styles/main.css` (`#tbL`, `#tbR`, `#tbBlock`, `#tbDodge`, `#tbTaunt`, `#stick`) |
| Change keyboard keys | `src/ui/screens.js` → `MAP`, and the hints in `KH_FIGHT` |
| Change on-screen pop text | `src/sim/combat.js` and `src/sim/fighter.js` (the `ev({ty:'pop', text:…})` calls) |
| Change the ring logo | `src/render/scene.js` → `makeCanvasTex` (ring canvas) and `makeApronTex` (ring apron) |
| Change camera distance | `src/render/camera.js` → `zoom` |
| Make hit detection more or less generous | `src/sim/combat.js` → `GLOVE_R`, `HEAD_R`, `TORSO_R`, `SLOP` |
| Use your own matchmaking server | Deploy `tools/peer-server`, then set `data/config.js` → `peerServer` |

### Adding a new animation clip
1. Download it from Mixamo using the same character as the other clips (FBX, 30 fps, "In Place" for anything that should not travel).
2. Put the FBX in `tools/anim/fbx/`.
3. In `tools/anim/export.mjs`, add `shortName:'File.fbx'` to `CLIPS`, at the end. Optionally add a frame range to `KEEP`.
4. Run `cd tools/anim && npm install && node export.mjs`. This rewrites `game/assets/anim/clips.js`.
5. In `game/src/anim/clips.js`, add `'shortName'` to the end of `CLIPN`, in the same order.
6. Use it:
   - For a punch, point a template in `src/sim/punches.js` at it.
   - For a hit reaction, add its frames to `HSEG` in `src/anim/reactions.js` and choose it in `land()` in `src/sim/combat.js`.
7. Bump the version in `data/config.js`.

### Adding a new sound
1. Put the original in `tools/sounds/originals/`, and add an ffmpeg line for it to `tools/sounds/prepare.sh`, copying a similar one. Then run the script.
2. Add its name to `data/sounds.js`.
3. Play it from `src/audio/sound.js` with `this.play('name', volume)`.

---

## 9. Tools (`tools/`, not uploaded to your host)

### `tools/anim/`
- `fbx/`: the Mixamo source files.
- `export.mjs`: the converter. It samples each clip at 30 fps, trims it (`KEEP`), strips root motion from step clips and stores it separately, lines up the knockdown fall with the get-ups, compresses everything and writes `game/assets/anim/clips.js`.
- `package.json`: needs Node and the `three` package (`npm install`).

### `tools/sounds/`
- `originals/`: the recordings as you supplied them.
- `prepare.sh`: trims, converts to mono mp3 and loudness-matches them into `game/assets/sounds/`. Needs ffmpeg.

### `tools/peer-server/`
A small matchmaking server (Node, Express, PeerJS server) for when you want your own instead of the free public one. It only introduces two players; the fight itself still goes directly between them. Setup steps are in the comment at the top of `server.js`.

### `tools/turn-worker/`
A tiny Cloudflare Worker that hands out short-lived relay credentials from Cloudflare's TURN service, so players on strict networks can always connect. Deploy it with `npx wrangler deploy` and add the two secrets, as described at the top of `worker.js`. Then set `turnUrl` in `game/data/config.js`. `ALLOW_ORIGIN` in `wrangler.toml` lists the sites allowed to use it.

---

## 10. Before you publish a change

1. Run it locally (see README) and play a CPU fight to the end, including a knockdown.
2. If you touched anything in `data/rules.js`, `src/sim/`, `src/anim/` or `src/net/`, test online with two browser windows (one creates a room, the other joins). The match should run without "resync" messages.
3. Bump `version` and `roomPrefix` in `data/config.js` if the fight changed.
4. Upload the `game/` folder.
