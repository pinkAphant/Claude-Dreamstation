import { useCartridgeTexture, type CartridgeProps } from "./cartridge";
import { P, W, clamp, type Game, type GameState, type Rng } from "./core";

interface Tok { x: number; y: number; w: number; label: string; bad: boolean }
interface Pop { x: number; y: number; t: number; s: string; c: string }
interface S extends GameState {
  lives: number;
  px: number;
  v: number;
  toks: Tok[];
  pops: Pop[];
  caught: number;
  combo: number;
  /** x of the last good token spawned, and the bad tokens spawned since. */
  lastX: number;
  fence: number[];
  since: number;
  hurt: number;
  t: number;
}

const GOOD = ["THE", "AND", "FOR", "LET", "MAP", "KEY", "YES", "OK", "IF", "FN", "TO", "IS"];
const BAD = ["???", "NAN", "ERR", "404", "#%!"];
const CY = 220;
const HALF = 14;
const KEEP = 36;

function spawn(s: S, r: Rng, gap: number): void {
  const level = Math.floor(s.caught / 8);
  const bad = s.toks.length > 0 && s.fence.length < 2 && r.chance(Math.min(0.4, 0.2 + level * 0.02));
  let x: number;
  if (bad) {
    // A bad token never lands within KEEP of the path between two good ones.
    const right = s.lastX + KEEP <= 164;
    const left = s.lastX - KEEP >= 16;
    x = (right && left ? r.chance(0.5) : right) ? r.range(s.lastX + KEEP, 164) : r.range(16, s.lastX - KEEP);
    s.fence.push(x);
  } else {
    // Reachable at dash speed (4 px/tick) with 25% slack.
    const reach = Math.min(50, (3 * gap) / s.v);
    let lo = Math.max(16, s.lastX - reach);
    let hi = Math.min(164, s.lastX + reach);
    for (const f of s.fence) {
      if (f > s.lastX) hi = Math.min(hi, f - KEEP);
      else lo = Math.max(lo, f + KEEP);
    }
    x = r.range(lo, hi);
    s.lastX = x;
    s.fence = [];
  }
  const label = r.pick(bad ? BAD : GOOD);
  s.toks.push({ x, y: 2, w: label.length * 6 + 3, label, bad });
}

export const tokenStream: Game<S> = {
  id: "claude-01-token",
  num: "01",
  title: ["TOKEN", "STREAM"],
  sub: "CATCH EVERY TOKEN",
  accent: P.clay,
  help: [
    ["lr", "MOVE"],
    ["s", "HOLD TO DASH"],
    ["any", "RED = HALLUCINATION"],
  ],

  init: () => ({
    score: 0, over: false, lives: 3, px: 90, v: 0.8, toks: [], pops: [],
    caught: 0, combo: 0, lastX: 90, fence: [], since: 999, hurt: 0, t: 0,
  }),

  step(s, i, r, sfx) {
    s.t++;
    if (s.hurt) s.hurt--;
    s.px = clamp(s.px + i.dx * (i.s ? 4 : 2.2), HALF, W - HALF);
    s.v = Math.min(2.4, 0.8 + s.caught * 0.012);
    const gap = Math.max(26, 58 - Math.floor(s.caught / 8) * 3);
    s.since += s.v;
    if (s.since >= gap) {
      s.since = 0;
      spawn(s, r, gap);
    }

    const lose = (x: number, why: string) => {
      s.lives--;
      s.combo = 0;
      s.hurt = 30;
      s.pops.push({ x, y: CY - 12, t: 40, s: why, c: P.red });
      sfx("bad");
    };
    for (let k = s.toks.length - 1; k >= 0; k--) {
      const tk = s.toks[k]!;
      tk.y += s.v;
      if (tk.y + 9 >= CY && tk.y <= CY + 5 && Math.abs(tk.x - s.px) <= HALF + tk.w / 2) {
        s.toks.splice(k, 1);
        if (tk.bad) lose(tk.x, "BAD");
        else {
          s.caught++;
          s.combo++;
          const pts = 10 * Math.min(8, 1 + Math.floor(s.combo / 5));
          s.score += pts;
          s.pops.push({ x: tk.x, y: CY - 12, t: 40, s: `+${pts}`, c: P.ink });
          sfx(s.combo % 5 ? "good" : "great");
        }
      } else if (tk.y > 240) {
        s.toks.splice(k, 1);
        if (!tk.bad) lose(tk.x, "MISS");
      }
    }
    for (let k = s.pops.length - 1; k >= 0; k--) {
      const p = s.pops[k]!;
      p.y -= 0.4;
      if (--p.t <= 0) s.pops.splice(k, 1);
    }
    if (s.lives <= 0) {
      s.over = true;
      s.cause = "STREAM LOST";
    }
  },

  draw(g, s) {
    for (let k = 0; k < 9; k++) g.rect(10 + k * 20, (s.t * (0.4 + (k % 3) * 0.2) + k * 53) % 240, 1, 6, P.mute);
    g.rect(0, 234, W, 1, P.mute);
    for (const tk of s.toks) {
      const x = tk.x - tk.w / 2 + (tk.bad ? (s.t >> 2) & 1 : 0);
      g.rect(x, tk.y, tk.w, 9, tk.bad ? P.red : P.ink);
      g.text(tk.label, x + 2, tk.y + 1, tk.bad ? P.ink : P.bg);
    }
    if (!(s.hurt && (s.t >> 2) & 1)) {
      g.rect(s.px - HALF, CY, HALF * 2, 3, P.clay);
      g.rect(s.px - HALF, CY - 4, 2, 4, P.clay);
      g.rect(s.px + HALF - 2, CY - 4, 2, 4, P.clay);
    }
    const mult = Math.min(8, 1 + Math.floor(s.combo / 5));
    if (mult > 1) g.text(`X${mult}`, s.px, CY + 6, P.gold, 1, 0.5);
    for (const p of s.pops) g.text(p.s, clamp(p.x, 14, W - 14), p.y, p.c, 1, 0.5);
  },

  icon(g, t) {
    const words = ["THE", "???", "FOR", "OK"];
    words.forEach((wd, k) => {
      const y = 98 + ((t * 0.5 + k * 13) % 44);
      const x = 46 + k * 26;
      g.rect(x, y, wd.length * 6 + 3, 9, k === 1 ? P.red : P.ink);
      g.text(wd, x + 2, y + 1, k === 1 ? P.ink : P.bg);
    });
    g.rect(76, 150, 28, 3, P.clay);
    g.rect(76, 146, 2, 4, P.clay);
    g.rect(102, 146, 2, 4, P.clay);
  },
};

/** The cabinet screen for this game: mount it inside the screen's scene and it fills it. */
export default function TokenStream(props: CartridgeProps) {
  return <primitive object={useCartridgeTexture(tokenStream, props)} attach="background" />;
}
