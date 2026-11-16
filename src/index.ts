import type { Game } from "./core";
import TokenStream, { tokenStream } from "./TokenStream";
import ContextWindow, { contextWindow } from "./ContextWindow";
import Guardrail, { guardrail } from "./Guardrail";
import ToolCall, { toolCall } from "./ToolCall";
import LongHorizon, { longHorizon } from "./LongHorizon";
import Attention, { attention } from "./Attention";
import FeatureMatch, { featureMatch } from "./FeatureMatch";
import LayerStack, { layerStack } from "./LayerStack";

/** The 8 R3F components. Each takes { cabinetId, isActive }. */
export { TokenStream, ContextWindow, Guardrail, ToolCall, LongHorizon, Attention, FeatureMatch, LayerStack };

const CARTS = [TokenStream, ContextWindow, Guardrail, ToolCall, LongHorizon, Attention, FeatureMatch, LayerStack];
export const GAMES: readonly Game<any>[] = [tokenStream, contextWindow, guardrail, toolCall, longHorizon, attention, featureMatch, layerStack];

/** One entry per cabinet: id, number, marquee text, and the component for its screen. */
export const CABINETS = GAMES.map((game, k) => ({
  id: game.id,
  num: game.num,
  title: game.title.join(" "),
  sub: game.sub,
  accent: game.accent,
  game,
  Cartridge: CARTS[k]!,
}));

export { useCartridgeTexture, type CartridgeProps } from "./cartridge";
export { Arcade, PAD_IDLE, type Pad, type ArcadeOptions } from "./arcade";
export { Gfx, type Ctx2D } from "./gfx";
export { attachKeyboard, readKeyboard } from "./deck";
export { W, H, SCALE, P, Rng, type Game, type GameState, type Input, type Sfx, type SfxName } from "./core";
