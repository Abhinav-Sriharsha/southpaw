# South Paw

Motion-captured boxing in the browser. Fight the CPU, work the heavy bag, or box anyone online, phone against laptop. Version 0.5.

- **Host the `game/` folder.** That is everything players download.
- **`PROJECT_GUIDE.md`** explains every file and where to make common changes.
- **`docs/south-paw-mechanics.xlsx`** holds the fight rules. They match `game/data/rules.js`.

## Run it on your computer

The game loads its sounds as files, so open it through a small local web server rather than double-clicking `index.html`. Double-clicking runs the game but stays silent.

Pick one:

```bash
# Python (already on most Macs and Linux)
cd game
python3 -m http.server 8080
# then open http://localhost:8080

# or Node
npx serve game
```

To test online play on one computer, open the game in two browser windows. Create a room in one and join with the code in the other.

## Put it online

No build step: you upload the `game/` folder as it is.

### Netlify (easiest)
1. Go to https://app.netlify.com/drop.
2. Drag the **`game`** folder onto the page.
3. You get a link straight away. To update, drag the folder again on the site's Deploys page.

If you connect the whole project from GitHub instead, `netlify.toml` already tells Netlify to publish `game/`.

### Cloudflare Pages
1. In Workers & Pages, choose Create, then Pages, then Upload assets, and upload the **`game`** folder.
2. Alternatively, connect the GitHub repo with build command empty and output directory `game`.

Cloudflare's network also protects the site from traffic floods.

### GitHub Pages
1. Push this project to a GitHub repository.
2. In the repo, go to Settings, then Pages, and set Source to **GitHub Actions**.
3. Every push to `main` now publishes `game/`, using `.github/workflows/deploy-pages.yml`.

Players join a room with a link like `https://your-site/#ABCD`.

## Online play

Online matches use the free public PeerJS server to introduce two players. After that, the fight goes directly between their browsers. When you have regular players, run your own matchmaking server from `tools/peer-server/` and point `game/data/config.js` (`peerServer`) at it.

Players only meet others on the same version. Change `version` and `roomPrefix` in `game/data/config.js` whenever you change the fight rules.

## Project layout

```
game/      the game (host this)
  data/      rules, CPU levels, fighter colours, sounds, version
  assets/    animations and sounds
  src/       code, split by job: sim, render, ui, input, net, ai, audio
tools/     for you only: Mixamo FBX converter, sound preparation, matchmaking server
docs/      the mechanics spreadsheet
```

## Credits

Animations from Mixamo. three.js for 3D, PeerJS for online connections.
