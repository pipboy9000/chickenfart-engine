# ChickenFart Engine AI Agent Instructions

## Purpose
This package is the reusable 2D canvas game engine behind the ChickenFart project. It is designed to be imported by game projects and extended by AI tools.

## Package boundary
The engine package should stay focused on engine responsibilities:
- world lifecycle and entity registry
- canvas and rendering
- input handling
- collision systems
- entity creation and animation
- assets and resource loading

Game-specific logic belongs in the consuming project, not in this package.

## Entry points
Read these files first when making engine changes:
- `package.json` — package metadata and exports
- `src/index.js` — public API surface
- `src/world.js` — lifecycle, entity management, and level loading
- `src/entitiesFactory.js` — entity creation and sprite animation
- `src/collision.js` — collision logic and hit detection

## Public API contract
The engine should expose a small, stable surface for game authors:
- `world.init(...)`
- `world.loadLevel(...)`
- `world.addEntity(entity)`
- `world.addStaticEntity(entity)`
- `world.removeEntity(entity)`
- `world.getEntityByTag(tag)`
- `world.checkCircleCollision(...)` / `world.checkSegmentCollision(...)` — hit-test queries (e.g. attacks, raycasts) without physically moving entities
- `Entity.create(x, y, assetName)`
- `Sound.create(sounds, source)` / `sound.play(name)` — spatial audio tied to an entity's position
- `canvas` helpers
- `input` helpers

## Entity authoring contract
For gameplay entities in a consuming project:
1. Export `async function create(x, y, ...)` from the entity module.
2. Build the instance using `await Entity.create(x, y, "AssetName")`.
3. Set `entity.tag` for lookup via `world.getEntityByTag(tag)`.
4. Attach `entity.onUpdate`, `entity.onCollision`, `entity.onStart`, or `entity.onAnimationEvent` when introducing behavior.
5. Add entities with `world.addEntity(...)` or static collisions with `world.addStaticEntity(...)`.

## Content schemas
See [`docs/content-schemas.md`](docs/content-schemas.md) for the entity
resource, floor tile resource, and level JSON formats.

## Rules for AI-assisted work
- Prefer focused, small changes.
- Preserve the package export pattern.
- Do not leak project-specific gameplay logic into engine code.
- Favor the existing engine conventions over adding abstraction layers.
- Keep API additions clear and discoverable.
- Document new hooks or lifecycle behaviors in the package docs.

## Validation
Before finishing an engine change, run:
- `npm run build`

This is the package validation path for the project that consumes the engine.
