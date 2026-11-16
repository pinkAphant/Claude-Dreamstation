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
