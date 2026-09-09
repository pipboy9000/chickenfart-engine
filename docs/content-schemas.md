# Content JSON schemas

Reference for the JSON files a game project provides to the engine: entity
resources, floor tile resources, and level data. These are not validated by
the engine at runtime — malformed fields fail at load/draw time.

## Entity resource (`<entityResources>/<Name>/<Name>.json`)

Paired with a same-named sprite sheet PNG, loaded lazily by `Entity.create`.

```jsonc
{
  "width": 16,           // frame width in px (sprite sheet column size)
  "height": 16,          // frame height in px (sprite sheet row size)
  "anchorX": 8,          // draw origin offset from the frame's left edge
  "anchorY": 12,         // draw origin offset from the frame's top edge
  "states": ["idle", "walk", "fart"], // row order in the sprite sheet
  "animations": {
    "idle": { "length": 6 },          // number of frames in this state
    "walk": {
      "length": 8,
      "events": { "3": "step" }       // frame index -> onAnimationEvent name
    }
  },
  "collision": { "type": "circle", "...": "see below" } // optional
}
```

`collision.type` is one of `"circle"`, `"AABB"`, `"rhombus"`, `"ellipse"`.
Fields vary by type (all offsets/sizes are in unscaled sprite pixels; the
engine multiplies by the entity's `scale` at collision time):

| type      | fields |
|-----------|--------|
| `circle`  | `x`, `y` (offset from anchor), `rad` |
| `AABB`    | `x`, `y` (top-left offset from anchor), `width`, `height` |
| `rhombus` | `offsetX`, `offsetY`, `width`, `height`, `rotation` (radians), `scaleY` (flattening, default `0.5`) |
| `ellipse` | `offsetX`, `offsetY`, `rx`/`radX`/`radiusX`/`rad`, `ry`/`radY`/`radiusY`/`rad`, `rotation` (radians) |

If an entity has no `collision`, it never participates in collision checks.

## Floor tile resource (`<floorTiles>/<name>.json`)

Paired with a same-named tile-sheet PNG.

```jsonc
{
  "width": 256,     // tile-sheet image width in px
  "height": 384,    // tile-sheet image height in px
  "tileSize": 32    // square source tile size in px
}
```

## Level data (`<levels>/<level>.json`)

Loaded by `world.loadLevel(level)`, paired with a same-named `<level>.js`
exporting `async function run()` for level-specific setup (camera, spawns).

```jsonc
{
  "entities": [
    {
      "name": "Chicken",      // resource name; also used to look up <name>.js
                               // under entityScripts (falls back to a plain Entity if none)
      "x": 9, "y": 356.5,      // world position
      "rot": 0,                // radians
      "scale": 1,
      "isFloorItem": true,     // draws under regular entities (decals, ground clutter)
      "isStatic": false,       // registered as an immovable collision wall instead of an entity
      "tag": "player"          // optional; overrides the entity script's own tag if set
    }
  ],
  "floorTiles": [
    {
      "name": "grass",         // matches a floor tile resource
      "tiles": {
        "0,0": { "x": 0, "y": 0, "sx": 0, "sy": 160 } // world pos + source rect (sx, sy) in the tile sheet
      }
    }
  ],
  "settings": {
    "width": 1888, "height": 1696,       // world size, see canvas.setWorldSize
    "tilesSkewX": 0, "tilesSkewY": 0,     // floor tile shear, see canvas.setSkew
    "scaleX": 1, "scaleY": 0.5,           // floor tile transform, see canvas.setFloorTilesTransform
    "translateX": 20, "translateY": -230,
    "rotation": 45,
    "viewLimits": { "left": -400, "right": 380, "top": 60, "bottom": 660 } // camera clamp, see canvas.setViewLimits
  }
}
```

An entity entry with a matching `<name>.js` script gets `create(x, y)` called
and owns its own `tag`/lifecycle hooks; one without a script is instantiated
as a plain `Entity` and added as a floor item, static wall, or regular entity
based on `isFloorItem`/`isStatic`.
