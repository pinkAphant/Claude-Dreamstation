import type { SfxName } from "./core";
import type { Pad } from "./arcade";

const keys = new Set<string>();
let users = 0;
const down = (e: KeyboardEvent) => void keys.add(e.code);
const up = (e: KeyboardEvent) => void keys.delete(e.code);
const blur = () => keys.clear();

/** Listen for deck keys while a cartridge is active. Returns the detach function. */
export function attachKeyboard(): () => void {
  if (users++ === 0) {
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
  }
  return () => {
    if (--users > 0) return;
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    keys.clear();
  };
}

const has = (...codes: string[]) => codes.some((c) => keys.has(c));

/**
 * Default deck: stick on WASD / arrows; buttons on the cabinet keys
 * (Space south, E east, Q west, Shift or R north) and on the IJKL diamond.
 */
export function readKeyboard(): Pad {
  return {
    x: (has("KeyD", "ArrowRight") ? 1 : 0) - (has("KeyA", "ArrowLeft") ? 1 : 0),
    y: (has("KeyW", "ArrowUp") ? 1 : 0) - (has("KeyS", "ArrowDown") ? 1 : 0),
    s: has("Space", "KeyK", "Enter"),
    e: has("KeyE", "KeyL"),
    w: has("KeyQ", "KeyJ"),
    n: has("ShiftLeft", "ShiftRight", "KeyR", "KeyI"),
  };
}

/** Square-wave jingles as [Hz, seconds] steps. */
const TUNES: Record<SfxName, readonly (readonly [number, number])[]> = {
  start: [[392, 0.07], [523, 0.07], [659, 0.07], [784, 0.14]],
  over: [[392, 0.12], [311, 0.12], [262, 0.12], [196, 0.3]],
  good: [[660, 0.05], [880, 0.07]],
  great: [[660, 0.05], [880, 0.05], [1175, 0.1]],
  bad: [[180, 0.1], [120, 0.16]],
  move: [[440, 0.03]],
  drop: [[300, 0.04], [220, 0.06]],
  n0: [[659, 0.16]],
  n1: [[523, 0.16]],
  n2: [[784, 0.16]],
  n3: [[392, 0.16]],
};

let ac: AudioContext | null = null;

export function beep(name: SfxName): void {
  if (typeof AudioContext === "undefined") return;
  try {
    ac ??= new AudioContext();
    if (ac.state === "suspended") void ac.resume();
    let t = ac.currentTime;
    for (const [hz, dur] of TUNES[name]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "square";
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  } catch {
    /* audio unavailable: the game plays silent */
  }
}
