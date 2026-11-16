import type { Control } from "./core";
import { P } from "./core";

/** 5 x 7 bitmap font, rows top to bottom. */
const SRC: Record<string, string> = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "01110 00100 00100 00100 00100 00100 01110",
  J: "00111 00010 00010 00010 00010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10101 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 11011 10001",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  "0": "01110 10001 10011 10101 11001 10001 01110",
  "1": "00100 01100 00100 00100 00100 00100 01110",
  "2": "01110 10001 00001 00010 00100 01000 11111",
  "3": "11110 00001 00001 01110 00001 00001 11110",
  "4": "00010 00110 01010 10010 11111 00010 00010",
  "5": "11111 10000 11110 00001 00001 10001 01110",
  "6": "00110 01000 10000 11110 10001 10001 01110",
  "7": "11111 00001 00010 00100 01000 01000 01000",
  "8": "01110 10001 10001 01110 10001 10001 01110",
  "9": "01110 10001 10001 01111 00001 00010 01100",
  ".": "00000 00000 00000 00000 00000 01100 01100",
  ",": "00000 00000 00000 00000 01100 00100 01000",
  "!": "00100 00100 00100 00100 00100 00000 00100",
  "?": "01110 10001 00001 00010 00100 00000 00100",
  ":": "00000 01100 01100 00000 01100 01100 00000",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  "+": "00000 00100 00100 11111 00100 00100 00000",
  "/": "00001 00001 00010 00100 01000 10000 10000",
  "'": "00100 00100 01000 00000 00000 00000 00000",
  "(": "00010 00100 01000 01000 01000 00100 00010",
  ")": "01000 00100 00010 00010 00010 00100 01000",
  "<": "00010 00100 01000 10000 01000 00100 00010",
  ">": "01000 00100 00010 00001 00010 00100 01000",
  "=": "00000 00000 11111 00000 11111 00000 00000",
  "*": "00000 10101 01110 11111 01110 10101 00000",
  "#": "01010 01010 11111 01010 11111 01010 01010",
  "%": "11001 11010 00010 00100 01000 01011 10011",
  _: "00000 00000 00000 00000 00000 00000 11111",
};

/** Each glyph as horizontal runs [x, y, w]. */
const GLYPHS: Record<string, [number, number, number][]> = {};
for (const [ch, bits] of Object.entries(SRC)) {
  const runs: [number, number, number][] = [];
  bits.split(" ").forEach((row, y) => {
    for (let x = 0; x < 5; x++) {
      if (row[x] !== "1") continue;
      let w = 1;
      while (row[x + w] === "1") w++;
      runs.push([x, y, w]);
      x += w;
    }
  });
  GLYPHS[ch] = runs;
}

/** The only canvas surface the games touch: solid rectangles. */
export interface Ctx2D {
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
}

const BTN: Record<string, [number, number]> = { n: [3, 0], w: [0, 3], e: [6, 3], s: [3, 6] };

export class Gfx {
  constructor(private c: Ctx2D) {}

  alpha(a: number): void {
    this.c.globalAlpha = a;
  }

  rect(x: number, y: number, w: number, h: number, col: string): void {
    if (w <= 0 || h <= 0) return;
    this.c.fillStyle = col;
    this.c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 1 px outline. */
  box(x: number, y: number, w: number, h: number, col: string): void {
    this.rect(x, y, w, 1, col);
    this.rect(x, y + h - 1, w, 1, col);
    this.rect(x, y + 1, 1, h - 2, col);
    this.rect(x + w - 1, y + 1, 1, h - 2, col);
  }

  textW(s: string, scale = 1): number {
    return s.length ? (s.length * 6 - 1) * scale : 0;
  }

  /** align: 0 left, 0.5 centre, 1 right. */
  text(s: string, x: number, y: number, col: string, scale = 1, align = 0): void {
    const up = s.toUpperCase();
    let cx = Math.round(x - this.textW(up, scale) * align);
    const cy = Math.round(y);
    this.c.fillStyle = col;
    for (const ch of up) {
      const runs = GLYPHS[ch];
      if (runs) for (const [gx, gy, gw] of runs) this.c.fillRect(cx + gx * scale, cy + gy * scale, gw * scale, scale);
      cx += 6 * scale;
    }
  }

  /** Radial burst: `rays` spokes alternating long and short, stepped in whole pixels. */
  spark(cx: number, cy: number, r: number, col: string, rot = 0, rays = 10): void {
    const fat = r >= 9 ? 2 : 1;
    for (let k = 0; k < rays; k++) {
      const a = rot + (k * Math.PI * 2) / rays;
      const len = k % 2 ? r * 0.68 : r;
      for (let d = r * 0.22; d <= len; d += 0.75) {
        this.rect(cx + Math.cos(a) * d - fat / 2, cy + Math.sin(a) * d - fat / 2, fat, fat, col);
      }
    }
    this.rect(cx - fat, cy - fat, fat * 2, fat * 2, col);
  }

  /** 9 x 9 deck icon: the stick, or the 4-button diamond with one button lit. */
  control(k: Control, x: number, y: number, col: string): void {
    if (k === "stick" || k === "lr") {
      this.rect(x + 3, y + 3, 3, 3, col);
      this.rect(x, y + 4, 2, 1, col);
      this.rect(x + 7, y + 4, 2, 1, col);
      if (k === "stick") {
        this.rect(x + 4, y, 1, 2, col);
        this.rect(x + 4, y + 7, 1, 2, col);
      }
      return;
    }
    for (const b in BTN) {
      const [bx, by] = BTN[b]!;
      this.rect(x + bx, y + by, 3, 3, k === "any" || k === b ? col : P.mute);
    }
  }
}
