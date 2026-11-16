import { describe, expect, it } from "vitest";
import { Arcade, GAMES, Gfx, PAD_IDLE, Rng, type Ctx2D, type Pad } from "../src";

/** Canvas stand-in that rejects any non-finite draw call. */
function stubCtx(): Ctx2D & { calls: number } {
  return {
    fillStyle: "",
    globalAlpha: 1,
    calls: 0,
    fillRect(x, y, w, h) {
      if (![x, y, w, h].every(Number.isFinite)) throw new Error(`non-finite draw ${x},${y},${w},${h}`);
      this.calls++;
    },
  };
}

function assertFinite(v: unknown, path = "state"): void {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error(`${path} = ${v}`);
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) assertFinite(x, `${path}.${k}`);
  }
}

const press = (over: Partial<Pad>): Pad => ({ ...PAD_IDLE, ...over });

/** Start a game and skip the READY countdown. */
function boot(id: string, seed = "test") {
  const arcade = new Arcade(GAMES.find((g) => g.id === id)!, { seed });
  arcade.tick(press({ s: true }));
  while (arcade.phase === "ready") arcade.tick(PAD_IDLE);
  return arcade;
}

/** Run a scripted player for `ticks`, or until the game ends. */
function play(id: string, ticks: number, bot: (s: any, t: number) => Partial<Pad>) {
  const arcade = boot(id);
  for (let t = 0; t < ticks && arcade.phase === "play"; t++) arcade.tick(press(bot(arcade.state, t)));
  return arcade;
}

const toward = (from: number, to: number, slack = 0) => (to > from + slack ? 1 : to < from - slack ? -1 : 0);

describe.each(GAMES.map((g) => [g.id, g] as const))("%s", (id, game) => {
  it("survives random input through every phase with finite state and draws", () => {
    for (let seed = 0; seed < 6; seed++) {
      const r = new Rng(`fuzz:${id}:${seed}`);
      const arcade = new Arcade(game, { seed: `fuzz${seed}` });
      const ctx = stubCtx();
      const g = new Gfx(ctx);
      const seen = new Set<string>();
      let pad = PAD_IDLE;
      for (let t = 0; t < 20000; t++) {
        if (t % 7 === 0) {
          pad = { x: r.i(3) - 1, y: r.i(3) - 1, s: r.chance(0.4), e: r.chance(0.2), w: r.chance(0.2), n: r.chance(0.2) };
        }
        arcade.tick(pad);
        seen.add(arcade.phase);
        if (t % 3 === 0) arcade.draw(g);
        if (t % 50 === 0) assertFinite(arcade.state);
        expect(Number.isInteger(arcade.score) && arcade.score >= 0).toBe(true);
      }
      expect([...seen].sort()).toEqual(["over", "play", "ready", "title"]);
      expect(ctx.calls).toBeGreaterThan(1000);
    }
  });

  it("ends by itself when nobody touches the deck", () => {
    const arcade = boot(id);
    for (let t = 0; t < 60 * 60 * 30 && arcade.phase === "play"; t++) arcade.tick(PAD_IDLE);
    expect(arcade.phase).toBe("over");
    for (let t = 0; t < 901; t++) arcade.tick(PAD_IDLE);
    expect(arcade.phase).toBe("title");
  });

  it("replays identically from the same seed and inputs", () => {
    const run = () => {
      const r = new Rng(`replay:${id}`);
      const arcade = new Arcade(game, { seed: "replay" });
      const trace: number[] = [];
      for (let t = 0; t < 6000; t++) {
        arcade.tick({ x: r.i(3) - 1, y: r.i(3) - 1, s: r.chance(0.5), e: false, w: false, n: r.chance(0.2) });
        if (t % 100 === 0) trace.push(arcade.score);
      }
      return trace;
    };
    expect(run()).toEqual(run());
  });
});

const THREE_MIN = 60 * 60 * 3;

