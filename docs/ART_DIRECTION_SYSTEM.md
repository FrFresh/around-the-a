# Around the A — ART DIRECTION SYSTEM

This document translates the creative direction into technical rendering constraints. `WORLD_AND_ART_DIRECTION.md` remains the creative authority.

## Rendering Surface

- Author assets on a low-resolution grid.
- Use a 320×180, 320×240, or 384×216 virtual resolution.
- Scale by whole-number factors whenever possible.
- Snap tiles, sprites, camera positions, and effects to whole pixels.
- Use `image-rendering: pixelated` and nearest-neighbor canvas scaling.
- Never introduce anti-aliasing, sub-pixel movement, Gaussian blur, bloom, or motion blur.

## Asset System

```text
public/pixel-assets/
  characters/player/
  characters/npcs/
  tiles/neighborhoods/
  backgrounds/
  ui/
  cards/
  icons/
  effects/
  fonts/
```

Prefer 16×16 or 32×32 modular tiles. Do not construct neighborhoods as single monolithic illustrations.

## Scene Layers

1. Foreground: interactive sprites, objects, signs, and prompts; highest contrast.
2. Midground: buildings, tracks, murals, fences, trees, and storefronts; moderate contrast.
3. Background: skyline, distant architecture, clouds, and atmosphere; lowest contrast and detail.

## Game Components

Reusable rendering components should include:

- `GameCanvas`
- `TileMap`
- `ParallaxLayer`
- `PlayerSprite`
- `NPCSprite`
- `HUD`
- `DialogueBox`
- `QuestWindow`
- `Inventory`
- `ACardPanel`
- `PixelButton`
- `MapTransition`
- `LevelIntro`
- `PauseMenu`
- `TitleScreen`

Components render engine state and emit player intent. They never mutate progress directly.

## UI Rules

- Use black or deep-navy panels, one- or two-pixel borders, hard shadows, and high-contrast text.
- Use no translucent glass, rounded SaaS cards, floating pills, or smooth gradients.
- Use no more than two readable pixel-font families.
- Keep dialogue to two–four short lines with a small advance indicator.
- Prefer cartridge language: `CHALLENGE`, `CLUE`, `OBJECTIVE`, `TRY AGAIN`, `LEVEL COMPLETE`, and `A-CARD EARNED`.

## Palette and Lighting

Build local palettes from near-black, deep navy, plum, magenta, coral, burnt orange, sun yellow, cyan, violet, Atlanta greens, brick, concrete, and warm off-white. Use two–four value steps per object, hard bands, clusters, and intentional dithering instead of smooth gradients.

Golden hour is the signature state. Bright day, evening/neon, and localized interior lighting may support neighborhood identity.

## Animation

- Use short two–six-frame loops at roughly 6–12 FPS.
- Favor clear key poses and exaggerated anticipation over fluid tweening.
- Approved effects include pixel particles, palette flashes, one–three-pixel screen shake, blink states, hard wipes, and sprite squash frames.

## Visual QA Checklist

- Pixel edges remain crisp at every supported size.
- Foreground interaction reads more clearly than scenery.
- The player silhouette is immediately recognizable.
- Every environment includes specific Atlanta truth, not landmark wallpaper.
- Every neighborhood remains identifiable without its text label.
- UI resembles a console game rather than a website.
- The screen supports the current gameplay objective.
