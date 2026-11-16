import type { Game } from "./core";
import { createCartridge } from "./cartridge";
import { tokenStream } from "./games/tokenStream";
import { contextWindow } from "./games/contextWindow";
import { guardrail } from "./games/guardrail";
import { toolCall } from "./games/toolCall";
import { longHorizon } from "./games/longHorizon";
import { attention } from "./games/attention";
import { featureMatch } from "./games/featureMatch";
import { layerStack } from "./games/layerStack";

export const GAMES: readonly Game<any>[] = [
  tokenStream, contextWindow, guardrail, toolCall, longHorizon, attention, featureMatch, layerStack,
];

export const TokenStream = createCartridge(tokenStream);
export const ContextWindow = createCartridge(contextWindow);
export const Guardrail = createCartridge(guardrail);
export const ToolCall = createCartridge(toolCall);
export const LongHorizon = createCartridge(longHorizon);
export const Attention = createCartridge(attention);
export const FeatureMatch = createCartridge(featureMatch);
export const LayerStack = createCartridge(layerStack);

const CARTS = [TokenStream, ContextWindow, Guardrail, ToolCall, LongHorizon, Attention, FeatureMatch, LayerStack];

/** One entry per cabinet: id, number, marquee text, and the cartridge to mount on its screen. */
export const CABINETS = GAMES.map((game, k) => ({
  id: game.id,
  num: game.num,
  title: game.title.join(" "),
  sub: game.sub,
  accent: game.accent,
  game,
  Cartridge: CARTS[k]!,
}));

export { createCartridge, useCartridgeTexture, type CartridgeProps } from "./cartridge";
export { Arcade, PAD_IDLE, type Pad, type ArcadeOptions } from "./arcade";
export { Gfx, type Ctx2D } from "./gfx";
export { attachKeyboard, readKeyboard, beep } from "./deck";
export { W, H, SCALE, P, Rng, type Game, type GameState, type Input, type Sfx, type SfxName } from "./core";
