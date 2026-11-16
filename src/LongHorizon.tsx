import { useCartridgeTexture, type CartridgeProps } from "./cartridge";
import { P, W, type Game, type GameState } from "./core";
import type { Gfx } from "./gfx";

interface Obs { x: number; w: number; h: number; top: boolean }
interface S extends GameState {
  lives: number;
  /** Feet height above the ground, and upward speed. */
  h: number;
  vy: number;
  duck: boolean;
  obs: Obs[];
  gems: { x: number; y: number }[];
  dist: number;
  next: number;
  bonus: number;
  cp: number;
  inv: number;
  note: number;
  t: number;
}

const GY = 190;
const RX = 30;
const LEG = 1500;

function runner(g: Gfx, x: number, feet: number, duck: boolean, t: number, air: boolean): void {
  if (duck) {
    g.rect(x - 2, feet - 7, 14, 7, P.clay);
    g.rect(x + 8, feet - 5, 2, 2, P.bg);
    return;
  }
  g.rect(x, feet - 14, 10, 10, P.clay);
  g.rect(x + 6, feet - 11, 2, 2, P.bg);
  const stride = air ? 0 : (t >> 2) & 1;
  g.rect(x + 1 + stride * 2, feet - 4, 2, 4, P.kraft);
  g.rect(x + 6 - stride * 2, feet - 4, 2, 4, P.kraft);
}

export const longHorizon: Game<S> = {
  id: "claude-05-horizon",
  num: "05",
  title: ["LONG", "HORIZON"],
  sub: "KEEP THE TASK RUNNING",
  accent: P.teal,
  help: [
    ["s", "JUMP (HOLD = HIGHER)"],
    ["stick", "DOWN TO DUCK"],
    ["any", "GRAB THE SPARKS"],
  ],

  init: () => ({
    score: 0, over: false, lives: 3, h: 0, vy: 0, duck: false, obs: [], gems: [],
    dist: 0, next: 160, bonus: 0, cp: 0, inv: 0, note: 0, t: 0,
  }),

  step(s, i, r, sfx) {
    s.t++;
    if (s.inv) s.inv--;
    if (s.note) s.note--;
    const v = Math.min(4.2, 1.8 + s.dist / 2400);
    s.dist += v;

    if (s.h === 0 && (i.ps || i.pu)) {
      s.vy = 4.7;
      sfx("move");
    }
    if (s.h > 0 || s.vy > 0) {
      s.h += s.vy;
      s.vy -= 0.27;
      if (!i.s && !i.u && s.vy > 1.6) s.vy = 1.6;
      if (i.d) s.vy -= 0.35;
      if (s.h <= 0) {
        s.h = 0;
        s.vy = 0;
      }
    }
    s.duck = i.d && s.h === 0;

    s.next -= v;
    if (s.next <= 0) {
      const top = s.dist > 600 && r.chance(0.3);
      const wide = !top && r.chance(0.4);
      const o: Obs = top ? { x: W + 10, w: 20, h: 21, top } : { x: W + 10, w: wide ? 20 : 10, h: wide ? 9 : 12, top };
      s.obs.push(o);
      if (!top && r.chance(0.4)) s.gems.push({ x: o.x + o.w / 2 - 3, y: GY - 36 });
      // 46 ticks of clear ground: a full jump lasts 35.
      s.next = v * 46 + o.w + r.range(24, 70);
    }

    const x0 = s.duck ? RX - 2 : RX;
    const x1 = s.duck ? RX + 12 : RX + 10;
    const y1 = GY - s.h;
    const y0 = y1 - (s.duck ? 7 : 14);
    for (let k = s.obs.length - 1; k >= 0; k--) {
      const o = s.obs[k]!;
      o.x -= v;
      if (o.x + o.w < -4) {
        s.obs.splice(k, 1);
        continue;
      }
      const oy1 = o.top ? GY - 9 : GY;
      const oy0 = oy1 - o.h;
      if (!s.inv && x0 + 1 < o.x + o.w && x1 - 1 > o.x && y0 + 1 < oy1 && y1 - 1 > oy0) {
        s.lives--;
        s.inv = 90;
        sfx("bad");
      }
    }
    for (let k = s.gems.length - 1; k >= 0; k--) {
      const m = s.gems[k]!;
      m.x -= v;
      if (m.x < -8) s.gems.splice(k, 1);
      else if (x0 < m.x + 6 && x1 > m.x && y0 < m.y + 6 && y1 > m.y) {
        s.gems.splice(k, 1);
        s.bonus += 25;
        sfx("good");
      }
    }
    if (s.dist >= (s.cp + 1) * LEG) {
      s.cp++;
      s.bonus += 100;
      s.note = 70;
      sfx("great");
    }
    s.score = Math.floor(s.dist / 8) + s.bonus;
    if (s.lives <= 0) {
      s.over = true;
      s.cause = "TASK INTERRUPTED";
    }
  },

  draw(g, s) {
    for (let k = 0; k < 14; k++) g.rect((((k * 47 - s.dist * 0.2) % 200) + 200) % 200 - 10, 30 + ((k * 29) % 110), 1, 1, P.dim);
    g.rect(0, GY, W, 1, P.ink);
    for (let k = 0; k < 9; k++) g.rect((((k * 24 - s.dist) % 216) + 216) % 216 - 18, GY + 5, 8, 1, P.mute);
    const flag = RX + (s.cp + 1) * LEG - s.dist;
    if (flag < W + 10) {
      g.rect(flag, GY - 44, 1, 44, P.dim);
      g.rect(flag + 1, GY - 44, 12, 8, P.teal);
    }
    for (const o of s.obs) {
      if (o.top) {
        g.rect(o.x + 9, 12, 2, GY - 9 - o.h - 12, P.mute);
        g.rect(o.x, GY - 9 - o.h, o.w, o.h, P.gold);
        g.text("429", o.x + 2, GY - 23, P.bg);
      } else {
        g.rect(o.x, GY - o.h + 2, o.w, o.h - 2, P.red);
        g.rect(o.x + 1, GY - o.h, 1, 2, P.red);
        g.rect(o.x + o.w - 2, GY - o.h, 1, 2, P.red);
        g.rect(o.x + 2, GY - o.h + 4, 2, 2, P.bg);
        g.rect(o.x + o.w - 4, GY - o.h + 4, 2, 2, P.bg);
      }
    }
    for (const m of s.gems) g.spark(m.x + 3, m.y + 3, 4, P.clay, s.t * 0.05, 8);
    if (!(s.inv && (s.t >> 2) & 1)) runner(g, RX, GY - s.h, s.duck, s.t, s.h > 0);
    g.text(`STEP ${s.cp + 1}`, 3, 16, P.dim);
    if (s.note && (s.t >> 2) & 1) g.text("CHECKPOINT +100", 90, 60, P.teal, 1, 0.5);
  },

  icon(g, t) {
    const hop = Math.max(0, Math.sin((t % 60) / 60 * Math.PI) * 20);
    g.rect(30, 148, 120, 1, P.ink);
    const ox = 150 - ((t * 2) % 120);
    g.rect(ox, 138, 10, 10, P.red);
    runner(g, 60, 148 - (ox > 50 && ox < 86 ? hop : 0), false, t, false);
    g.spark(120, 112, 4, P.clay, t * 0.05, 8);
  },
};

/** The cabinet screen for this game: mount it inside the screen's scene and it fills it. */
export default function LongHorizon(props: CartridgeProps) {
  return <primitive object={useCartridgeTexture(longHorizon, props)} attach="background" />;
}
