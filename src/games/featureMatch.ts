import { P, type Game, type GameState, type Rng } from "../core";
import type { Gfx } from "../gfx";

interface S extends GameState {
  cards: number[];
  up: boolean[];
  /** The one or two cards currently turned over (-1 = none). */
  a: number;
  b: number;
  wait: number;
  cur: number;
  time: number;
  limit: number;
  board: number;
  preview: number;
  clear: number;
  pairs: number;
  streak: number;
  t: number;
}

const GX = 17;
const GY = 46;
const CS = 32;
const PITCH = 38;
const FEATS: readonly (readonly [string, string])[] = [
  ["*", P.clay], ["#", P.sky], ["+", P.olive], ["=", P.gold],
  ["?", P.fig], ["%", P.teal], ["X", P.violet], ["/", P.ink],
];

function deal(r: Rng): number[] {
  const c = [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7];
  for (let k = c.length - 1; k > 0; k--) {
    const j = r.i(k + 1);
    [c[k], c[j]] = [c[j]!, c[k]!];
  }
  return c;
}

function card(g: Gfx, x: number, y: number, feat: number, face: boolean, done: boolean): void {
  if (!face) {
    g.rect(x, y, CS, CS, P.mute);
    for (let k = 0; k < 9; k++) g.rect(x + 7 + (k % 3) * 8, y + 7 + Math.floor(k / 3) * 8, 2, 2, P.bg);
    return;
  }
  const [ch, col] = FEATS[feat]!;
  g.rect(x, y, CS, CS, P.hud);
  g.box(x, y, CS, CS, done ? col : P.dim);
  g.text(ch, x + 9, y + 6, col, 3);
}

export const featureMatch: Game<S> = {
  id: "claude-07-features",
  num: "07",
  title: ["FEATURE", "MATCH"],
  sub: "FIND THE PAIRS INSIDE",
  accent: P.violet,
  help: [
    ["stick", "MOVE THE PROBE"],
    ["s", "REVEAL A FEATURE"],
    ["any", "CLEAR BEFORE TIME UP"],
  ],

  init: (r) => ({
    score: 0, over: false, cards: deal(r), up: Array(16).fill(false), a: -1, b: -1, wait: 0,
    cur: 5, time: 3600, limit: 3600, board: 0, preview: 90, clear: 0, pairs: 0, streak: 0, t: 0,
  }),

  step(s, i, r, sfx) {
    s.t++;
    if (s.preview) return void s.preview--;
    if (s.clear) {
      if (--s.clear) return;
      s.board++;
      s.cards = deal(r);
      s.up.fill(false);
      s.pairs = 0;
      s.limit = s.time = Math.max(1800, 3600 - s.board * 300);
      s.preview = Math.max(30, 90 - s.board * 10);
      return;
    }
    if (--s.time <= 0) {
      s.over = true;
      s.cause = "TIME UP";
      return;
    }
    const cx = s.cur % 4;
    const cy = s.cur >> 2;
    if (i.rl && cx > 0) s.cur--;
    if (i.rr && cx < 3) s.cur++;
    if (i.ru && cy > 0) s.cur -= 4;
    if (i.rd && cy < 3) s.cur += 4;

    if (s.wait && (--s.wait === 0 || i.ps)) {
      s.wait = 0;
      s.a = s.b = -1;
    }
    if (!i.ps || s.up[s.cur] || s.cur === s.a) return;
    if (s.a < 0) {
      s.a = s.cur;
      return sfx("move");
    }
    s.b = s.cur;
    if (s.cards[s.a] !== s.cards[s.b]) {
      s.wait = 40;
      s.streak = 0;
      return sfx("bad");
    }
    s.up[s.a] = s.up[s.b] = true;
    s.a = s.b = -1;
    s.streak++;
    s.score += 50 * Math.min(4, s.streak);
    if (++s.pairs < 8) return sfx("good");
    s.score += Math.floor(s.time / 60) * 5;
    s.clear = 70;
    sfx("great");
  },

  draw(g, s) {
    const left = s.time / s.limit;
    g.text(`BOARD ${s.board + 1}`, GX, 16, P.dim);
    g.text(`${s.pairs}/8`, 163, 16, P.dim, 1, 1);
    g.box(GX, 28, 146, 7, P.mute);
    g.rect(GX + 1, 29, Math.round(144 * left), 5, left < 0.25 ? P.red : P.violet);
    for (let k = 0; k < 16; k++) {
      const x = GX + (k % 4) * PITCH;
      const y = GY + (k >> 2) * PITCH;
      card(g, x, y, s.cards[k]!, s.up[k]! || k === s.a || k === s.b || s.preview > 0, s.up[k]!);
    }
    if (!s.preview && !s.clear) {
      const x = GX + (s.cur % 4) * PITCH - 2;
      const y = GY + (s.cur >> 2) * PITCH - 2;
      const col = (s.t >> 3) & 1 ? P.ink : P.clay;
      g.box(x, y, CS + 4, CS + 4, col);
      g.box(x + 1, y + 1, CS + 2, CS + 2, col);
    }
    const msg = s.preview ? "MEMORISE" : s.clear ? "BOARD CLEAR!" : s.streak > 1 ? `STREAK X${Math.min(4, s.streak)}` : "";
    g.text(msg, 90, 206, s.clear ? P.gold : P.ink, 1, 0.5);
  },

  icon(g, t) {
    const open = Math.floor(t / 40) % 3;
    [0, 1, 2].forEach((k) => {
      const x = 39 + k * 36;
      if (open === 2 || k === open || k === 2 - open) {
        const [ch, col] = FEATS[k === 1 ? 1 : 0]!;
        g.rect(x, 108, CS, CS, P.hud);
        g.box(x, 108, CS, CS, col);
        g.text(ch, x + 9, 114, col, 3);
      } else card(g, x, 108, 0, false, false);
    });
  },
};
