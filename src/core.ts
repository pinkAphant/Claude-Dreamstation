import { random } from "maath";
import type { Gfx } from "./gfx";

/** Logical screen: 180 x 240 px, drawn at SCALE 3 = 540 x 720 (3:4 portrait). */
export const W = 180;
export const H = 240;
export const SCALE = 3;
export const HZ = 60;

export const P = {
  bg: "#1b1a18",
  hud: "#121110",
  ink: "#f0eee6",
  dim: "#8a877f",
  mute: "#3a3834",
  clay: "#d97757",
  kraft: "#d4a27f",
  sky: "#6a9bcc",
  olive: "#8fa56b",
  fig: "#c46686",
  gold: "#e8b84a",
  red: "#d2553f",
  teal: "#7fbfb0",
  violet: "#9b87d6",
} as const;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const pad6 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(6, "0");

/** Seeded stream: the same seed replays the same game. */
export class Rng {
  private g: random.Generator;
  constructor(seed: string) {
    this.g = new random.Generator(seed);
  }
  /** Uniform float in [0, 1). */
  f(): number {
    return this.g.value();
  }
  /** Uniform integer in [0, n). */
  i(n: number): number {
    return Math.min(n - 1, Math.floor(this.f() * n));
  }
  range(lo: number, hi: number): number {
    return lo + this.f() * (hi - lo);
  }
  chance(p: number): boolean {
    return this.f() < p;
  }
  pick<T>(a: readonly T[]): T {
    return a[this.i(a.length)]!;
  }
}

export type SfxName = "start" | "over" | "good" | "great" | "bad" | "move" | "drop" | "n0" | "n1" | "n2" | "n3";
export type Sfx = (name: SfxName) => void;

/** One 60 Hz tick of the deck: joystick + 4 buttons (south, east, west, north). */
export interface Input {
  /** Stick as -1 | 0 | 1. dy is screen space: +1 is down. */
  dx: number;
  dy: number;
  l: boolean; r: boolean; u: boolean; d: boolean;
  /** Stick edges this tick. */
  pl: boolean; pr: boolean; pu: boolean; pd: boolean;
  /** Stick edges with auto-repeat while held (cursors, lanes). */
  rl: boolean; rr: boolean; ru: boolean; rd: boolean;
  s: boolean; e: boolean; w: boolean; n: boolean;
  /** Button edges this tick. */
  ps: boolean; pe: boolean; pw: boolean; pn: boolean;
  /** Any button edge this tick. */
  any: boolean;
}

export interface GameState {
  score: number;
  over: boolean;
  lives?: number;
  /** One line shown under GAME OVER. */
  cause?: string;
}

export type Control = "stick" | "lr" | "s" | "e" | "w" | "n" | "any";

export interface Game<S extends GameState = GameState> {
  id: string;
  num: string;
  /** One or two lines, 9 characters max each. */
  title: readonly string[];
  sub: string;
  accent: string;
  help: readonly (readonly [Control, string])[];
  init(r: Rng): S;
  /** Advance exactly one 60 Hz tick. */
  step(s: S, i: Input, r: Rng, sfx: Sfx): void;
  draw(g: Gfx, s: S): void;
  /** Title-screen art, centred on (90, 124) inside a 120 x 56 box. */
  icon(g: Gfx, t: number): void;
}