describe("a careful player is never forced to lose", () => {
  it("token stream: every good token is reachable without touching a bad one", () => {
    const a = play("claude-01-token", THREE_MIN, (s) => {
      const goal = s.toks.filter((k: any) => !k.bad).sort((p: any, q: any) => q.y - p.y)[0];
      if (!goal) return {};
      return { x: toward(s.px, goal.x, 2), s: Math.abs(goal.x - s.px) > 12 };
    });
    expect(a.phase).toBe("play");
    expect(a.state!.lives).toBe(3);
    expect(a.score).toBeGreaterThan(5000);
  });

  it("guardrail: every injection can be blocked without refusing a user", () => {
    const a = play("claude-03-guardrail", THREE_MIN, (s, t) => {
      const goal = s.msgs.filter((m: any) => m.bad && !s.shots.some((b: any) => b.col === m.col)).sort((p: any, q: any) => q.y - p.y)[0];
      if (!goal) return {};
      if (goal.col !== s.col) return t % 2 ? { x: toward(s.col, goal.col) } : {};
      return { s: t % 2 === 0 };
    });
    expect(a.phase).toBe("play");
    expect(a.state!.lives).toBe(3);
  });

  it("long horizon: every obstacle can be cleared at every speed", () => {
    const a = play("claude-05-horizon", THREE_MIN, (s) => {
      const v = Math.min(4.2, 1.8 + s.dist / 2400);
      const o = s.obs.filter((k: any) => k.x + k.w > 28).sort((p: any, q: any) => p.x - q.x)[0];
      if (!o || o.x - 40 > v * 6) return {};
      return o.top ? { y: -1 } : { s: true };
    });
    expect(a.phase).toBe("play");
    expect(a.state!.lives).toBe(3);
  });

  it("attention: every note can be hit", () => {
    const a = play("claude-06-attention", THREE_MIN, (s) => {
      const near = (dir: number) => s.notes.some((n: any) => n.dir === dir && Math.abs(n.d - 24) <= 1);
      return { n: near(0), w: near(1), e: near(2), s: near(3) };
    });
    expect(a.phase).toBe("play");
    expect(a.state!.lives).toBe(5);
  });

  it("tool call: a perfect memory keeps the chain growing", () => {
    const a = play("claude-04-tools", THREE_MIN, (s, t) => {
      if (s.phase !== "input" || t % 2) return {};
      const k = s.seq[s.k];
      return { n: k === 0, w: k === 1, e: k === 2, s: k === 3 };
    });
    expect(a.phase).toBe("play");
    expect(a.state!.lives).toBe(3);
    expect((a.state as any).seq.length).toBeGreaterThan(12);
  });

  it("feature match: boards clear and the next one deals", () => {
    const a = play("claude-07-features", THREE_MIN, (s, t) => {
      if (t % 2 || s.preview || s.clear || s.wait) return {};
      const goal = s.a >= 0 ? s.cards.findIndex((c: number, k: number) => k !== s.a && c === s.cards[s.a]) : s.up.indexOf(false);
      const dx = toward(s.cur % 4, goal % 4);
      const dy = toward(s.cur >> 2, goal >> 2);
      return dx ? { x: dx } : dy ? { y: -dy } : { s: true };
    });
    expect(a.phase).toBe("play");
    expect((a.state as any).board).toBeGreaterThan(5);
  });

  it("layer stack: aligned drops are perfect and never shrink", () => {
    const a = play("claude-08-layers", THREE_MIN, (s) => {
      const under = s.layers[s.layers.length - 1];
      return { s: Math.abs(Math.round(s.x) - under.x) <= 1 };
    });
    expect(a.phase).toBe("play");
    expect((a.state as any).w).toBe(60);
    expect((a.state as any).layers.length).toBeGreaterThan(40);
  });

  it("context window: a greedy thread eats, compacts, and scores", () => {
    const a = play("claude-02-context", THREE_MIN, (s) => {
      const hx = s.body[0] % 18;
      const hy = Math.floor(s.body[0] / 18);
      const fx = s.food % 18;
      const fy = Math.floor(s.food / 18);
      const safe = (d: number) => {
        const x = hx + [1, 0, -1, 0][d]!;
        const y = hy + [0, 1, 0, -1][d]!;
        return d !== (s.dir + 2) % 4 && x >= 0 && x < 18 && y >= 0 && y < 21 && !s.body.includes(y * 18 + x);
      };
      const wish = [fx > hx ? 0 : fx < hx ? 2 : -1, fy > hy ? 1 : fy < hy ? 3 : -1, 0, 1, 2, 3];
      const d = s.queue.length ? -1 : wish.find((k) => k >= 0 && safe(k)) ?? -1;
      const pad = [{ x: 1 }, { y: -1 }, { x: -1 }, { y: 1 }][d] ?? {};
      return s.t % 2 ? { ...pad, s: s.body.length > 12 } : {};
    });
    expect(a.score).toBeGreaterThan(300);
  });
});
