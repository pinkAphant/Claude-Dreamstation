import { HZ, P, Rng, W, pad6, type Game, type GameState, type Input, type Sfx } from "./core";
import type { Gfx } from "./gfx";

/** Raw deck state. x right = +1, y up = +1. Buttons by position in the diamond. */
export interface Pad {
  x: number;
  y: number;
  s: boolean;
  e: boolean;
  w: boolean;
  n: boolean;
}

export const PAD_IDLE: Pad = { x: 0, y: 0, s: false, e: false, w: false, n: false };

export interface ArcadeOptions {
  seed?: string;
  sfx?: Sfx;
  /** Called once per finished game with the final score. */
  onScore?: (score: number) => void;
}

const best = new Map<string, number>();
const key = (id: string) => `claude-dreamstation:${id}`;

function loadHi(id: string): number {
  if (best.has(id)) return best.get(id)!;
  let v = 0;
  try {
    v = Number(globalThis.localStorage?.getItem(key(id))) || 0;
  } catch {
    v = 0;
  }
  best.set(id, v);
  return v;
}

function saveHi(id: string, v: number): void {
  best.set(id, v);
  try {
    globalThis.localStorage?.setItem(key(id), String(v));
  } catch {
    /* storage blocked: the in-memory best still holds */
  }
}

const REPEAT_DELAY = 14;
const REPEAT_EVERY = 5;
const READY_TICKS = 70;

/** The cabinet loop every game shares: TITLE -> READY -> PLAY -> GAME OVER -> TITLE. */
export class Arcade<S extends GameState = GameState> {
  phase: "title" | "ready" | "play" | "over" = "title";
  /** Ticks since the phase began. */
  t = 0;
  hi: number;
  score = 0;
  newHi = false;
  state: S | null = null;
  runs = 0;
  private rng = new Rng("idle");
  private acc = 0;
  private was = [false, false, false, false, false, false, false, false];
  private held = [0, 0, 0, 0];

  constructor(readonly game: Game<S>, private opts: ArcadeOptions = {}) {
    this.hi = loadHi(game.id);
  }

  private sfx: Sfx = (n) => this.opts.sfx?.(n);

  /** Advance by real seconds at a fixed 60 Hz, at most 5 ticks per call. */
  frame(dt: number, pad: Pad): void {
    this.acc += Math.min(Math.max(dt, 0) || 0, 0.1);
    let n = 0;
    while (this.acc >= 1 / HZ && n < 5) {
      this.acc -= 1 / HZ;
      this.tick(pad);
      n++;
    }
  }

  private read(p: Pad): Input {
    const x = Number.isFinite(p.x) ? p.x : 0;
    const y = Number.isFinite(p.y) ? p.y : 0;
    const now = [x < -0.5, x > 0.5, y > 0.5, y < -0.5, !!p.s, !!p.e, !!p.w, !!p.n];
    const edge = now.map((v, k) => v && !this.was[k]);
    const rep = [0, 1, 2, 3].map((k) => {
      this.held[k] = now[k] ? this.held[k]! + 1 : 0;
      const h = this.held[k]!;
      return h === 1 || (h > REPEAT_DELAY && (h - REPEAT_DELAY) % REPEAT_EVERY === 0);
    });
    this.was = now;
    const [l, r, u, d, s, e, w, n] = now as [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean];
    return {
      dx: (r ? 1 : 0) - (l ? 1 : 0),
      dy: (d ? 1 : 0) - (u ? 1 : 0),
      l, r, u, d,
      pl: edge[0]!, pr: edge[1]!, pu: edge[2]!, pd: edge[3]!,
      rl: rep[0]!, rr: rep[1]!, ru: rep[2]!, rd: rep[3]!,
      s, e, w, n,
      ps: edge[4]!, pe: edge[5]!, pw: edge[6]!, pn: edge[7]!,
      any: edge[4]! || edge[5]! || edge[6]! || edge[7]!,
    };
  }

