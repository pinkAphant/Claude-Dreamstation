import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, NearestFilter, SRGBColorSpace } from "three";
import { Arcade, type Pad } from "./arcade";
import { H, SCALE, W, type Game } from "./core";
import { attachKeyboard, beep, readKeyboard } from "./deck";
import { Gfx } from "./gfx";

export interface CartridgeProps {
  cabinetId: string;
  /** The game only runs (and only listens to the deck) while true. */
  isActive: boolean;
  /** Deck state per frame. Defaults to the keyboard: WASD/arrows + Space, E, Q, Shift/R (or IJKL). */
  pad?: () => Pad;
  muted?: boolean;
  /** Final score, once per finished game. */
  onScore?: (score: number, cabinetId: string) => void;
}

/** Runs `game` on a 540 x 720 canvas and returns it as a live texture. */
export function useCartridgeTexture(game: Game<any>, props: CartridgeProps): CanvasTexture {
  const live = useRef(props);
  live.current = props;
  const { cabinetId, isActive, pad } = props;

  const rig = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    const gfx = new Gfx(ctx);
    const arcade = new Arcade(game, {
      seed: cabinetId,
      sfx: (n) => {
        if (!live.current.muted) beep(n);
      },
      onScore: (score) => live.current.onScore?.(score, cabinetId),
    });
    arcade.draw(gfx);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    return { gfx, arcade, texture };
  }, [game, cabinetId]);

  useEffect(() => () => rig.texture.dispose(), [rig]);
  useEffect(() => (isActive && !pad ? attachKeyboard() : undefined), [isActive, pad]);

  useFrame((_, dt) => {
    if (!live.current.isActive) return;
    rig.arcade.frame(dt, (live.current.pad ?? readKeyboard)());
    rig.arcade.draw(rig.gfx);
    rig.texture.needsUpdate = true;
  });

  return rig.texture;
}

/**
 * Wraps a game as a cabinet cartridge. Mounted inside the cabinet's screen
 * scene (a drei <RenderTexture>), it becomes that scene's background, so it
 * fills the screen whatever camera the cabinet uses.
 */
export function createCartridge(game: Game<any>): ComponentType<CartridgeProps> {
  function Cartridge(props: CartridgeProps) {
    const texture = useCartridgeTexture(game, props);
    return <primitive object={texture} attach="background" />;
  }
  Cartridge.displayName = game.title.join("");
  return Cartridge;
}
