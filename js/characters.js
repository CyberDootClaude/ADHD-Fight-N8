// The roster. Every fighter shares the same fast normal-attack framework and
// gets four unique specials (neutral / side / up / down) plus a super.

const BASE_STATS = {
  hp: 1000, walk: 7.8, run: 12.5, jump: 17.5, airJumps: 1, airDash: 1, dash: 21,
  weight: 1, gravity: 0.85, airSpeed: 7.8, power: 1, fastFall: 19,
};

const burn = (dur = 120, pow = 4) => ({ type: 'burn', dur, pow });
const poison = (dur = 240, pow = 3) => ({ type: 'poison', dur, pow });
const slow = (dur = 120) => ({ type: 'slow', dur });
const freeze = (dur = 50, persist = false) => ({ type: 'freeze', dur, persist });
const shock = () => ({ type: 'shock', dur: 0 });

function C(def) {
  def.stats = Object.assign({}, BASE_STATS, def.stats);
  return def;
}

const ROSTER = [
  C({
    id: 'kaze', name: 'KAZE', title: 'The Wind Monk', element: 'Air', color: '#c8f6ff', size: 0.95,
    blurb: 'Triple jumps and double air-dashes. The fastest thing in the arena.',
    look: { skin: '#f0c8a0', primary: '#f4a340', secondary: '#ffe07a', pants: '#d3752a', hair: '#3a2a1a', style: 'bald', acc: 'scarf', accColor: '#ffe07a' },
    stats: { hp: 920, walk: 8.8, run: 14, jump: 18.5, airJumps: 2, airDash: 2, dash: 23, weight: 0.88, gravity: 0.78, airSpeed: 8.8, power: 0.92 },
    specials: {
      N: SP.projectile({ name: 'Air Palm', vis: 'gust', speed: 18, w: 54, h: 64, life: 48, cd: 22, hit: { dmg: 40, stun: 18, kb: [17, -4] } }),
      F: SP.rush({ name: 'Gale Rush', speed: 27, dur: 13, inv: true, multi: 4, hit: { dmg: 22, stun: 14, kb: [4, -2] } }),
      U: SP.rising({ name: 'Cyclone Rise', vy: 21, vx: 3, multi: 4, hit: { dmg: 20, stun: 14, kb: [2, -9] } }),
      D: SP.aoe({ name: 'Vortex', r: 210, dur: 28, multi: 6, pull: true, vis: 'vortex', sfx: 'whoosh', cd: 80, hit: { dmg: 12, stun: 14, kb: [5, -2] } }),
    },
    super: SUPER('projectile', { name: 'Hurricane', vis: 'tornado', speed: 7.5, w: 170, h: 320, dy: -150, life: 160, rehit: 7, pierce: true, big: true, startup: 14, hit: { dmg: 32, stun: 18, kb: [3, -7] } }),
  }),
  C({
    id: 'ember', name: 'EMBER', title: 'The Flame Striker', element: 'Fire', color: '#ff7a1a', size: 1.0,
    blurb: 'Relentless rushdown. Every hit leaves the opponent burning.',
    look: { skin: '#e6b08a', primary: '#c62828', secondary: '#ffb300', pants: '#3e2723', hair: '#1a1a1a', style: 'spiky', acc: 'topknot' },
    stats: { hp: 1000, walk: 8.2, run: 13, power: 1.05 },
    specials: {
      N: SP.projectile({ name: 'Fireball', vis: 'fire', speed: 16, w: 44, h: 36, cd: 24, hit: { dmg: 55, stun: 20, kb: [7, -3], effect: burn() } }),
      F: SP.rush({ name: 'Flame Kick', speed: 23, dur: 12, pose: POSES.kickRush, hit: { dmg: 70, stun: 24, kb: [12, -7], effect: burn() } }),
      U: SP.rising({ name: 'Phoenix Rise', vy: 19, multi: 4, hit: { dmg: 24, stun: 16, kb: [2, -10], effect: burn(60) } }),
      D: SP.aoe({ name: 'Fire Ring', r: 160, dur: 10, vis: 'firering', cd: 55, hit: { dmg: 65, stun: 26, kb: [12, -9], effect: burn() } }),
    },
    super: SUPER('beam', { name: 'Inferno Beam', vis: 'firebeam', len: 1150, thick: 120, dur: 40, multi: 5, startup: 16, hit: { dmg: 32, stun: 18, kb: [5, -1], effect: burn() } }),
  }),
  C({
    id: 'marina', name: 'MARINA', title: 'The Tide Dancer', element: 'Water', color: '#4fc3f7', size: 0.95,
    blurb: 'Long-range whips, surprise geysers and self-healing.',
    look: { skin: '#9a6a4a', primary: '#1565c0', secondary: '#90caf9', pants: '#0d47a1', hair: '#15151f', style: 'long', acc: 'band', accColor: '#90caf9' },
    stats: { hp: 980, walk: 8 },
    specials: {
      N: SP.beam({ name: 'Water Whip', vis: 'whip', len: 360, thick: 30, dur: 8, startup: 9, recovery: 12, cd: 20, sfx: 'whoosh', hit: { dmg: 60, stun: 24, kb: [5, -3], pull: true } }),
      F: SP.rush({ name: 'Wave Surf', speed: 20, dur: 18, low: true, multi: 5, pose: POSES.slide, box: { x: 40, y: -40, w: 100, h: 60 }, hit: { dmg: 18, stun: 14, kb: [5, -4] } }),
      U: SP.pillar({ name: 'Geyser', vis: 'geyser', delay: 20, w: 84, h: 320, cd: 45, hit: { dmg: 70, stun: 32, kb: [1, -18], launch: true } }),
      D: SP.buff({ name: 'Healing Tide', type: 'heal', amount: 130, dur: 240, cd: 600, label: 'HEALING' }),
    },
    super: SUPER('projectile', { name: 'Tsunami', vis: 'wave', ground: true, w: 230, h: 340, speed: 10.5, life: 150, rehit: 7, pierce: true, big: true, startup: 16, hit: { dmg: 36, stun: 18, kb: [9, -4] } }),
  }),
  C({
    id: 'granite', name: 'GRANITE', title: 'The Stone Titan', element: 'Earth', color: '#b08968', size: 1.18,
    blurb: 'A walking fortress. His heavy attacks shrug off hits.',
    look: { skin: '#a1887f', primary: '#5d4037', secondary: '#8bc34a', pants: '#3e2723', hair: '#111', style: 'buzz', acc: 'pads', accColor: '#8d6e63' },
    stats: { hp: 1220, walk: 6.6, run: 10.5, jump: 16, airDash: 0, dash: 18, weight: 1.35, gravity: 0.95, airSpeed: 6.5, power: 1.2 },
    heavyArmor: true,
    specials: {
      N: SP.projectile({ name: 'Boulder Toss', vis: 'boulder', speed: 12, vy: -9, gravity: 0.45, w: 64, h: 64, big: true, startup: 13, cd: 34, sfx: 'whoosh', hit: { dmg: 85, stun: 26, kb: [10, -6] } }),
      F: SP.projectile({ name: 'Earth Spikes', vis: 'spikes', ground: true, speed: 13, w: 74, h: 70, life: 70, airOk: false, cd: 34, sfx: 'boom', hit: { dmg: 60, stun: 30, kb: [3, -15], launch: true } }),
      U: SP.rising({ name: 'Rock Pillar', vy: 17, armor: true, color: '#8d6e63', hit: { dmg: 75, stun: 26, kb: [3, -15] } }),
      D: SP.aoe({ name: 'Quake Stomp', groundOnly: true, r: 400, h: 70, dur: 8, vis: 'quake', cd: 70, hit: { dmg: 55, stun: 32, kb: [4, -12] } }),
    },
    super: SUPER('rain', { name: 'Avalanche', vis: 'boulder', count: 9, interval: 6, w: 76, h: 76, speed: 20, spread: 260, hit: { dmg: 45, stun: 22, kb: [4, -6] } }),
  }),
  C({
    id: 'volta', name: 'VOLTA', title: 'The Storm Blade', element: 'Lightning', color: '#ffee58', size: 0.92,
    blurb: 'Teleports, instant lightning and shocking traps.',
    look: { skin: '#f5d0b0', primary: '#fdd835', secondary: '#212121', pants: '#303030', hair: '#fff59d', style: 'ponytail' },
    stats: { hp: 900, walk: 9, run: 14.5, dash: 25, airDash: 2, power: 0.96 },
    specials: {
      N: SP.beam({ name: 'Chain Bolt', vis: 'bolt', len: 540, thick: 30, dur: 6, startup: 11, cd: 28, sfx: 'zap', hit: { dmg: 55, stun: 22, kb: [6, -3], effect: shock() } }),
      F: SP.teleport({ name: 'Flash Step', dest: 'forward', dist: 270, cd: 36, strike: { dmg: 45, stun: 20, kb: [8, -5], effect: shock() } }),
      U: SP.rising({ name: 'Thunder Rise', vy: 22, multi: 3, hit: { dmg: 26, stun: 15, kb: [2, -10], effect: shock() } }),
      D: SP.trap({ name: 'Static Mine', vis: 'mine', max: 2, dist: 110, cd: 45, hit: { dmg: 60, stun: 40, kb: [2, -10], effect: shock() } }),
    },
    super: SUPER('rain', { name: 'Thunderstorm', vis: 'lightning', count: 9, interval: 5, w: 44, h: 130, speed: 42, spread: 300, sfx: 'zap', hit: { dmg: 38, stun: 22, kb: [3, -4], effect: shock() } }),
  }),
  C({
    id: 'nivia', name: 'NIVIA', title: 'The Frost Queen', element: 'Ice', color: '#80deea', size: 1.0,
    blurb: 'Slows, freezes and walls you out. Patience is her weapon.',
    look: { skin: '#e8eaf6', primary: '#4dd0e1', secondary: '#e0f7fa', pants: '#006064', hair: '#e3f2fd', style: 'long', acc: 'crown', accColor: '#b2ebf2' },
    stats: { hp: 960, walk: 7.6 },
    specials: {
      N: SP.projectile({ name: 'Ice Shards', vis: 'shard', count: 3, spread: 2.6, speed: 17, w: 38, h: 16, cd: 28, color: '#e0f7fa', hit: { dmg: 24, stun: 16, kb: [5, -2], effect: slow() } }),
      F: SP.rush({ name: 'Ice Slide', speed: 22, dur: 14, low: true, pose: POSES.slide, box: { x: 45, y: -40, w: 100, h: 60 }, hit: { dmg: 55, stun: 22, kb: [9, -6], effect: slow() } }),
      U: SP.pillar({ name: 'Ice Spike', vis: 'icepillar', delay: 22, w: 72, h: 260, cd: 50, hit: { dmg: 60, stun: 26, kb: [1, -16], effect: freeze(45) } }),
      D: SP.wall({ name: 'Ice Wall', vis: 'icewall', hp: 3, life: 330, cd: 110 }),
    },
    super: SUPER('aoe', { name: 'Absolute Zero', vis: 'frost', r: 540, h: 360, dur: 12, startup: 16, hit: { dmg: 120, stun: 30, kb: [4, -8], effect: freeze(110) } }),
  }),
  C({
    id: 'umbra', name: 'UMBRA', title: 'The Shadow Fang', element: 'Shadow', color: '#9d7cff', size: 0.95,
    blurb: 'Fragile but lethal. Appears behind you before you blink.',
    look: { skin: '#bcaaa4', primary: '#311b92', secondary: '#7e57c2', pants: '#1a1033', hair: '#0a0a12', style: 'hood', acc: 'mask', accColor: '#1a1033' },
    stats: { hp: 850, walk: 9.2, run: 14.5, dash: 24, airJumps: 2, power: 1.12, weight: 0.92 },
    specials: {
      N: SP.projectile({ name: 'Shadow Kunai', vis: 'kunai', count: 2, interval: 5, speed: 23, w: 36, h: 12, cd: 22, sfx: 'whoosh', hit: { dmg: 28, stun: 14, kb: [4, -1] } }),
      F: SP.teleport({ name: 'Shadow Step', dest: 'behind', cd: 45, strike: { dmg: 50, stun: 24, kb: [8, -6] } }),
      U: SP.rising({ name: 'Rising Fang', vy: 19, hit: { dmg: 70, stun: 26, kb: [3, -14] } }),
      D: SP.counter({ name: 'Shadow Parry', window: 24, cd: 40, strike: { dmg: 90, stun: 34, kb: [12, -8], knockdown: true } }),
    },
    super: SUPER('rush', { name: 'Eclipse', speed: 32, dur: 26, inv: true, multi: 3, box: { x: 30, y: -90, w: 150, h: 130 }, trail: '#5e35b1', hit: { dmg: 34, stun: 16, kb: [2, -3] } }),
  }),
  C({
    id: 'thorn', name: 'THORN', title: 'The Wild Druid', element: 'Nature', color: '#8bd48b', size: 1.04,
    blurb: 'Vines drag you in, seeds and brambles keep you there.',
    look: { skin: '#a5d6a7', primary: '#2e7d32', secondary: '#c5e1a5', pants: '#4e342e', hair: '#43a047', style: 'leafy' },
    stats: { hp: 1020, walk: 7.4 },
    specials: {
      N: SP.projectile({ name: 'Vine Lash', vis: 'vine', tether: true, speed: 21, life: 24, w: 40, h: 26, cd: 32, sfx: 'whoosh', color: '#66bb6a', hit: { dmg: 35, stun: 30, kb: [15, -4], pull: true } }),
      F: SP.trap({ name: 'Thorn Seed', vis: 'seed', dist: 170, max: 2, cd: 40, hit: { dmg: 55, stun: 30, kb: [2, -12], effect: poison(180) } }),
      U: SP.pillar({ name: 'Bramble', vis: 'bramble', delay: 24, w: 92, h: 230, cd: 48, color: '#558b2f', hit: { dmg: 65, stun: 30, kb: [2, -15], effect: poison(150) } }),
      D: SP.buff({ name: 'Regrowth', type: 'heal', amount: 150, dur: 300, cd: 700, label: 'REGROWTH' }),
    },
    super: SUPER('pillar', { name: 'Overgrowth', vis: 'bramble', at: 'row', count: 6, spacing: 130, stagger: 4, start: 110, delay: 8, w: 110, h: 330, color: '#2e7d32', hit: { dmg: 55, stun: 30, kb: [2, -17] } }),
  }),
  C({
    id: 'ferrus', name: 'FERRUS', title: 'The Iron Knight', element: 'Metal', color: '#cfd8dc', size: 1.12,
    blurb: 'Armored charges, a chain hook and a one-shot railgun.',
    look: { skin: '#d7ccc8', primary: '#607d8b', secondary: '#cfd8dc', pants: '#37474f', hair: '#111', style: 'helmet', acc: 'pads', accColor: '#90a4ae' },
    stats: { hp: 1160, walk: 7, run: 11, jump: 16.2, dash: 19, weight: 1.25, power: 1.14 },
    specials: {
      N: SP.projectile({ name: 'Chain Hook', vis: 'chain', tether: true, speed: 23, life: 22, w: 40, h: 26, cd: 36, sfx: 'whoosh', hit: { dmg: 40, stun: 32, kb: [16, -3], pull: true } }),
      F: SP.rush({ name: 'Shield Charge', speed: 18, dur: 18, armor: true, stopOnHit: true, hit: { dmg: 80, stun: 26, kb: [15, -5] } }),
      U: SP.rising({ name: 'Iron Uppercut', vy: 16, armor: true, hit: { dmg: 80, stun: 28, kb: [3, -15] } }),
      D: SP.buff({ name: 'Iron Skin', type: 'armor', dur: 200, cd: 600, label: 'IRON SKIN' }),
    },
    super: SUPER('beam', { name: 'Railgun', vis: 'rail', len: 1500, thick: 70, dur: 12, startup: 22, hit: { dmg: 280, stun: 40, kb: [20, -10], knockdown: true } }),
  }),
  C({
    id: 'nova', name: 'NOVA', title: 'The Star Child', element: 'Cosmic', color: '#ea80fc', size: 0.9,
    blurb: 'Floaty and tricky. Homing stars and gravity wells.',
    look: { skin: '#ffe0e9', primary: '#1a237e', secondary: '#f48fb1', pants: '#283593', hair: '#ff80ab', style: 'twintails', acc: 'star', accColor: '#fff176' },
    stats: { hp: 940, walk: 8, airJumps: 2, gravity: 0.7, airSpeed: 8.5 },
    specials: {
      N: SP.projectile({ name: 'Star Orb', vis: 'star', speed: 9, homing: 0.35, life: 120, w: 40, h: 40, cd: 38, color: '#fff176', hit: { dmg: 50, stun: 20, kb: [7, -5] } }),
      F: SP.rush({ name: 'Comet Dash', speed: 24, dur: 14, trail: '#fff176', hit: { dmg: 60, stun: 22, kb: [10, -8] } }),
      U: SP.teleport({ name: 'Warp', dest: 'above', cd: 55, strike: { dmg: 50, stun: 22, kb: [3, 12], spike: true } }),
      D: SP.aoe({ name: 'Gravity Well', r: 170, dist: 170, dur: 40, multi: 8, pull: true, vis: 'vortex', sfx: 'whoosh', cd: 80, hit: { dmg: 10, stun: 14, kb: [6, -1] } }),
    },
    super: SUPER('aoe', { name: 'Supernova', vis: 'nova', r: 380, dur: 24, multi: 6, startup: 20, hit: { dmg: 46, stun: 22, kb: [10, -8] } }),
  }),
  C({
    id: 'echo', name: 'ECHO', title: 'The Sonic Idol', element: 'Sound', color: '#1de9b6', size: 0.97,
    blurb: 'Piercing sound waves, a stage-shaking dive and a reflecting parry.',
    look: { skin: '#ffcc80', primary: '#00bfa5', secondary: '#ff4081', pants: '#212121', hair: '#ff4081', style: 'mohawk', acc: 'headphones', accColor: '#212121' },
    stats: { hp: 960, walk: 8.3 },
    specials: {
      N: SP.projectile({ name: 'Sonic Wave', vis: 'sound', speed: 18, w: 40, h: 92, life: 60, pierce: true, cd: 30, hit: { dmg: 45, stun: 18, kb: [9, -2] } }),
      F: SP.slam({ name: 'Bass Drop', hop: 14, vx: 9, dive: 28, shockR: 220, hit: { dmg: 70, stun: 26, kb: [5, 10], spike: true, knockdown: true }, shock: { dmg: 35, stun: 24, kb: [9, -8] } }),
      U: SP.rising({ name: 'Sonic Rise', vy: 20, multi: 4, hit: { dmg: 22, stun: 14, kb: [2, -10] } }),
      D: SP.counter({ name: 'Feedback', window: 22, reflect: true, cd: 40, strike: { dmg: 70, stun: 30, kb: [14, -6] } }),
    },
    super: SUPER('beam', { name: 'Encore', vis: 'soundbeam', len: 1050, thick: 170, dur: 36, multi: 4, startup: 16, hit: { dmg: 29, stun: 16, kb: [9, -2] } }),
  }),
  C({
    id: 'sahar', name: 'SAHAR', title: 'The Dune Walker', element: 'Sand', color: '#ffcc80', size: 1.0,
    blurb: 'Shotgun sand blasts, quicksand traps and a blinding storm.',
    look: { skin: '#c68642', primary: '#e0a96d', secondary: '#fff3e0', pants: '#795548', hair: '#3e2723', style: 'wrap', acc: 'scarf', accColor: '#fff3e0' },
    stats: { hp: 1000, walk: 7.8 },
    specials: {
      N: SP.projectile({ name: 'Sand Blast', vis: 'sand', count: 5, spread: 1.8, speed: 16, life: 28, w: 26, h: 20, cd: 24, sfx: 'whoosh', hit: { dmg: 15, stun: 13, kb: [4, -1] } }),
      F: SP.trap({ name: 'Quicksand', vis: 'quicksand', w: 170, h: 26, dist: 200, max: 1, cd: 55, explode: { w: 170, h: 90, life: 10 }, hit: { dmg: 20, stun: 45, kb: [0, 0], effect: slow(180) } }),
      U: SP.pillar({ name: 'Sand Spire', vis: 'sandpillar', delay: 20, w: 82, h: 250, cd: 45, hit: { dmg: 60, stun: 28, kb: [2, -16] } }),
      D: SP.buff({ name: 'Mirage', type: 'speed', dur: 300, cd: 480, label: 'SPEED UP' }),
    },
    super: SUPER('aoe', { name: 'Desert Storm', vis: 'sandstorm', r: 600, h: 380, dur: 60, multi: 6, startup: 16, sfx: 'whoosh', hit: { dmg: 24, stun: 18, kb: [3, -4], effect: slow(180) } }),
  }),
  C({
    id: 'magna', name: 'MAGNA', title: 'The Lava Brute', element: 'Magma', color: '#ff7043', size: 1.15,
    blurb: 'Huge damage, armored charges and burning lava everywhere.',
    look: { skin: '#5d4037', primary: '#bf360c', secondary: '#ffab00', pants: '#212121', hair: '#ff6f00', style: 'flame', acc: 'pads', accColor: '#3e2723' },
    stats: { hp: 1150, walk: 6.8, run: 11, jump: 16.2, airDash: 0, dash: 18, weight: 1.3, power: 1.18, airSpeed: 6.8 },
    specials: {
      N: SP.projectile({ name: 'Magma Glob', vis: 'lava', speed: 11, vy: -9, gravity: 0.5, w: 46, h: 46, cd: 32, hit: { dmg: 70, stun: 24, kb: [8, -6], effect: burn(150, 4) } }),
      F: SP.rush({ name: 'Eruption Charge', speed: 19, dur: 16, armor: true, trail: '#ff7043', hit: { dmg: 85, stun: 26, kb: [14, -8], effect: burn() } }),
      U: SP.rising({ name: 'Volcano', vy: 17, multi: 5, color: '#ff7043', hit: { dmg: 22, stun: 14, kb: [2, -9], effect: burn(60) } }),
      D: SP.trap({ name: 'Lava Pool', vis: 'lavapool', w: 150, h: 24, dist: 150, max: 2, cd: 50, explode: { w: 150, h: 120, life: 10 }, hit: { dmg: 45, stun: 26, kb: [2, -11], effect: burn(180, 5) } }),
    },
    super: SUPER('rain', { name: 'Meteor Storm', vis: 'meteor', count: 7, interval: 8, w: 84, h: 84, speed: 22, slant: 7, spread: 240, hit: { dmg: 50, stun: 24, kb: [6, -8], effect: burn() } }),
  }),
  C({
    id: 'chrono', name: 'CHRONO', title: 'The Time Keeper', element: 'Time', color: '#ffd54f', size: 0.96,
    blurb: 'Boomerang clock blades, blinks, and a super that stops time itself.',
    look: { skin: '#ffe0b2', primary: '#4a148c', secondary: '#ffd54f', pants: '#1a1a2e', hair: '#b0bec5', style: 'slick', acc: 'monocle', accColor: '#ffd54f' },
    stats: { hp: 980, walk: 8 },
    specials: {
      N: SP.projectile({ name: 'Clock Blade', vis: 'clock', speed: 16, boomerang: 26, life: 72, pierce: true, rehit: 22, w: 46, h: 46, cd: 34, hit: { dmg: 38, stun: 18, kb: [5, -3] } }),
      F: SP.teleport({ name: 'Blink', dest: 'forward', dist: 290, cd: 28 }),
      U: SP.rising({ name: 'Rewind Rise', vy: 18, hit: { dmg: 58, stun: 24, kb: [2, -13] } }),
      D: SP.aoe({ name: 'Slow Field', vis: 'clockring', r: 250, dur: 8, cd: 80, sfx: 'zap', hit: { dmg: 20, stun: 14, kb: [2, -2], effect: slow(240) } }),
    },
    super: SUPER('aoe', { name: 'Time Stop', vis: 'timestop', r: 2400, h: 1600, dur: 4, startup: 18, sfx: 'zap', hit: { dmg: 60, stun: 20, kb: [0, 0], unblockable: true, effect: freeze(150, true) } }),
  }),
  C({
    id: 'viper', name: 'VIPER', title: 'The Venom Fang', element: 'Poison', color: '#c6ff00', size: 0.98,
    blurb: 'Every touch is toxic. Poison ticks while you try to escape.',
    look: { skin: '#c5e1a5', primary: '#558b2f', secondary: '#cddc39', pants: '#1b5e20', hair: '#33691e', style: 'long', acc: 'mask', accColor: '#1b5e20' },
    stats: { hp: 960, walk: 8.5, dash: 23 },
    specials: {
      N: SP.projectile({ name: 'Venom Spit', vis: 'venom', speed: 14, vy: -3, gravity: 0.18, w: 30, h: 30, cd: 20, hit: { dmg: 30, stun: 18, kb: [5, -2], effect: poison() } }),
      F: SP.rush({ name: 'Serpent Strike', speed: 26, dur: 10, hit: { dmg: 60, stun: 22, kb: [10, -5], effect: poison() } }),
      U: SP.rising({ name: 'Coil Spring', vy: 20, hit: { dmg: 58, stun: 24, kb: [3, -13], effect: poison(120) } }),
      D: SP.trap({ name: 'Toxic Cloud', vis: 'cloud', w: 170, h: 150, dist: 140, max: 1, cd: 55, explode: { w: 190, h: 170, life: 40 }, hit: { dmg: 25, stun: 18, kb: [1, -2], effect: poison(360, 3) } }),
    },
    super: SUPER('projectile', { name: 'Hydra', vis: 'serpent', count: 3, interval: 7, speed: 18, w: 92, h: 60, big: true, pierce: true, startup: 14, hit: { dmg: 65, stun: 24, kb: [8, -6], effect: poison() } }),
  }),
  C({
    id: 'lumi', name: 'LUMI', title: 'The Radiant Monk', element: 'Light', color: '#fff59d', size: 0.98,
    blurb: 'Lances of light and a power-up blessing. Judgment falls from the sky.',
    look: { skin: '#fff3e0', primary: '#fafafa', secondary: '#ffca28', pants: '#e0e0e0', hair: '#ffe082', style: 'bob', acc: 'halo', accColor: '#ffeb3b' },
    stats: { hp: 980, walk: 8.1 },
    specials: {
      N: SP.beam({ name: 'Light Lance', vis: 'light', len: 620, thick: 24, dur: 5, startup: 12, cd: 28, sfx: 'zap', hit: { dmg: 60, stun: 22, kb: [9, -3] } }),
      F: SP.teleport({ name: 'Radiant Step', dest: 'forward', dist: 230, cd: 36, strike: { dmg: 48, stun: 22, kb: [9, -6] } }),
      U: SP.rising({ name: 'Halo Ascend', vy: 19, multi: 4, hit: { dmg: 22, stun: 14, kb: [2, -10] } }),
      D: SP.buff({ name: 'Blessing', type: 'power', dur: 300, cd: 520, label: 'POWER UP' }),
    },
    super: SUPER('pillar', { name: 'Judgment', vis: 'lightpillar', count: 5, spacing: 150, stagger: 5, delay: 10, w: 110, h: 900, hit: { dmg: 62, stun: 30, kb: [1, -14] } }),
  }),
];
