import { P, W, clamp, type Game, type GameState } from "../core";

interface S extends GameState {
  layers: { x: number; w: number }[];
  x: number;
  w: number;
  dir: number;
  hold: number;
  streak: number;
  debris: { x: number; y: number; w: number; vy: number; c: string }[];
  cam: number;
  fb: number;
  t: number;
}

const BH = 10;
const BASE = 226;
const LO = 2;
const HI = W - 2;
const COLS = [P.clay, P.kraft, P.gold, P.olive, P.teal, P.sky, P.violet, P.fig];
/** Screen y of layer n's top edge before the camera offset. */
const top = (n: number) => BASE - (n + 1) * BH;

export const layerStack: Game<S> = {
  id: "claude-08-layers",
  num: "08",
  title: ["LAYER", "STACK"],
  sub: "BUILD IT DEEPER",
  accent: P.kraft,
  help: [
    ["any", "DROP THE LAYER"],
    ["any", "OVERHANG IS CUT OFF"],
    ["any", "3 PERFECT = WIDER"],
  ],

  init: () => ({
    score: 0, over: false, layers: [{ x: 60, w: 60 }], x: LO, w: 60, dir: 1,
    hold: 0, streak: 0, debris: [], cam: 0, fb: 0, t: 0,
  }),

  step(s, i, _r, sfx) {
    s.t++;
    if (s.fb) s.fb--;
    const n = s.layers.length;
    s.x += s.dir * Math.min(3.4, 1.2 + n * 0.06);
    if (s.x <= LO) {
      s.x = LO;
      s.dir = 1;
    } else if (s.x + s.w >= HI) {
      s.x = HI - s.w;
      s.dir = -1;
    }
    s.cam += (Math.max(0, (n - 11) * BH) - s.cam) * 0.15;
    for (let k = s.debris.length - 1; k >= 0; k--) {
      const d = s.debris[k]!;
      d.y += d.vy;
      d.vy += 0.3;
      if (d.y > 260) s.debris.splice(k, 1);
    }
    // An unattended layer drops by itself after 10 s.
    if (!i.any && ++s.hold <= 600) return;

    const under = s.layers[n - 1]!;
    const col = COLS[n % COLS.length]!;
    const y = top(n) + s.cam;
    let nx = Math.round(s.x);
    let nw = s.w;
    if (Math.abs(nx - under.x) <= 1) {
      nx = under.x;
      s.streak++;
      if (s.streak % 3 === 0 && nw < 60) {
        nw = Math.min(60, nw + 4);
        nx = clamp(nx - 2, LO, HI - nw);
      }
      s.score += 10 + 10 * Math.min(5, s.streak);
      s.fb = 30;
      sfx("great");
    } else {
      const lo = Math.max(nx, under.x);
      const hi = Math.min(nx + nw, under.x + under.w);
      if (hi - lo <= 0) {
        s.debris.push({ x: nx, y, w: nw, vy: 0, c: col });
        s.over = true;
        s.cause = "MISSED THE STACK";
        return;
      }
      s.debris.push({ x: nx < lo ? nx : hi, y, w: nw - (hi - lo), vy: 0, c: col });
      nx = lo;
      nw = hi - lo;
      s.streak = 0;
      s.score += 10;
      sfx("drop");
    }
    s.layers.push({ x: nx, w: nw });
    s.w = nw;
    s.hold = 0;
    s.dir = n % 2 ? -1 : 1;
    s.x = s.dir > 0 ? LO : HI - nw;
  },

  draw(g, s) {
    const n = s.layers.length;
    const cam = Math.round(s.cam);
    for (let k = 0; k < n; k += 5) {
      const y = top(k) + cam + BH;
      if (y > 12 && y < 240) {
        g.rect(0, y, 6, 1, P.mute);
        g.text(String(k), 8, y - 3, P.mute);
      }
    }
    s.layers.forEach((l, k) => {
      const y = top(k) + cam;
      if (y > 240) return;
      g.rect(l.x, y, l.w, BH - 1, COLS[k % COLS.length]!);
      g.rect(l.x, y + BH - 3, l.w, 2, P.bg);
      g.alpha(0.65);
      g.rect(l.x, y + BH - 3, l.w, 2, COLS[k % COLS.length]!);
      g.alpha(1);
    });
    for (const d of s.debris) g.rect(d.x, d.y, d.w, BH - 1, d.c);
    if (!s.over) g.rect(s.x, top(n) + cam - 2, s.w, BH - 1, COLS[n % COLS.length]!);
    g.text(`LAYER ${n}`, W - 3, 16, P.dim, 1, 1);
    if (s.fb && (s.t >> 2) & 1) g.text(`PERFECT X${Math.min(5, s.streak)}`, 90, 30, P.gold, 1, 0.5);
  },

  icon(g, t) {
    const ws = [56, 52, 46, 46, 40];
    ws.forEach((w, k) => g.rect(90 - w / 2 + (k % 2 ? 2 : 0), 148 - k * 8, w, 7, COLS[k]!));
    const x = 60 + Math.abs(((t * 1.2) % 80) - 40) - 20;
    g.rect(x + 20, 104, 40, 7, COLS[5]!);
  },
};