  /** Exactly one 60 Hz tick. */
  tick(pad: Pad): void {
    const i = this.read(pad);
    this.t++;
    if (this.phase === "title") {
      if (i.any) {
        this.runs++;
        this.rng = new Rng(`${this.opts.seed ?? "cab"}:${this.game.id}:${this.runs}`);
        this.state = this.game.init(this.rng);
        this.score = 0;
        this.newHi = false;
        this.phase = "ready";
        this.t = 0;
        this.sfx("start");
      }
    } else if (this.phase === "ready") {
      if (this.t >= READY_TICKS) {
        this.phase = "play";
        this.t = 0;
      }
    } else if (this.phase === "play") {
      const s = this.state!;
      this.game.step(s, i, this.rng, this.sfx);
      this.score = Math.max(0, Math.floor(s.score));
      if (s.over) {
        this.newHi = this.score > this.hi;
        if (this.newHi) {
          this.hi = this.score;
          saveHi(this.game.id, this.hi);
        }
        this.phase = "over";
        this.t = 0;
        this.sfx("over");
        this.opts.onScore?.(this.score);
      }
    } else if ((this.t > 45 && i.any) || this.t > 900) {
      this.phase = "title";
      this.t = 0;
    }
  }

  draw(g: Gfx): void {
    g.alpha(1);
    g.rect(0, 0, W, 240, P.bg);
    if (this.phase === "title" || !this.state) return this.drawTitle(g);
    const { game, state: s, t } = this;
    game.draw(g, s);
    g.alpha(1);

    g.rect(0, 0, W, 11, P.hud);
    g.rect(0, 11, W, 1, P.mute);
    g.text(pad6(this.score), 3, 2, P.ink);
    g.text(`HI ${pad6(Math.max(this.hi, this.score))}`, W - 3, 2, this.score > this.hi && this.hi > 0 ? P.gold : P.dim, 1, 1);
    if (s.lives === undefined) g.text(game.num, 90, 2, game.accent, 1, 0.5);
    else for (let k = 0; k < s.lives; k++) g.spark(90 - (s.lives - 1) * 4 + k * 8, 5, 3, game.accent, 0, 8);

    if (this.phase === "ready") {
      g.rect(0, 104, W, 30, P.hud);
      g.rect(0, 104, W, 1, game.accent);
      g.rect(0, 133, W, 1, game.accent);
      g.text(t < 50 ? "READY" : "GO!", 90, 112, t < 50 ? P.ink : game.accent, 2, 0.5);
    } else if (this.phase === "over") {
      g.rect(0, 88, W, 64, P.hud);
      g.rect(0, 88, W, 1, game.accent);
      g.rect(0, 151, W, 1, game.accent);
      g.text("GAME OVER", 90, 94, P.ink, 2, 0.5);
      if (s.cause) g.text(s.cause, 90, 113, P.dim, 1, 0.5);
      g.text(`SCORE ${pad6(this.score)}`, 90, 124, game.accent, 1, 0.5);
      if (this.newHi && (t >> 3) & 1) g.text("NEW HIGH SCORE!", 90, 135, P.gold, 1, 0.5);
      else if (!this.newHi && t > 45 && (t >> 5) & 1) g.text("PRESS ANY BUTTON", 90, 138, P.dim, 1, 0.5);
    }
  }

  private drawTitle(g: Gfx): void {
    const { game, t } = this;
    g.spark(8, 8, 5, P.clay, t * 0.01);
    g.text("CLAUDE DREAMSTATION", 17, 5, P.dim);
    g.text(`${game.num}/08`, W - 3, 5, game.accent, 1, 1);
    g.rect(0, 16, W, 1, P.mute);

    const two = game.title.length > 1;
    game.title.forEach((line, k) => {
      const y = (two ? 24 : 36) + k * 25;
      g.text(line, 92, y + 2, P.hud, 3, 0.5);
      g.text(line, 90, y, k ? P.ink : game.accent, 3, 0.5);
    });
    g.text(game.sub, 90, 78, P.dim, 1, 0.5);

    game.icon(g, t);
    g.alpha(1);

    game.help.forEach(([k, label], n) => {
      const y = 162 + n * 11;
      g.control(k, 30, y - 1, game.accent);
      g.text(label, 45, y, P.ink);
    });

    g.text(`HI ${pad6(this.hi)}`, 90, 210, P.gold, 1, 0.5);
    if ((t >> 5) & 1) g.text("PRESS ANY BUTTON", 90, 224, P.ink, 1, 0.5);
  }
}
