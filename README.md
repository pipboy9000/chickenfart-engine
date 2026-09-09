# ChickenFart Engine

A small canvas-based 2D game engine built for lightweight game creation and AI-assisted content generation.

## Package goals
- keep the engine small and composable
- separate engine responsibilities from game logic
- make it easy to import and extend from a game project
- provide a predictable API for AI tools and human authors

## Install / import
This package is intended to be consumed via its package name:

```js
import * as world from "@chickenfart/engine/world";
import { Entity } from "@chickenfart/engine/entitiesFactory";
```

## Core concepts
### World
The world owns the active entity list and manages updates, collisions, and level loading.

### Entity
Entities are created from sprite resources and can be extended with lifecycle hooks:
- `onStart`
- `onUpdate`
- `onCollision`
- `onAnimationEvent`
- `onDraw`

### Level loading
Game projects can load level data and scripts using:

```js
await world.init({
  canvas: "canvas",
  pixelation: 2,
  paths: {
    levels: "levels/",
    levelScripts: "levels/",
    entityScripts: "src/entities/",
    entityResources: "src/entities/resources/",
    floorTiles: "src/floorTiles/"
  }
});

await world.loadLevel("level1");
```

## Minimal entity pattern

```js
import { Entity } from "@chickenfart/engine/entitiesFactory";
import { addEntity } from "@chickenfart/engine/world";

export async function create(x, y) {
  const entity = await Entity.create(x, y, "AssetName");
  entity.tag = "example";

  entity.onUpdate = (dt) => {
    entity.x += 1;
  };

  addEntity(entity);
  return entity;
}
```

## AI authoring guidance
When creating or editing gameplay content using this engine:
- keep engine code under `src/` in the package
- keep gameplay-specific logic in the importing project
- prefer building from nearby examples instead of inventing new patterns
- preserve the public API and import paths
- validate changes with the project build command

## File responsibilities
- `src/world.js` — world and entity lifecycle
- `src/entitiesFactory.js` — entity creation and sprite animations
- `src/collision.js` — collision detection
- `src/canvas.js` — canvas and camera
- `src/input.js` — keyboard and mouse state
- `src/floorTiles.js` — floor tile setup and loading

## Content JSON schemas
See [`docs/content-schemas.md`](docs/content-schemas.md) for the entity
resource, floor tile resource, and level JSON formats consumed by the engine.

## License
MIT — see [`LICENSE`](LICENSE).

## Publishing note
This package is designed to be uploadable to its own GitHub repository and imported by a game project as a package dependency.

## Complete example

[`examples/chickenfart/`](examples/chickenfart/) is a complete Level 1 game
project, including its entity scripts, sprite resources, floor tiles, sound
effects, and UI assets. To run it from this repository:

```sh
cd examples/chickenfart
npm install
npm run dev
```

The example depends on the engine through `file:../..` and keeps all gameplay
logic outside the engine's `src/` directory.
