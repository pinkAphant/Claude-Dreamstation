import { P, W, type Game, type GameState, type Rng } from "../core";

interface S extends GameState {
  /** Cell indices (y * COLS + x), head first. */
  body: number[];
  dir: number;
  queue: number[];
  food: number;
  eaten: number;
  charge: number;
  flash: number;
  t: number;
}

const C = 10;
const COLS = 18;
const ROWS = 21;
const OY = 28;
const MAX = 40;
const KEEP = 4;
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

function place(s: S, r: Rng): number {
  for (let n = 0; n < 500; n++) {
    const c = r.i(COLS * ROWS);
    if (!s.body.includes(c)) return c;
  }
  for (let c = 0; c < COLS * ROWS; c++) if (!s.body.includes(c)) return c;
  return 0;
}

export const contextWindow: Game<S> = {
  id: "claude-02-context",
  num: "02",
  title: ["CONTEXT", "WINDOW"],
  sub: "GROW THE THREAD",
  accent: P.sky,
  help: [
    ["stick", "STEER THE THREAD"],
    ["s", "COMPACT WHEN CHARGED"],
    ["any", "FULL WINDOW = OVER"],
  ],

  init(r) {
    const s: S = {
      score: 0, over: false, body: [186, 185, 184, 183], dir: 0, queue: [],
      food: 0, eaten: 0, charge: 5, flash: 0, t: 0,
    };
    s.food = place(s, r);
    return s;
  },

  step(s, i, r, sfx) {
    s.t++;
    if (s.flash) s.flash--;
    const want = i.pr ? 0 : i.pd ? 1 : i.pl ? 2 : i.pu ? 3 : -1;
    if (want >= 0 && s.queue.length < 2) {
      const last = s.queue.length ? s.queue[s.queue.length - 1]! : s.dir;
      if (want !== last && want !== (last + 2) % 4) s.queue.push(want);
    }
    if (i.ps && s.charge >= 5 && s.body.length > KEEP) {
      s.score += (s.body.length - KEEP) * 5;
      s.body.length = KEEP;
      s.charge = 0;
      s.flash = 20;
      sfx("great");
    }
    if (s.t % Math.max(5, 11 - Math.floor(s.eaten / 5))) return;

    const die = (why: string) => {
      s.over = true;
      s.cause = why;
    };
    if (s.queue.length) s.dir = s.queue.shift()!;
    const hx = (s.body[0]! % COLS) + DX[s.dir]!;
    const hy = Math.floor(s.body[0]! / COLS) + DY[s.dir]!;
    if (hx < 0 || hx >= COLS || hy < 0 || hy >= ROWS) return die("HIT THE EDGE");
    const c = hy * COLS + hx;
    const grow = c === s.food;
    if (!grow) s.body.pop(); // the tail cell is free the moment the head moves
    if (s.body.includes(c)) return die("TANGLED");
    s.body.unshift(c);
    if (!grow) return;
    s.eaten++;
    s.score += 10 + s.body.length;
    s.charge = Math.min(5, s.charge + 1);
    sfx("good");
    if (s.body.length >= MAX) return die("CONTEXT FULL");
    s.food = place(s, r);
  },

  draw(g, s) {
    const fill = s.body.length / MAX;
    g.text("CTX", 3, 16, P.dim);
    g.box(23, 16, 66, 7, P.mute);
    g.rect(24, 17, Math.round(64 * fill), 5, fill > 0.75 ? P.red : P.sky);
    for (let k = 0; k < 5; k++) g.rect(94 + k * 5, 17, 4, 5, k < s.charge ? P.gold : P.mute);
    if (s.charge >= 5) {
      g.control("s", 122, 15, P.gold);
      if ((s.t >> 4) & 1) g.text("COMPACT", 135, 16, P.gold);
    }

    g.box(0, OY - 1, W, ROWS * C + 2, s.flash ? P.gold : P.mute);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) g.rect(x * C + 5, OY + y * C + 5, 1, 1, P.mute);
    const fx = (s.food % COLS) * C;
    const fy = OY + Math.floor(s.food / COLS) * C;
    g.rect(fx + 2, fy + 2, 6, 6, (s.t >> 3) & 1 ? P.ink : P.kraft);
    for (let k = s.body.length - 1; k >= 0; k--) {
      const x = (s.body[k]! % COLS) * C;
      const y = OY + Math.floor(s.body[k]! / COLS) * C;
      g.rect(x + 1, y + 1, 8, 8, k === 0 ? P.clay : k % 2 ? P.sky : "#557fa8");
      if (k === 0) {
        g.rect(x + 2, y + 3, 2, 2, P.bg);
        g.rect(x + 6, y + 3, 2, 2, P.bg);
      }
    }
  },

  icon(g, t) {
    const path = [0, 1, 2, 3, 4, 5, 6, 7];
    const head = Math.floor(t / 10) % 12;
    for (const k of path) {
      const c = head - k;
      if (c < 0 || c > 10) continue;
      g.rect(36 + c * 10, 120, 8, 8, k === 0 ? P.clay : k % 2 ? P.sky : "#557fa8");
    }
    g.box(30, 112, 120, 24, P.mute);
    if ((t >> 3) & 1) g.rect(140, 121, 6, 6, P.ink);
  },
};
