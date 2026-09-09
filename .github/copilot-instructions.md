# Copilot instructions for ChickenFart Engine

This package is the reusable engine behind the ChickenFart game project.

## Read first
- `package.json`
- `src/index.js`
- `src/world.js`
- `src/entitiesFactory.js`

## Goals
- Keep the engine small, clean, and reusable.
- Preserve the package import boundary.
- Do not mix gameplay logic into engine code.
- Prefer stable public APIs over hidden implementation details.

## Engine responsibilities
- world lifecycle
- entity registry
- input and canvas management
- collision and physics helpers
- sprite resource loading

## Game responsibilities
- entity behaviors specific to a game
- level configuration and logic
- player progression or win conditions
- project-specific rules and content

## Validation
Run the project build before finishing a change.
