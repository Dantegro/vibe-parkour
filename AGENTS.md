# AGENTS.md

Instructions for coding agents working in this repository.

## Overview

Browser-based **open-world horror game** built with **Three.js**, bundled by **Vite**, written in **TypeScript**. The current prototype is a first-person scene: pointer-lock camera, WASD movement, procedural terrain, and placeholder geometry. Gameplay systems (combat, AI, networking, assets) are not implemented yet.

## Commands

Use **pnpm** (lockfile: `pnpm-lock.yaml`).

| Action | Command |
|--------|---------|
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` |
| Typecheck + build | `pnpm build` |
| Preview production build | `pnpm preview` |

There is no test runner or linter script configured yet. After meaningful changes, run `pnpm build` to verify TypeScript and the Vite bundle.

## Project layout

```
index.html          # Canvas mount point (#game)
src/
  main.ts           # Entry: renderer, game loop, resize/HMR lifecycle
  scene.ts          # World setup (lights, terrain, props)
  controls.ts       # FPS camera + PointerLockControls + input
  style.css         # Unused Vite template styles (not imported today)
  counter.ts        # Unused Vite template helper
  assets/           # Static assets
dist/               # Build output (gitignored)
personal/           # Private notes (gitignored — do not read or commit)
```

Prefer growing the game by **wiring and extending** `scene.ts` and `controls.ts` from `main.ts`, rather than keeping all logic in one file.

## Architecture

### Entry and loop

- `main.ts` owns the **WebGLRenderer**, **requestAnimationFrame** loop, window resize, and Vite HMR cleanup.
- Scene content belongs in `scene.ts` (export factory functions that return meshes/scene graphs).
- Player input and camera belong in `controls.ts` (export an API with `updateMovement(delta)` and `dispose()`).
- Movement must be **delta-time based** (`delta` in seconds from `performance.now()`), not per-frame constants.

### Three.js conventions

- Import the core library as `import * as THREE from "three"`.
- Import addons from `three/examples/jsm/...` with the **`.js` extension** (required by `verbatimModuleSyntax`).
- Reuse `THREE.Vector3` instances in the game loop instead of allocating each frame.
- On teardown (HMR `dispose`, scene unload), call `renderer.dispose()`, `controls.disconnect()`, and dispose geometries/materials you create.
- Cap `renderer.setPixelRatio` (currently `Math.min(devicePixelRatio, 2)`) for performance on high-DPI displays.
- The game canvas is `#game` in `index.html`; renderer DOM element is full-viewport (`position: fixed`).

### UI and input

- **Pointer lock** is required for look/move; an overlay prompts the user to click before locking.
- Keyboard state uses `event.code` (e.g. `KeyW`, `KeyA`) for layout-independent bindings.
- Do not add frameworks (React, etc.) unless explicitly requested — keep the stack vanilla TS + Three.js.

## TypeScript

`tsconfig.json` enforces:

- `verbatimModuleSyntax` — use `import type` for type-only imports; extensioned ESM paths for Three addons.
- `noUnusedLocals` / `noUnusedParameters` — remove dead code.
- `erasableSyntaxOnly` — no `enum` or `namespace`; prefer unions and `const` objects.
- Exhaustive `switch` on unions: use a `never` check in the `default` case.

Keep imports at the **top of the file**; avoid inline imports unless breaking a documented circular dependency.

## Making changes

1. **Minimize scope** — match existing style; don't refactor unrelated code.
2. **No secrets** — never commit API keys, tokens, or `.env` values.
3. **No debug instrumentation** — remove temporary logging, localhost ingest calls, and `localStorage` debug buffers before finishing unless the user asked for them.
4. **Don't touch `personal/`** — it is gitignored and out of scope.
5. **Don't commit** unless the user explicitly asks.
6. **Verify** — run `pnpm build` after non-trivial edits.

## Performance and game feel

- Target 60 FPS on mid-range hardware; profile before adding heavy post-processing or high-poly assets.
- Prefer instancing or merged geometry for many repeated props (buildings, foliage).
- Use fog and draw-distance (`camera.far`) intentionally — the scene already uses `FogExp2`.
- Audio, physics (e.g. Rapier), and asset loading are future concerns; introduce them in dedicated modules when needed.

## Future direction

The game is intended to evolve into an **open-world horror** experience. When adding features, favor small, testable modules (e.g. `src/world/`, `src/player/`, `src/systems/`) over a growing monolith in `main.ts`.
