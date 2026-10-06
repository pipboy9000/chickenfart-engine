import * as canvas from "./canvas.js";
import { canvasGeometry } from "./canvas.js";

let lastWorldX = 0;
let lastWorldY = 0;
let clearDoubleClick = false;

/** Current held-down state per `event.code` (e.g. `keyboard.Space`), true while the key is down. */
export let keyboard = {};
/** True only on the single frame a key (by `event.code`) was pressed; cleared after each `draw()`. */
export let keyPressed = {};
/** True only on the single frame a mouse button (`left`/`middle`/`right`) was pressed; cleared after each `draw()`. */
export let mousePressed = {};

/** Current mouse/touch position and button state, in both screen and world coordinates. */
export let mouse = {
  x: 0,
  y: 0,
  dWorldX: 0,
  dWorldY: 0,
  worldX: 0,
  worldY: 0,
  left: false,
  right: false,
  middle: false,
  wheel: 0,
  doubleClick: false
};

/** Recomputes mouse world-space delta and resolves double-click state. Called once per frame before entity updates. */
export function update() {
  mouse.dWorldX = mouse.worldX - lastWorldX;
  mouse.dWorldY = mouse.worldY - lastWorldY;
  lastWorldX = mouse.worldX;
  lastWorldY = mouse.worldY;

  if (clearDoubleClick) {
    clearDoubleClick = false;
    mouse.doubleClick = false;
  }

  if (mouse.doubleClick) {
    clearDoubleClick = true;
  }

  getMousePos({ clientX: mouse.x, clientY: mouse.y });
}

/** Clears the per-frame `keyPressed`/`mousePressed` edge-trigger state. Called once per frame after rendering. */
export function draw() {
  keyPressed = {};
  mousePressed = {};
}

function getMousePos(evt) {

  const { scaleX, scaleY, left, top } = canvasGeometry;

  // Apply the scaling factor to the mouse coordinates
  const canvasX = (evt.clientX - left) * scaleX;
  const canvasY = (evt.clientY - top) * scaleY;

  mouse.worldX = canvasX - canvas.halfWidth + canvas.camPosX;
  mouse.worldY = canvasY - canvas.halfHeight + canvas.camPosY;
  mouse.x = evt.clientX;
  mouse.y = evt.clientY;

  // console.log(mouse.worldX,mouse.worldY);
}

function clearMouseWheel() {
  mouse.wheel = 0;
}

function getMouseWheel(evt) {
  var delta = Math.max(-1, Math.min(1, evt.wheelDelta || -evt.detail));
  mouse.wheel = delta;
  requestAnimationFrame(clearMouseWheel);
}

function mouseDown(evt) {
  switch (evt.button) {
    case 0:
      mouse.left = true;
      mousePressed.left = true;
      break;

    case 1:
      mouse.middle = true;
      mousePressed.middle = true;
      break;

    case 2:
      mouse.right = true;
      mousePressed.right = true;
  }
  return true;
}

function mouseUp(evt) {
  switch (evt.button) {
    case 0:
      mouse.left = false;
      break;

    case 1:
      mouse.middle = false;
      break;

    case 2:
      mouse.right = false;
  }
  return false;
}

/** Registers keyboard/mouse/touch DOM listeners. Called internally by `world.init`. */
export async function init() {
  document.addEventListener("keydown", function (event) {
    keyboard[event.code] = true;
    keyPressed[event.code] = true;
  });

  document.addEventListener("keyup", function (event) {
    keyboard[event.code] = false;
  });

  //mouse
  canvas.canvas.addEventListener(
    "mousemove",
    function (evt) {
      getMousePos(evt);
    },
    false
  );

  canvas.canvas.addEventListener(
    "mousewheel",
    function (evt) {
      getMouseWheel(evt);
    },
    false
  );

  canvas.canvas.addEventListener("dblclick", function () {
    mouse.doubleClick = true;
  });

  canvas.canvas.addEventListener("mousedown", mouseDown);
  canvas.canvas.addEventListener("mouseup", mouseUp);
  canvas.canvas.oncontextmenu = function (e) {
    e.preventDefault();
  };

  canvas.canvas.addEventListener("touchstart", function (evt) {
    evt.preventDefault();
    const touch = evt.touches[0];
    getMousePos(touch);
    mouseDown({ button: 0 });
  });

  canvas.canvas.addEventListener("touchmove", function (evt) {
    evt.preventDefault();
    const touch = evt.touches[0];
    getMousePos(touch);
  });
}
