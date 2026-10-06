// Public API surface of @chickenfart/engine. Prefer importing submodules
// directly (e.g. "@chickenfart/engine/world") over this barrel file.
export * as world from "./world.js"; // entity registry, level loading, game loop
export * as canvas from "./canvas.js"; // rendering, camera, floor tiles
export * as collision from "./collision.js"; // shape intersection and MTV resolution
export * as input from "./input.js"; // keyboard/mouse state
export { Entity } from "./entitiesFactory.js"; // sprite-backed entity base class
export { Sound } from "./Sound.js"; // spatial audio playback
export * as utils from "./utils.js"; // math, random, color, and geometry utilities
export { ParticleSystem } from "./ParticleSystem.js"; // particle system component