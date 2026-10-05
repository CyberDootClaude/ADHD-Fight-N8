// Arcade mode: a ladder of 7 CPU fights that get harder as you climb. The
// 6th fight is your character's rival and the last is the boss, NULL.
// Each character has a short intro, a line for their rival and an ending.

const ARCADE_LEVELS = ['easy', 'easy', 'normal', 'normal', 'hard', 'hard', 'boss'];
const ARCADE_LEVEL_NAMES = { easy: 'ROOKIE', normal: 'CONTENDER', hard: 'CHAMPION', boss: 'FINAL BOSS' };

const ARCADE_STORY = {
  kaze: {
    rival: 'volta',
    intro: 'The last wind monk of the Sky Temple heard of a tournament where the fastest fighter in the world would be crowned. Kaze has never lost a race.',
    rivalLine: "Volta. They say lightning is faster than wind. Let's settle it.",
    ending: 'Kaze returns to the Sky Temple and rings the old bell for the first time in a hundred years. The wind answers from every direction, and new students begin to climb the mountain.',
  },
  ember: {
    rival: 'nivia',
    intro: "Ember was thrown out of every dojo for setting the training mats on fire. The tournament doesn't care about mats. Ember is fired up.",
    rivalLine: 'Nivia! Every time I get warmed up, you show up and put me out.',
    ending: 'Ember opens a dojo with fireproof mats and a sign over the door: "Burn bright." The waiting list is three years long.',
  },
  marina: {
    rival: 'magna',
    intro: 'The tides have been wrong for months. Marina follows the strange currents to a tournament where something is pulling at the whole world.',
    rivalLine: "Magna, your lava is boiling my ocean. That ends today.",
    ending: 'With NULL defeated, the tides settle back into their rhythm. Marina dances on the waves at sunrise, and the sea dances back.',
  },
  granite: {
    rival: 'ferrus',
    intro: 'Granite has not moved from the mountain pass in forty years. Then the mountain started to crack. Granite walked down to find out why.',
    rivalLine: 'Ferrus. Iron is only stone that forgot where it came from.',
    ending: 'Granite carries the last shard of NULL back to the pass and seals it under the mountain, then sits down again. Another forty years, at least.',
  },
  volta: {
    rival: 'kaze',
    intro: "Volta has never been hit. Not once. Volta enters the tournament mostly to keep it that way, and partly because it's fun.",
    rivalLine: 'Kaze! Wind is just air that thinks it is fast. Watch this.',
    ending: 'Volta circles the world in a single night, just to prove it can. The storm that follows is the brightest anyone has ever seen.',
  },
  nivia: {
    rival: 'ember',
    intro: 'The Frost Queen came down from the north because something is melting her glaciers from the inside. She intends to freeze the problem solid.',
    rivalLine: 'Ember. Must you be so... loud? And so hot?',
    ending: 'Nivia rebuilds her ice palace, bigger than before. She leaves one window open, facing south, in case Ember ever visits.',
  },
  umbra: {
    rival: 'lumi',
    intro: "Nobody invited Umbra to the tournament. Nobody ever invites Umbra. That's never stopped Umbra before.",
    rivalLine: "Lumi. Your light makes shadows too, you know. That's where I live.",
    ending: 'When NULL falls, its darkness has nowhere to go but into the shadows. Umbra keeps it there and guards it, unseen, forever.',
  },
  thorn: {
    rival: 'viper',
    intro: 'The forest is sick. Thorn traced the rot to the tournament grounds and grew a path straight through the arena wall.',
    rivalLine: 'Viper, your poison is in my roots. I will pull it out.',
    ending: 'Thorn plants a single seed where NULL vanished. Within a week it has grown into a forest, and nothing rots there ever again.',
  },
  ferrus: {
    rival: 'granite',
    intro: 'The Iron Knight swore an oath to protect the realm from anything that would unmake it. Ferrus has been polishing the armor for this day.',
    rivalLine: 'Granite. Stone breaks. Iron bends and holds. Let us see.',
    ending: 'Ferrus forges a new shield from the iron of the arena gates and hangs it at the realm\'s border. Anything that wants to unmake the world will have to get past it first.',
  },
  nova: {
    rival: 'chrono',
    intro: 'Nova fell from the sky as a child and has been looking for the way home ever since. The stars say the answer is at the tournament.',
    rivalLine: "Chrono, you keep looking at your watch. Am I late for something?",
    ending: 'NULL\'s void opens a doorway to the stars. Nova looks through it for a long time, then closes it. Home, it turns out, is here.',
  },
  echo: {
    rival: 'sahar',
    intro: 'Echo has sold out every arena on the continent. The tournament is the only stage left that is big enough.',
    rivalLine: "Sahar! The desert is so quiet. Let's make some noise.",
    ending: 'Echo\'s victory concert is heard on every continent at once. Even NULL\'s silence becomes the rest between the beats.',
  },
  sahar: {
    rival: 'echo',
    intro: 'Sahar has walked the Endless Dunes alone for years. The sand carries whispers of a tournament, and Sahar is tired of walking.',
    rivalLine: 'Echo. The desert has been silent for a thousand years. Lower your voice.',
    ending: 'Sahar buries NULL\'s last whisper under the deepest dune. The desert stays silent, the way Sahar likes it, but now there is a road across it.',
  },
  magna: {
    rival: 'marina',
    intro: 'Magna heard there was a tournament full of things to smash. That is the whole story.',
    rivalLine: 'MARINA! You put out my lava. MAGNA SMASH WATER.',
    ending: 'Magna smashes NULL, then the trophy, then the arena. Everyone agrees it was the best tournament ever. Magna is not invited back.',
  },
  chrono: {
    rival: 'nova',
    intro: 'Chrono has watched this tournament end ten thousand times. It always ends with the world unmade. This time, Chrono is fighting in it.',
    rivalLine: 'Nova, you fell from the sky at exactly the wrong moment. Or exactly the right one.',
    ending: 'For the first time in ten thousand loops, the clock ticks past midnight. Chrono puts the watch away and has absolutely no idea what happens next.',
  },
  viper: {
    rival: 'thorn',
    intro: 'Viper was hired to poison the tournament favorite. Viper decided it would be easier to just win.',
    rivalLine: "Thorn. Your little garden is so easy to poison.",
    ending: 'Viper collects the prize money, then the bounty on NULL, then a third payment nobody can explain. Viper retires somewhere warm.',
  },
  lumi: {
    rival: 'umbra',
    intro: 'Lumi saw a darkness rising behind the tournament and walked into the arena carrying nothing but light.',
    rivalLine: 'Umbra. Step out of the shadows. I can see you anyway.',
    ending: 'Lumi lights a lantern where NULL fell and leaves it burning. Travelers say it never goes out, and that it is warm, even in winter.',
  },
};

