import * as world from "@chickenfart/engine/world";
import * as interfaceController from "../src/interfaceController.js";

window.onload = async function () {

    await interfaceController.init(newGame);

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

    await world.loadLevel("level1", onLoadingProgress);

    function onLoadingProgress(progress) {
        console.log(`Loading progress: ${Math.round(progress * 100)}%`);
        // interfaceController.setLoadingProgress(progress);
    }

    function newGame() {

        interfaceController.fadeOut(500);

        setTimeout(async () => {
            interfaceController.hideMenu();
            await world.loadLevel("level1", onLoadingProgress);
            interfaceController.fadeIn(500);
        }, 500);
    }
}
