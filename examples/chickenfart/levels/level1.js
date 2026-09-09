import * as Player from "../src/entities/Player.js";
import * as world from "@chickenfart/engine/world";
// import * as Rabbit from "../src/entities/Rabbit.js";
import * as Orc from "../src/entities/Orc.js";
// import * as Samurai from "../src/entities/Samurai.js";
// import { Entity } from "../src/EntitiesFactory.js";
// import * as Crystal from "../src/entities/Crystal.js";w
import { getEntityByTag } from "@chickenfart/engine/world";
import { setCamPos, setFollowSpeed } from "@chickenfart/engine/canvas";


export async function run() {

    let player = getEntityByTag("player");
    let cube = getEntityByTag("cube");

    if (player) {
        setCamPos(player.x, player.y);
    }

    setFollowSpeed(0.001);
}