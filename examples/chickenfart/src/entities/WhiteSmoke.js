import { Entity } from "@chickenfart/engine/entitiesFactory";
import ParticleSystem from "./ParticleSystem.js";
import { addEntity, removeEntity } from "@chickenfart/engine/world";

export async function create(x, y, lastFor) {

    let numParticles = 50;

    let smokeEntities = [];

    let removed = 0; //track how many smoke entities have been removed, so we know when to remove the particle system

    for (let i = 0; i < numParticles; i++) {
        let e = await Entity.create(x, y, "WhiteSmoke");
        e.blendMode = "hard-light";
        e.scale = 0;
        smokeEntities.push(e);
        addEntity(e);
    }

    let ps = new ParticleSystem(numParticles);
    ps.x = x;
    ps.y = y;
    ps.onDrawParticle = (ctx, p) => { }; //empty function, we will draw particles using smoke entities
    ps.gravity = 0;
    ps.speed = 0.15;
    ps.delay = 75;
    ps.maxParticleAge = 100;

    ps.onUpdateParticle = (p, dt) => {
        let e = smokeEntities[p.index];
        e.x = p.x;
        e.y = p.y;
        e.z = p.z;
        e.opacity = 1 - (p.age / ps.maxParticleAge);
        e.scale = 0.01 + (p.age / ps.maxParticleAge) * 2;
    }

    ps.onParticleDeath = (p) => {

        let e = smokeEntities[p.index];
        removeEntity(e);
        removed++;
        if (removed === smokeEntities.length) {
            removeEntity(ps);
        }
    }

    setTimeout(() => {
        ps.on = false;
    }, lastFor);

    ps.on = true;

    addEntity(ps);
}


export default { create };
