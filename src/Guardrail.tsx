import { useCartridgeTexture, type CartridgeProps } from "./cartridge";
import { P, W, type Game, type GameState } from "./core";

interface Msg { col: number; y: number; bad: boolean; label: string }
interface Pop { x: number; y: number; t: number; s: string; c: string }
interface S extends GameState {
  lives: number;
  col: number;
  shots: { col: number; y: number }[];
  msgs: Msg[];
  pops: Pop[];
  cool: number;
  since: number;
  done: number;
  hurt: number;
  t: number;
}

const COLS = 6;
const CW = 30;
const LINE = 212;
const BAD = ["SUDO", "LEAK", "JAIL", "HACK", "PWN!", "LIE!"];
const GOOD = ["HELP", "CODE", "POEM", "MATH", "PLAN", "BAKE"];

export const guardrail: Game<S> = {
  id: "claude-03-guardrail",
  num: "03",
  title: ["GUARDRAIL"],
  sub: "BLOCK RED, PASS WHITE",
  accent: P.olive,
  help: [
    ["lr", "CHANGE LANE"],
    ["s", "REFUSE (FIRE)"],
    ["any", "DON'T REFUSE WHITE"],
  ],

  init: () => ({
    score: 0, over: false, lives: 3, col: 2, shots: [], msgs: [], pops: [],
    cool: 0, since: 40, done: 0, hurt: 0, t: 0,
  }),

  step(s, i, r, sfx) {
    s.t++;
    if (s.hurt) s.hurt--;
    if (s.cool) s.cool--;
    if (i.rl && s.col > 0) s.col--;
    if (i.rr && s.col < COLS - 1) s.col++;
    if (i.ps && !s.cool && s.shots.length < 3) {
      s.shots.push({ col: s.col, y: LINE - 8 });
      s.cool = 8;
      sfx("move");
    }

    const level = Math.floor(s.done / 8);
    const v = Math.min(1.4, 0.35 + level * 0.06);
    if (--s.since <= 0) {
      s.since = Math.max(28, 84 - level * 6);
      const bad = r.chance(0.6);
      // Keep 30 px between messages in a lane, and never hide a red behind a white.
      const open = [...Array(COLS).keys()].filter(
        (c) => !s.msgs.some((m) => m.col === c && (m.y < 44 || (bad && !m.bad))),
      );
      if (open.length) s.msgs.push({ col: r.pick(open), y: 14, bad, label: r.pick(bad ? BAD : GOOD) });
    }

    const pop = (m: Msg, text: string, c: string) => s.pops.push({ x: m.col * CW + 15, y: m.y, t: 36, s: text, c });
    const hurt = (m: Msg, text: string) => {
      s.lives--;
      s.hurt = 30;
      pop(m, text, P.red);
      sfx("bad");
    };
    for (let k = s.shots.length - 1; k >= 0; k--) {
      const sh = s.shots[k]!;
      sh.y -= 5;
      let hit = -1;
      s.msgs.forEach((m, n) => {
        if (m.col === sh.col && sh.y <= m.y + 10 && sh.y + 6 >= m.y && (hit < 0 || m.y > s.msgs[hit]!.y)) hit = n;
      });
      if (hit >= 0) {
        const m = s.msgs.splice(hit, 1)[0]!;
        s.shots.splice(k, 1);
        if (m.bad) {
          s.score += 20;
          s.done++;
          pop(m, "+20", P.ink);
          sfx("good");
        } else hurt(m, "OOPS");
      } else if (sh.y < 8) s.shots.splice(k, 1);
    }
    for (let k = s.msgs.length - 1; k >= 0; k--) {
      const m = s.msgs[k]!;
      m.y += v;
      if (m.y + 10 < LINE) continue;
      s.msgs.splice(k, 1);
      if (m.bad) hurt(m, "BREACH");
      else {
        s.score += 10;
        s.done++;
        pop(m, "+10", P.olive);
        sfx("great");
      }
    }
    for (let k = s.pops.length - 1; k >= 0; k--) {
      s.pops[k]!.y -= 0.4;
      if (--s.pops[k]!.t <= 0) s.pops.splice(k, 1);
    }
    if (s.lives <= 0) {
      s.over = true;
      s.cause = "GUARD DOWN";
    }
  },

  draw(g, s) {
    for (let c = 1; c < COLS; c++) for (let y = 14; y < LINE; y += 6) g.rect(c * CW, y, 1, 2, P.mute);
    g.rect(0, LINE, W, 1, s.hurt ? P.red : P.olive);
    for (const m of s.msgs) {
      const x = m.col * CW + 2;
      g.rect(x, m.y, 26, 10, m.bad ? P.red : P.ink);
      g.text(m.label, x + 2, m.y + 2, m.bad ? P.ink : P.bg);
    }
    for (const sh of s.shots) g.rect(sh.col * CW + 14, sh.y, 2, 6, P.clay);
    const px = s.col * CW + 15;
    if (!(s.hurt && (s.t >> 2) & 1)) {
      g.spark(px, 224, 7, P.clay, s.t * 0.03);
      g.rect(px - 9, 233, 18, 2, P.kraft);
    }
    for (const p of s.pops) g.text(p.s, Math.min(Math.max(p.x, 20), W - 20), p.y, p.c, 1, 0.5);
  },

  icon(g, t) {
    const y = 100 + ((t * 0.4) % 30);
    g.rect(47, y, 26, 10, P.red);
    g.text("SUDO", 49, y + 2, P.ink);
    g.rect(107, y - 6, 26, 10, P.ink);
    g.text("HELP", 109, y + 2 - 6, P.bg);
    g.rect(30, 140, 120, 1, P.olive);
    g.spark(60, 150, 6, P.clay, t * 0.03);
    g.rect(59, 138 - ((t * 2) % 26), 2, 6, P.clay);
  },
};

/** The cabinet screen for this game: mount it inside the screen's scene and it fills it. */
export default function Guardrail(props: CartridgeProps) {
  return <primitive object={useCartridgeTexture(guardrail, props)} attach="background" />;
}
