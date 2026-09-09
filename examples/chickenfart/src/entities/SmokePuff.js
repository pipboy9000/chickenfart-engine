import { Entity } from "@chickenfart/engine/entitiesFactory";
import { removeEntity } from "@chickenfart/engine/world";

export async function create(x, y) {

    let entity = await Entity.create(x, y, "SmokePuff");

    entity.animFrameDelay = 1000;

    let vx = Math.random() * 0.5 - 0.25;
    let vy = Math.random() * 0.5 - 0.25;
    let vz = 0.2;
    let age = 0;

    entity.onUpdate = () => {
        entity.x += vx;
        entity.y += vy;
        entity.z += vz;
        entity.rot += vx / 10;
        entity.scale += 0.01;
        entity.opacity = (150 - age) / 150;
        age++;

        if (age > 150) {
            removeEntity(entity);
        }
    }


    return entity;
}