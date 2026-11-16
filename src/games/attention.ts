import { P, type Game, type GameState } from "../core";

interface S extends GameState {
  lives: number;
  /** dir 0..3 = north, west, east, south; d = distance from centre. */
  notes: { dir: number; d: number }[];
  since: number;
  hits: number;
  combo: number;
  glow: number[];
  pulse: number;
  fb: string;
  fbT: number;
  t: number;
}

const CX = 90;
const CY = 128;
const R0 = 24;
const START = 100;
const WIN = 10;
const VX = [0, -1, 1, 0];
const VY = [-1, 0, 0, 1];
const COL = [P.sky, P.gold, P.fig, P.olive];

export const attention: Game<S> = {
  id: "claude-06-attention",
  num: "06",
  title: ["ATTENTION"],
  sub: "IS ALL YOU NEED",
  accent: P.fig,
  help: [
    ["any", "HIT AS TOKENS LAND"],
    ["stick", "STICK WORKS TOO"],
    ["any", "5 MISSES = OVER"],
  ],

  init: () => ({
    score: 0, over: false, lives: 5, notes: [], since: 30, hits: 0, combo: 0,
    glow: [0, 0, 0, 0], pulse: 0, fb: "", fbT: 0, t: 0,
  }),

  step(s, i, r, sfx) {
    s.t++;
    if (s.pulse) s.pulse--;
    if (s.fbT) s.fbT--;
    const level = Math.floor(s.hits / 10);
    const v = Math.min(1.9, 1 + level * 0.09);
    if (--s.since <= 0) {
      s.since = Math.max(16, 46 - level * 3);
      const dir = r.i(4);
      s.notes.push({ dir, d: START });
      if (level >= 4 && r.chance(0.15)) s.notes.push({ dir: (dir + 1 + r.i(3)) % 4, d: START });
    }

    const say = (text: string) => {
      s.fb = text;
      s.fbT = 30;
    };
    const press = [i.pn || i.pu, i.pw || i.pl, i.pe || i.pr, i.ps || i.pd];
    for (let k = 0; k < 4; k++) {
      if (s.glow[k]) s.glow[k]!--;
      if (!press[k]) continue;
      s.glow[k] = 8;
      let hit = -1;
      s.notes.forEach((n, idx) => {
        if (n.dir === k && (hit < 0 || Math.abs(n.d - R0) < Math.abs(s.notes[hit]!.d - R0))) hit = idx;
      });
      const err = hit < 0 ? 99 : Math.abs(s.notes[hit]!.d - R0);
      if (err > WIN) {
        s.combo = 0;
        continue;
      }
      s.notes.splice(hit, 1);
      s.hits++;
      s.combo++;
      s.pulse = 8;
      const perfect = err <= 4;
      s.score += (perfect ? 30 : 10) * Math.min(4, 1 + Math.floor(s.combo / 10));
      say(perfect ? "PERFECT" : "GOOD");
      sfx(perfect ? "great" : "good");
    }
    for (let k = s.notes.length - 1; k >= 0; k--) {
      const n = s.notes[k]!;
      n.d -= v;
      if (n.d >= R0 - WIN) continue;
      s.notes.splice(k, 1);
      s.lives--;
      s.combo = 0;
      say("MISS");
      sfx("bad");
    }
    if (s.lives <= 0) {
      s.over = true;
      s.cause = "ATTENTION LOST";
    }
  },

  draw(g, s) {
    for (let k = 0; k < 4; k++) {
      for (let d = R0 + 12; d < START; d += 8) g.rect(CX + VX[k]! * d, CY + VY[k]! * d, 1, 1, P.mute);
      const x = CX + VX[k]! * R0;
      const y = CY + VY[k]! * R0;
      if (s.glow[k]) g.rect(x - 7, y - 7, 14, 14, COL[k]!);
      g.box(x - 7, y - 7, 14, 14, COL[k]!);
    }
    for (const n of s.notes) g.rect(CX + VX[n.dir]! * n.d - 5, CY + VY[n.dir]! * n.d - 5, 10, 10, COL[n.dir]!);
    g.spark(CX, CY, 8 + (s.pulse >> 1), P.clay, s.t * 0.02);
    if (s.fbT) g.text(s.fb, 40, 18, s.fb === "MISS" ? P.red : P.ink, 1, 0.5);
    if (s.combo > 1) g.text(`COMBO ${s.combo}`, 140, 18, P.gold, 1, 0.5);
  },

  icon(g, t) {
    const d = 44 - ((t * 0.6) % 34);
    for (let k = 0; k < 4; k++) {
      g.box(90 + VX[k]! * 12 - 5, 124 + VY[k]! * 12 - 5, 10, 10, COL[k]!);
      if (k === Math.floor(t / 57) % 4) g.rect(90 + VX[k]! * d * 1.2 - 3, 124 + VY[k]! * d * 0.62 - 3, 6, 6, COL[k]!);
    }
    g.spark(90, 124, 5, P.clay, t * 0.02, 8);
  },
};
