# Claude Dreamstation

8 Claude arcade minigames as React Three Fiber cartridges. Each one runs TITLE → READY → PLAY → GAME OVER on a 540 × 720 (3:4) screen and is played with one joystick and four buttons.

| # | Game | Play |
|---|------|------|
| 01 | Token Stream | Catch every token, dodge the red hallucinations |
| 02 | Context Window | Grow the thread, compact before the window fills |
| 03 | Guardrail | Block the red injections, let the white requests through |
| 04 | Tool Call | Watch the call chain, play it back |
| 05 | Long Horizon | Jump the bugs, duck the 429s |
| 06 | Attention | Hit each token as it lands on its head |
| 07 | Feature Match | Find the pairs before time runs out |
| 08 | Layer Stack | Drop each layer square on the last |

## Mount one on a cabinet screen

A cartridge takes the same props the NoFog cabinet passes (`cabinetId`, `isActive`). Inside the cabinet's screen scene it becomes the scene background, so it fills the screen whatever camera the cabinet uses.

```tsx
import { CABINETS } from "@pinkaphant/claude-dreamstation";

for (const c of CABINETS) registerCartridge(c.id, c.Cartridge);
```

Set the screen's `<RenderTexture>` to `width={540} height={720}`.

To skip the render pass and put the game straight on a screen mesh, use the texture:

```tsx
const map = useCartridgeTexture(CABINETS[0].game, { cabinetId: "cab-1", isActive });
<meshBasicMaterial map={map} toneMapped={false} />
```

## Controls

| Deck | Keys |
|------|------|
| Joystick | WASD or arrows |
| South | Space (or K) |
| East | E (or L) |
| West | Q (or J) |
| North | Shift or R (or I) |

Pass `pad={() => ({ x, y, s, e, w, n })}` to drive a cartridge from the cabinet's own stick and buttons instead of the keyboard. `onScore(score, cabinetId)` fires once per finished game. The games are silent; `onSfx(name, cabinetId)` reports sound cues if the host wants to play its own.

## Develop

```bash
npm run dev
```

```bash
npm test
```

The bench at `localhost:5188` shows all 8 screens. `?solo=3` shows one; `?r3f=3` mounts one as an R3F cartridge.
