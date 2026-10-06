// Sound.js - Sound engine with spatial audio for the game engine
// Usage: let sounds = await Sound.create({sound1: 'path', ...}, soundSource)


import * as world from "./world.js";

/**
 * Plays sound effects with distance-based volume and stereo panning relative to the camera.
 * Auto-registers with the world so `update()` is called every frame; usually created once
 * per sound-emitting entity and passed that entity as `soundSource`.
 */
export class Sound {
    /**
     * @param {object} audioMap - Preloaded `{ name: { buffer } }` entries; prefer `Sound.create`.
     * @param {{x: number, y: number}} soundSource - Object whose x/y is read every frame for panning.
     */
    constructor(audioMap, soundSource) {
        this.audioMap = audioMap; // { name: { buffer, nodes... } }
        this.soundSource = soundSource; // { x, y }
        this.playing = new Map(); // name -> array of { source, gain, panner }
        // Automatically register with world sound system
        if (typeof world.addSoundObject === "function") {
            world.addSoundObject(this);
        }
    }

    /**
     * Fetches and decodes each sound URL, then returns a ready-to-play `Sound` instance.
     * @param {Object<string, string>} soundsObj - Map of sound name to audio file URL.
     * @param {{x: number, y: number}} soundSource - Emitter position, tracked for spatial audio.
     */
    static async create(soundsObj, soundSource) {
        const ctx = Sound.getAudioContext();
        const audioMap = {};
        for (const [name, url] of Object.entries(soundsObj)) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await ctx.decodeAudioData(arrayBuffer);
            audioMap[name] = { buffer };
        }
        // Instantiation will auto-register with world
        return new Sound(audioMap, soundSource);
    }

    /** Plays the sound registered under `name`. No-op if `name` wasn't loaded via `create`. */
    play(name) {
        const ctx = Sound.getAudioContext();
        const entry = this.audioMap[name];
        if (!entry) return;
        const source = ctx.createBufferSource();
        source.buffer = entry.buffer;
        const gain = ctx.createGain();
        const panner = ctx.createStereoPanner();
        source.connect(gain).connect(panner).connect(ctx.destination);
        source.start();
        if (!this.playing.has(name)) this.playing.set(name, []);
        this.playing.get(name).push({ source, gain, panner });
        // Remove from playing when ended
        source.onended = () => {
            this.playing.set(name, this.playing.get(name).filter(obj => obj.source !== source));
        };
    }

    /** Recomputes pan/volume for all currently playing instances based on distance from the camera. Called every frame by `world.js`. */
    update(camX, camY, screenW, screenH) {
        // Adjust volume and panning for all playing sounds
        for (const [name, arr] of this.playing.entries()) {
            for (const obj of arr) {
                const dx = this.soundSource.x - camX;
                const dy = this.soundSource.y - camY;
                // Panning: -1 (left) to 1 (right)
                let pan = Math.max(-1, Math.min(1, dx / (screenW / 2)));
                obj.panner.pan.value = pan;
                // Volume: fade out as distance increases
                const dist = Math.sqrt(dx*dx + dy*dy);
                let maxDist = Math.max(screenW/2, screenH/2);
                let vol = Math.max(0.05, 1 - dist / maxDist);
                obj.gain.gain.value = vol;
            }
        }
    }

    /** Returns a shared, lazily-created `AudioContext` for the page. */
    static getAudioContext() {
        if (!window._audioCtx) {
            window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return window._audioCtx;
    }
}
