import { P, type Game, type GameState, type SfxName } from "../core";
import type { Gfx } from "../gfx";

interface S extends GameState {
  lives: number;
  seq: number[];
  phase: "show" | "input" | "win" | "fail";
  /** Next index the player must enter. */
  k: number;
  pt: number;
  lit: number;
  litT: number;
  t: number;
}

/** Diamond order matches the deck: north, west, east, south. */
const PADS = [
  { x: 72, y: 56, label: "READ", c: P.sky, k: "n" },
  { x: 24, y: 104, label: "EDIT", c: P.gold, k: "w" },
  { x: 120, y: 104, label: "BASH", c: P.fig, k: "e" },
  { x: 72, y: 152, label: "TEST", c: P.olive, k: "s" },
] as const;
const TONE: SfxName[] = ["n0", "n1", "n2", "n3"];
const LEAD = 30;
const LIMIT = 300;

function pads(g: Gfx, lit: number): void {
  PADS.forEach((p, n) => {
    const on = n === lit;
    g.rect(p.x, p.y, 36, 32, on ? p.c : P.hud);
    g.box(p.x, p.y, 36, 32, p.c);
    g.control(p.k, p.x + 14, p.y + 5, on ? P.bg : p.c);
    g.text(p.label, p.x + 18, p.y + 19, on ? P.bg : p.c, 1, 0.5);
  });
}

export const toolCall: Game<S> = {
  id: "claude-04-tools",
  num: "04",
  title: ["TOOL", "CALL"],
  sub: "REPEAT THE CALL CHAIN",
  accent: P.gold,
  help: [
    ["any", "WATCH THE CHAIN"],
    ["any", "THEN PLAY IT BACK"],
    ["stick", "STICK WORKS TOO"],
  ],

  init: (r) => ({
    score: 0, over: false, lives: 3, seq: [r.i(4), r.i(4)], phase: "show",
    k: 0, pt: 0, lit: -1, litT: 0, t: 0,
  }),

  step(s, i, r, sfx) {
    s.t++;
    if (s.litT && --s.litT === 0) s.lit = -1;
    s.pt++;
    if (s.phase === "show") {
      const on = Math.max(10, 26 - s.seq.length);
      const u = s.pt - LEAD;
      if (u < 0) return;
      const idx = Math.floor(u / (on + 6));
      if (idx >= s.seq.length) {
        s.phase = "input";
        s.k = 0;
        s.pt = 0;
      } else if (u % (on + 6) === 0) {
        s.lit = s.seq[idx]!;
        s.litT = on;
        sfx(TONE[s.lit]!);
      }
    } else if (s.phase === "input") {
      const press = i.pn || i.pu ? 0 : i.pw || i.pl ? 1 : i.pe || i.pr ? 2 : i.ps || i.pd ? 3 : -1;
      if (press < 0 && s.pt <= LIMIT) return;
      if (press === s.seq[s.k]) {
        s.lit = press;
        s.litT = 10;
        s.score += 10;
        s.pt = 0;
        sfx(TONE[press]!);
        if (++s.k === s.seq.length) {
          s.score += 25 * s.seq.length;
          s.phase = "win";
        }
      } else {
        s.lives--;
        s.lit = -1;
        s.phase = "fail";
        s.pt = 0;
        sfx("bad");
      }
    } else if (s.phase === "win") {
      if (s.pt === 16) sfx("great");
      if (s.pt > 50) {
        s.seq.push(r.i(4));
        s.phase = "show";
        s.pt = 0;
      }
    } else if (s.pt > 60) {
      if (s.lives <= 0) {
        s.over = true;
        s.cause = "CHAIN BROKEN";
      } else {
        s.phase = "show";
        s.pt = 0;
      }
    }
  },

  draw(g, s) {
    const head = { show: "WATCH", input: "YOUR TURN", win: "NICE!", fail: "WRONG CALL" }[s.phase];
    const col = { show: P.dim, input: P.ink, win: P.olive, fail: P.red }[s.phase];
    g.text(head, 90, 22, col, 2, 0.5);
    pads(g, s.lit);
    g.spark(90, 120, 9, s.phase === "fail" ? P.red : P.clay, s.t * 0.02);

    const n = s.seq.length;
    const step = Math.min(8, Math.floor(160 / n));
    const x0 = 90 - (n * step) / 2;
    const filled = s.phase === "input" ? s.k : s.phase === "win" ? n : 0;
    for (let k = 0; k < n; k++) g.rect(x0 + k * step, 196, step - 2, 4, k < filled ? P.gold : P.mute);
    if (s.phase === "input") g.rect(30, 208, Math.round(120 * (1 - s.pt / LIMIT)), 2, P.dim);
    g.text(`CHAIN ${n}`, 90, 222, P.dim, 1, 0.5);
  },

  icon(g, t) {
    const lit = Math.floor(t / 24) % 4;
    const at = [[90, 104], [66, 124], [114, 124], [90, 144]] as const;
    PADS.forEach((p, n) => {
      const [x, y] = at[n]!;
      g.rect(x - 10, y - 8, 20, 16, n === lit ? p.c : P.hud);
      g.box(x - 10, y - 8, 20, 16, p.c);
    });
  },
};
