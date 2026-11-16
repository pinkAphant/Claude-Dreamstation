import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { CABINETS } from "../src";

/** `?r3f=3`: one cartridge mounted in a real R3F scene, as a cabinet screen would mount it. */
export function mountR3F(n: number, el: HTMLElement) {
  const { Cartridge, id } = CABINETS[n - 1] ?? CABINETS[0]!;
  el.style.cssText = "display:block; width:540px; height:720px; max-width:none";
  createRoot(el).render(
    <Canvas flat dpr={1}>
      <Cartridge cabinetId={id} isActive onScore={(score, cab) => console.log("score", cab, score)} />
    </Canvas>,
  );
}