// The boss: NULL, the Void Emperor. It steals the best moves from the roster.
const R_ID = (id) => ROSTER.find((d) => d.id === id);
const ARCADE_BOSS = C({
  id: 'null', name: 'NULL', title: 'The Void Emperor', element: 'Void', color: '#b388ff', size: 1.12,
  blurb: 'An emptiness that learned to fight by copying everyone it swallowed.',
  look: { skin: '#1a1033', primary: '#12002b', secondary: '#b388ff', pants: '#0a0014', hair: '#000', style: 'hood', acc: 'crown', accColor: '#b388ff' },
  stats: { hp: 1100, walk: 8.0, run: 13, power: 0.94, weight: 1.08 },
  specials: {
    N: R_ID('nova').specials.N,
    F: R_ID('umbra').specials.F,
    U: R_ID('kaze').specials.U,
    D: R_ID('magna').specials.D,
  },
  super: R_ID('chrono').super,
  intro: 'I have swallowed sixteen worlds. Yours is the seventeenth.',
});
ARCADE_BOSS.win = { pose: 'float', quotes: ['Return to nothing.', 'Another world, unmade.', 'You were never here.'] };
SPARK_STYLE.Void = { type: 'slash', alt: '#000000', grav: 0, n: 0.8 };
AI_LEVELS.boss = { react: 5, block: 0.8, aggro: 0.78, combo: 0.9, special: 0.5, think: 4, flow: 0.2, height: 0.95, punish: 0.85, adapt: 1, style: 1 };

const ARCADE_KEY = 'adhd-fight-arcade';

