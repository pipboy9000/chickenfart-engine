# ChickenFart Example Game

This is a complete game project that uses `@chickenfart/engine`. It starts
Level 1 from `index.html` and includes the game entities, sprite resources,
floor tiles, sounds, UI files, and Font Awesome assets required at runtime.

## Run locally

From this directory:

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Use the arrow keys to move the chicken and press
Space to jump.

## Project layout

- `src/` contains the game startup code and entity behavior.
- `src/entities/resources/` contains the sprite sheets and metadata.
- `src/floorTiles/` contains the floor tile images and metadata.
- `levels/` contains the Level 1 data and level script.
- `sounds/` and `font-awesome-4.7.0/` contain additional runtime assets.

The example imports engine APIs through `@chickenfart/engine/...`. Its local
package dependency points to the engine root so it also works while developing
this repository.