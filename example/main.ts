import { Arcade, GAMES, Gfx, H, PAD_IDLE, SCALE, W, attachKeyboard, beep, readKeyboard } from "../src";

// Flat bench: all 8 screens as plain 540 x 720 canvases. `?solo=3` shows one.
const solo = Number(new URLSearchParams(location.search).get("solo")) || 0;
const grid = document.getElementById("grid")!;
if (solo) grid.style.cssText = "grid-template-columns: 1fr; max-width: 540px";
let active = solo ? solo - 1 : 0;

const rigs = GAMES.map((game, k) => {
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.hidden = solo > 0 && k !== active;
  canvas.onclick = () => (active = k);
  grid.append(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  return { canvas, gfx: new Gfx(ctx), arcade: new Arcade(game, { seed: "bench", sfx: beep }) };
});
Object.assign(window, { rigs });

attachKeyboard();
addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (!solo && n >= 1 && n <= 8) active = n - 1;
  if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
});

let last = performance.now();
function loop(now: number) {
  const dt = (now - last) / 1000;
  last = now;
  rigs.forEach((r, k) => {
    r.canvas.classList.toggle("on", k === active);
    r.arcade.frame(dt, k === active ? readKeyboard() : PAD_IDLE);
    r.arcade.draw(r.gfx);
  });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
