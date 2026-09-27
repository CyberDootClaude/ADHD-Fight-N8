# ADHD Fight N8

A **fast** 2D elemental arena fighter for the browser, with 16 unique characters. It is tuned to play at the pace of the Avatar-style bending fighters, not slow, footsie-heavy Street Fighter pacing. Attacks come out in 3–8 frames, dashes and double jumps are everywhere, and projectiles fly constantly.

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
npx http-server .   # then open http://localhost:8080
```

## Modes
- **VS CPU** — you against the CPU (Easy / Normal / Hard)
- **2 Players** — local versus on one keyboard, or with gamepads
- **Training** — a dummy that refills its health, and you always have full super meter
- **CPU vs CPU** — watch the AI fight
- **Settings** — game speed (**Fast** / **Turbo** / **Hyper**), CPU level, rounds to win, sound

## Controls

| Action | Player 1 | Player 2 | Gamepad |
|---|---|---|---|
| Move / Jump / Crouch | W A S D | Arrow keys | D-pad / Stick |
| Light | F | `,` or Num1 | X |
| Heavy | G | `.` or Num2 | Y |
| Special | H | `/` or Num3 | B |
| Dash | Space | Right Shift or Num0 | LB / RB |
| Super | T | `;` or Num4 | LT / RT |
| Pause | Esc / Enter | Backspace | Start |

On phones and tablets, on-screen touch controls appear after your first tap.

### Core mechanics
- **Specials**: press Special by itself or with →, ↑ or ↓ for four different specials per character. They run on short cooldowns, not meter.
- **Super**: fighting fills the meter. When the bar flashes, press Super for a screen-freezing cinematic attack.
- **Chains & cancels**: press Light three times for a combo. Any attack that connects can cancel into Heavy, Special, Super, Jump or Dash.
- **Heavy variants**: ↑ + Heavy is a launcher (then jump to chase), ↓ + Heavy is a sweep, and Heavy in the air is a spike.
- **Movement**: double-tap a direction or press Dash to dash. Hold Dash to keep running. You can also air-dash, double jump, and fast-fall by holding ↓.
- **Defense**: hold away from your opponent to block. Blocking too much breaks your guard and leaves you stunned.
- **Status effects**: burn, poison, slow, freeze, shock.

## Roster

| Fighter | Element | Style | Super |
|---|---|---|---|
| Kaze | Air | Triple jump, 2 air-dashes, gusts | Hurricane |
| Ember | Fire | Burning rushdown | Inferno Beam |
| Marina | Water | Whips, geysers, healing | Tsunami |
| Granite | Earth | Armored heavy, boulders, quakes | Avalanche |
| Volta | Lightning | Teleports, instant bolts, mines | Thunderstorm |
| Nivia | Ice | Slows, freezes, ice walls | Absolute Zero |
| Umbra | Shadow | Glass-cannon assassin, parry | Eclipse |
| Thorn | Nature | Vine pulls, seed traps, regrowth | Overgrowth |
| Ferrus | Metal | Chain hook, armor, railgun | Railgun |
| Nova | Cosmic | Homing stars, gravity wells | Supernova |
| Echo | Sound | Piercing waves, projectile reflect | Encore |
| Sahar | Sand | Shotgun blasts, quicksand | Desert Storm |
| Magna | Magma | Huge damage, lava pools | Meteor Storm |
| Chrono | Time | Boomerang blades, blink | Time Stop |
| Viper | Poison | Damage-over-time everywhere | Hydra |
| Lumi | Light | Light lances, power-up | Judgment |

## Code layout
- `js/moves.js`: poses, shared normal attacks, and the special-move builders (projectile, rush, rising, teleport, beam, pillar, aoe, trap, wall, counter, buff, slam, rain)
- `js/characters.js`: the roster. Each character's data defines their stats and specials, so adding a fighter means adding one entry here.
- `js/fighter.js`: the fighter state machine, physics and hit handling
- `js/match.js`: rounds, collisions, camera and HUD
- `js/render.js`: procedural character art, effects and stages
- `js/ai.js`: the CPU opponent, which plays through a virtual controller
- `js/game.js`: menus, scenes and the main loop

Press `` ` `` during play to show hitboxes.

## Play online (GitHub Pages)
The workflow in `.github/workflows/pages.yml` publishes the game to GitHub Pages on every push. To turn it on the first time, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Then re-run the "Deploy to GitHub Pages" workflow from the Actions tab. The game will be live at `https://cyberdootclaude.github.io/ADHD-Fight-N8/`.
