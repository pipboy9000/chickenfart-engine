import { Entity } from "@chickenfart/engine/entitiesFactory";
import { getEntityByTag,removeEntity } from "@chickenfart/engine/world";

export async function create(x, y) {

    let entity = await Entity.create(x, y, "Crystal");

    let player;

    let vx = Math.random() * 10 - 5;
    let vy = Math.random() * 10 - 5;
    let vz = Math.random() * 2 + 2;
    
    entity.onMount = () => {
        player = getEntityByTag("player");
    }

    entity.onAnimationEvent = (eventName) => {
        if (eventName === "end") {
            removeEntity(entity);
        }
    }

    entity.onUpdate = () => {
        entity.x += vx;
        entity.y += vy;
        entity.z += vz;

        vx *= 0.9;
        vy *= 0.9;

        //bounce
        if (entity.z > 0) {
            vz -= 0.2;
        } else {
            entity.z = 0;
            vz *= -0.6;

            if (Math.abs(vz) < 0.05) {
                vz = 0;
            }
        }

        //if close enough
        const dist = Math.hypot(player.y - entity.y, player.x - entity.x);

        if (dist < 100) {
            let dirToPlayer = Math.atan2(player.y - entity.y, player.x - entity.x);
            vx += Math.cos(dirToPlayer) * 0.3;
            vy += Math.sin(dirToPlayer) * 0.3;
        }

        if (dist < 30) {
            entity.setState("pickup")
        }
    }

    return entity;
}