Object.assign(Game, {
  // Build the ladder after the player picks a fighter.
  startArcade() {
    const me = ROSTER[this.lastPicks[0]];
    const story = ARCADE_STORY[me.id];
    const rival = R_ID(story.rival);
    const pool = ROSTER.filter((d) => d !== me && d !== rival);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = U.randi(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const ladder = pool.slice(0, 5).concat([rival, ARCADE_BOSS]);
    this.arc = {
      me, story, ladder, i: 0, score: 0, continues: 0, perfects: 0, frames: 0,
      // the boss always waits on the Void Throne
      stages: ladder.map((d, i) => (i === ladder.length - 1 ? Math.max(0, STAGES.findIndex((st) => st.name === 'Void Throne')) : U.pick(Profile.openStages()))),
    };
    this.go('arcadeIntro');
  },

  startArcadeFight() {
    const a = this.arc;
    const opp = a.ladder[a.i];
    this.stageIdx = a.stages[a.i];
    this.inputs = [new PlayerInput(), new PlayerInput()];
    this.match = new Match({
      defs: [Profile.dress(a.me, Profile.costumeOf(a.me.id)), opp],
      stage: this.stageIdx,
      inputs: this.inputs,
      ai: [null, new AIController(ARCADE_LEVELS[a.i])],
      winsNeeded: ROUNDS[this.settings.rounds],
      mergeKeys: true,
      classic: this.settings.style === 1,
    });
    this.paused = false;
    this.pauseView = null;
    this.go('fight');
  },

  // Called when an arcade match ends.
  arcadeMatchOver(m) {
    const a = this.arc;
    a.frames += m.frame;
    if (m.winner === m.f[0]) {
      const f = m.f[0];
      const hpBonus = Math.round((f.hp / f.maxHp) * 1000);
      const perfect = m.perfectRounds[0];
      a.score += 1000 * (a.i + 1) + hpBonus + perfect * 2000;
      a.perfects += perfect;
      a.lastBonus = { base: 1000 * (a.i + 1), hp: hpBonus, perfect: perfect * 2000 };
      a.i++;
      if (a.i >= a.ladder.length) {
        this.saveArcadeClear();
        this.go('arcadeEnd');
      } else this.go('arcadeVs');
    } else {
      this.go('arcadeContinue');
    }
  },

  saveArcadeClear() {
    const a = this.arc;
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(ARCADE_KEY) || '{}');
    } catch (e) { /* ignore */ }
    const prev = data[a.me.id] || {};
    a.newBest = !prev.best || a.score > prev.best;
    data[a.me.id] = { clears: (prev.clears || 0) + 1, best: Math.max(prev.best || 0, a.score) };
    try {
      localStorage.setItem(ARCADE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
    if (this.onArcadeClear) this.onArcadeClear(a);
  },

  arcadeRecords() {
    try {
      return JSON.parse(localStorage.getItem(ARCADE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  updateArcade(n) {
    const a = this.arc;
    switch (this.scene) {
      case 'arcadeIntro':
        if (this.sceneT > 20 && n.ok) {
          SFX.play('confirm');
          this.go('arcadeVs');
        } else if (n.back) {
          SFX.play('back');
          this.startSelect();
        }
        break;
      case 'arcadeVs':
        if (this.sceneT > 30 && (n.ok || this.sceneT > 240)) {
          SFX.play('confirm');
          this.startArcadeFight();
        }
        break;
      case 'arcadeContinue': {
        const left = 10 - Math.floor(this.sceneT / 60);
        if (n.ok && this.sceneT > 20) {
          SFX.play('confirm');
          a.continues++;
          a.score = Math.floor(a.score / 2);
          this.startArcadeFight();
        } else if (n.back || left < 0) {
          SFX.play('back');
          this.go('arcadeOver');
        }
        break;
      }
      case 'arcadeOver':
      case 'arcadeEnd':
        if (this.sceneT > 60 && (n.ok || n.back)) {
          SFX.play('confirm');
          this.go('title');
        }
        break;
    }
  },

  drawArcade(ctx) {
    const a = this.arc;
    const t = this.t;
    const T = this.sceneT;
    switch (this.scene) {
      case 'arcadeIntro': {
        this.drawBackdrop(ctx, a.stages[0], 0.7);
        txt(ctx, 'ARCADE', VIEW_W / 2, 70, 60, '#ffd600');
        glow(ctx, 250, 470, 200, a.me.color, 0.35);
        drawFigure(ctx, a.me, victoryPose(a.me, T), 250, 600, 1, 1.9 / a.me.size * (0.85 + a.me.size * 0.15), { t });
        txt(ctx, a.me.name, 250, 140, 48, a.me.color, 'center', 6);
        txt(ctx, a.me.title.toUpperCase(), 250, 175, 20, '#fff', 'center', 3, 700, 'sans-serif');
        this.wrap(ctx, a.story.intro, 470, 150, 740, 24, '#ffffff');
        this.drawLadder(ctx, 470, 380, 0);
        if (T > 20) this.button(ctx, 'START', VIEW_W - 260, 630, 200, 54, () => (this.mouseQ.ok = true), 30);
        this.button(ctx, '◀ BACK', 20, 16, 120, 40, () => (this.mouseQ.back = true));
        break;
      }
      case 'arcadeVs': {
        const opp = a.ladder[a.i];
        const boss = opp === ARCADE_BOSS;
        const rival = a.i === a.ladder.length - 2;
        this.drawBackdrop(ctx, a.stages[a.i], boss ? 0.85 : 0.6);
        const slide = Math.min(1, T / 20);
        glow(ctx, 300, 470, 220, a.me.color, 0.35);
        glow(ctx, 980, 470, 220, opp.color, 0.35);
        drawFigure(ctx, a.me, POSES.idle, 300 - (1 - slide) * 400, 620, 1, 2.0 / a.me.size * (0.85 + a.me.size * 0.15), { t });
        drawFigure(ctx, opp, boss ? victoryPose(opp, T) : POSES.idle, 980 + (1 - slide) * 400, 620, -1, 2.0 / opp.size * (0.85 + opp.size * 0.15), { t });
        txt(ctx, `STAGE ${a.i + 1} / ${a.ladder.length}`, VIEW_W / 2, 60, 34, '#ffd600');
        if (a.lastBonus && a.i > 0 && T < 200) {
          const b = a.lastBonus;
          txt(ctx, `CLEAR +${b.base}   HEALTH +${b.hp}${b.perfect ? `   PERFECT +${b.perfect}` : ''}`, VIEW_W / 2, 100, 22, '#b9f6ca', 'center', 4, 700, 'sans-serif');
        }
        txt(ctx, 'VS', VIEW_W / 2, 330, 120 + Math.sin(t * 0.2) * 6, '#ff1744', 'center', 10);
        txt(ctx, a.me.name, 300, 200, 48, a.me.color, 'center', 6);
        txt(ctx, opp.name, 980, 200, 48, opp.color, 'center', 6);
        const tag = boss ? 'FINAL BOSS' : rival ? 'RIVAL' : ARCADE_LEVEL_NAMES[ARCADE_LEVELS[a.i]];
        txt(ctx, tag, 980, 236, 24, boss || rival ? '#ff5252' : '#fff', 'center', 4);
        const line = boss ? opp.intro : rival ? a.story.rivalLine : null;
        if (line) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(140, 640, 1000, 64);
          const who = boss ? opp : a.me;
          txt(ctx, `${who.name}: “${line}”`, VIEW_W / 2, 680, 22, '#ffffff', 'center', 3, 700, 'sans-serif');
        }
        txt(ctx, `SCORE ${a.score}`, VIEW_W / 2, 140, 26, '#fff', 'center', 4);
        if (T > 30) this.hotspot(0, 0, VIEW_W, VIEW_H, null, () => (this.mouseQ.ok = true));
        break;
      }
      case 'arcadeContinue': {
        this.drawBackdrop(ctx, a.stages[a.i], 0.85);
        const left = Math.max(0, 10 - Math.floor(T / 60));
        txt(ctx, 'CONTINUE?', VIEW_W / 2, 230, 96, '#ffd600', 'center', 8);
        txt(ctx, String(left), VIEW_W / 2, 400, 150, left <= 3 ? '#ff1744' : '#fff', 'center', 10);
        txt(ctx, 'Continuing halves your score', VIEW_W / 2, 470, 22, '#b3e5fc', 'center', 3, 700, 'sans-serif');
        this.button(ctx, 'YES', VIEW_W / 2 - 230, 520, 200, 60, () => (this.mouseQ.ok = true), 34);
        this.button(ctx, 'NO', VIEW_W / 2 + 30, 520, 200, 60, () => (this.mouseQ.back = true), 34);
        break;
      }
      case 'arcadeOver':
        this.drawBackdrop(ctx, a.stages[a.i], 0.9);
        txt(ctx, 'GAME OVER', VIEW_W / 2, 280, 110, '#ff1744', 'center', 10);
        txt(ctx, `${a.me.name} reached stage ${a.i + 1} of ${a.ladder.length}   •   SCORE ${a.score}`, VIEW_W / 2, 360, 28, '#fff', 'center', 4);
        if (T > 60) txt(ctx, 'Press any button', VIEW_W / 2, 600, 24, '#aaa', 'center', 3, 700, 'sans-serif');
        if (T > 60) this.hotspot(0, 0, VIEW_W, VIEW_H, null, () => (this.mouseQ.ok = true));
        break;
      case 'arcadeEnd': {
        this.drawBackdrop(ctx, 0, 0.55);
        glow(ctx, 260, 470, 220, a.me.color, 0.45);
        drawFigure(ctx, a.me, victoryPose(a.me, T), 260, 620, 1, 2.1 / a.me.size * (0.85 + a.me.size * 0.15), { t });
        txt(ctx, 'CONGRATULATIONS!', VIEW_W / 2, 80, 64, '#ffd600', 'center', 7);
        txt(ctx, `${a.me.name} — ${a.me.title.toUpperCase()}`, 820, 160, 30, a.me.color, 'center', 5);
        const shown = a.story.ending.slice(0, Math.floor(T * 1.2));
        this.wrap(ctx, shown, 520, 220, 640, 24, '#ffffff');
        const mins = Math.floor(a.frames / 3600);
        const secs = String(Math.floor(a.frames / 60) % 60).padStart(2, '0');
        txt(ctx, `FINAL SCORE ${a.score}${a.newBest ? '  — NEW BEST!' : ''}`, 820, 520, 34, a.newBest ? '#69f0ae' : '#fff', 'center', 5);
        txt(ctx, `Time ${mins}:${secs}   •   Perfects ${a.perfects}   •   Continues ${a.continues}`, 820, 565, 22, '#b3e5fc', 'center', 3, 700, 'sans-serif');
        if (this.arcadeReward) txt(ctx, `+${this.arcadeReward.fp} FP`, 820, 600, 26, '#ffd54f', 'center', 4);
        if (T > 60) txt(ctx, 'Press any button', 820, 640, 22, '#aaa', 'center', 3, 700, 'sans-serif');
        if (T > 60) this.hotspot(0, 0, VIEW_W, VIEW_H, null, () => (this.mouseQ.ok = true));
        break;
      }
    }
  },

  // The 7 opponents as portraits; `cur` highlights the next fight.
  drawLadder(ctx, x, y, cur) {
    const a = this.arc;
    const r = 40;
    a.ladder.forEach((d, i) => {
      const cx = x + 50 + i * 100;
      const boss = d === ARCADE_BOSS;
      const done = i < a.i;
      ctx.globalAlpha = done ? 0.35 : 1;
      if (boss && i > a.i) {
        ctx.fillStyle = '#12002b';
        ctx.beginPath();
        ctx.arc(cx, y, r, 0, Math.PI * 2);
        ctx.fill();
        txt(ctx, '?', cx, y + 16, 44, '#b388ff', 'center', 4);
      } else drawPortrait(ctx, d, cx, y, r, true);
      ctx.globalAlpha = 1;
      if (i === cur) {
        ctx.strokeStyle = '#ffd600';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      const label = boss ? 'BOSS' : i === a.ladder.length - 2 ? 'RIVAL' : String(i + 1);
      txt(ctx, label, cx, y + r + 28, 18, boss || label === 'RIVAL' ? '#ff5252' : '#fff', 'center', 3);
    });
  },
});
