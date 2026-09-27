# ADHD Fight N8

A **fast** 2D elemental arena fighter for the browser, with 16 unique characters. It is tuned to play at the pace of the Avatar-style bending fighters, not slow, footsie-heavy Street Fighter pacing. Attacks come out in 3–8 frames, dashes and double jumps are everywhere, and projectiles fly constantly.

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
npx http-server .   # then open http://localhost:8080
```

## Modes
- **VS CPU** — you against the CPU (Easy / Normal / Hard)
- **2 Players** — local versus on one keyboard, or with gamepads
- **Practice** — beat up a bot with full control over it (see below)
- **CPU vs CPU** — watch the AI fight
- **Settings** — game speed (**Fast** / **Turbo** / **Hyper**), CPU level, rounds to win, sound, and **Controls** for remapping keys

## Practice mode
Modeled on the training modes in Street Fighter 6 and Tekken 8. Nobody can be knocked out. Open the practice menu with **Esc**.

| Setting | Options |
|---|---|
| Dummy action | Stand, Crouch, Jump, Walk forward, or fight back as CPU Easy / Normal / Hard |
| Dummy guard | None, All, After first hit (blocks once your combo drops, which shows whether your combo was real), Random |
| Counterattack | What the dummy does the moment it can act after blocking, getting hit or getting up: Light, Heavy, Special, Up special, Flow, Back dash, Jump |
| Health | Auto refill after each combo, or no refill |
| Super meter | Always full, or normal |
| Special cooldowns | Off or normal |
| Start position | Center, left corner or right corner |
| Hitboxes / Input history / Attack data | On or off |

- **Attack data** shows your last attack's name, whether it hit or was blocked, damage, combo hits and damage, best combo, and **frame advantage**: how many frames sooner (+) or later (−) than the dummy you can act again.
- **Input history** lists your recent inputs, with how many frames each was held.
- Press **R** (remappable) to reset positions instantly.

## Remapping controls
Go to **Settings → Controls**, or **Controls** in the pause menu:
- Pick an action and a player, press **F / Enter**, then press the new key.
- If that key was already used for another action, it's moved to the new one.
- **Reset to defaults** restores the original layout.

Bindings are saved in your browser. The arrow keys, Enter and Esc always work in menus, so you can't lock yourself out.

## Controls

| Action | Player 1 | Player 2 | Gamepad |
|---|---|---|---|
| Move / Jump / Crouch | W A S D | Arrow keys | D-pad / Stick |
| Light | F | `,` or Num1 | X |
| Heavy | G | `.` or Num2 | Y |
| Special | H | `/` or Num3 | B |
| Flow | Y | `'` or Num6 | RB |
| Dash | Space | Right Shift or Num0 | LB |
| Super | T | `;` or Num4 | LT / RT |
| Pause | Esc / Enter | Backspace | Start |
| Reset position (practice) | R | Num5 | — |

On phones and tablets, on-screen touch controls appear after your first tap.

### Core mechanics
- **Specials**: press Special by itself or with →, ↑ or ↓ for four different specials per character. They run on short cooldowns, not meter.
- **Super**: fighting fills the meter. When the bar flashes, press Super for a screen-freezing cinematic attack.
- **Chains & cancels**: press Light three times for a combo. Any attack that connects can cancel into Heavy, Special, Super, Jump or Dash.
- **Heavy variants**: ↑ + Heavy is a launcher (then jump to chase), ↓ + Heavy is a sweep, and Heavy in the air is a spike.
- **Movement**: double-tap a direction or press Dash to dash. Hold Dash to keep running. You can also air-dash, double jump, and fast-fall by holding ↓.
- **Blocking**: there's no block button. Hold away from your opponent (back) to block, for free.
  - **High and mid attacks**: block standing (back). Crouch-blocking (down-back) also stops mids.
  - **Low attacks**: must be blocked crouching (down-back). Lows are the crouching jab, the sweep, slides, ground-traveling spikes and waves, and ground shockwaves.
  - **Overheads**: attacks from a jumping opponent must be blocked standing.
  - Blocking the wrong height shows **LOW!** or **OVERHEAD!**. Blocking too much breaks your guard and leaves you stunned.
- **Flow**: a separate button, and a higher-risk, higher-reward option than blocking.
  - Press it alone to enter **Flow Stance**, for 1/4 of the super meter. It also works out of blockstun.
  - Anything that hits you during the stance (except supers) is automatically evaded, or absorbed if it's a projectile.
  - A successful Flow staggers the attacker, refunds some meter, and makes your next hit a **Flow Counter** (counter-hit damage and stun).
  - If nothing hits you, Flow has a recovery where any hit on you is a **punish** counter-hit.
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
The game is live at https://cyberdootclaude.github.io/ADHD-Fight-N8/.

`.github/workflows/pages.yml` redeploys the site on every push to `main` or to a `claude/...` branch. Claude pushes its branch right before opening a pull request, so the live game updates as soon as a PR is opened: wait about a minute and refresh. `index.html` loads the game files with a fresh version tag on every page load, so a normal refresh always gets the newest version.
