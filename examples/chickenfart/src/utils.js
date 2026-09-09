function getRandomHexColor() {
    // Generate a random number between 0 and 16777215 (which is 0xFFFFFF).
    const randomColor = Math.floor(Math.random() * 16777215);

    // Convert the number to a hexadecimal string.
    let hexString = randomColor.toString(16);

    // Pad the string with leading zeros if it's less than 6 characters long.
    // This ensures we always get a 6-digit hex code.
    while (hexString.length < 6) {
        hexString = "0" + hexString;
    }

    // Prepend the '#' symbol to the hex string and return it.
    return "#" + hexString;
}

export function getEntitiesDistance(entityA, entityB) {
    const dx = entityA.x - entityB.x;
    const dy = entityA.y - entityB.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function getEntitiesDistanceSqr(entityA, entityB) {
    const dx = entityA.x - entityB.x;
    const dy = entityA.y - entityB.y;
    return dx * dx + dy * dy;
}

/**
 * Creates a seeded pseudo-random number generator (sfc32 algorithm).
 * @param {string} seedString - The string used to initialize the generator.
 * @returns {function(): number} - A function that returns a repeatable random number (0 <= x < 1).
 */
export class SeededRandom {
    // Static property to hold the single instance
    static instance = null;

    // Static property to track the current seed in use
    static currentSeed = null;

    randomFunction;

    // The constructor remains the internal builder for a new RNG instance
    constructor(seedString) {
        // --- Setup your internal state variables (a, b, c, d) and the mash function ---
        function mash(data) {
            let n = 0xefc8249d;
            for (let i = 0; i < data.length; i++) {
                n += data.charCodeAt(i);
                let h = 0.02519603282416938 * n;
                n = h >>> 0;
                h -= n;
                h *= n;
                n = h >>> 0;
                h *= 9.375477040683075e-10;
            }
            return n;
        }

        let seed = mash(seedString);
        let a = seed;
        let b = seed;
        let c = seed;
        let d = 1;

        // The generator (closure to capture a, b, c, d)
        this.randomFunction = function () {
            a |= 0; b |= 0; c |= 0; d |= 0;
            let t = (a + b) | 0;
            a = b ^ b >>> 9;
            b = c + (c << 3) | 0;
            c = (c << 21 | c >>> 11);
            d = d + 1 | 0;
            t = t + d | 0;
            c = c + t | 0;
            return (t >>> 0) / 4294967296;
        };
    }

    // --- Core Methods ---

    /**
     * Gets the current SeededRandom instance. 
     * Creates a new instance if a different seedString is provided or if it's the first call.
     * @param {string} [seedString] - The seed to use for initialization/re-seeding.
     * @returns {SeededRandom} The single instance of the generator.
     */
    static getInstance(seedString, reset = false) {
        const isNewSeed = reset || (seedString !== undefined && seedString !== SeededRandom.currentSeed);

        // 1. Initial creation or Explicit Re-seeding with a new value
        if (!SeededRandom.instance || isNewSeed) {
            if (seedString === undefined) {
                // If it's the first call and no seed is provided, throw an error.
                if (!SeededRandom.instance) {
                    throw new Error("SeededRandom must be initialized with a seed string on the first call.");
                }
                // If the instance exists but someone calls getInstance() without a seed, 
                // just return the existing one (handled below).
            } else {
                // Create a new instance and update the static trackers
                SeededRandom.instance = new SeededRandom(seedString);
                SeededRandom.currentSeed = seedString;

                if (isNewSeed) {
                    console.log(`SeededRandom automatically reset with new seed: "${seedString}"`);
                }
            }
        }

        // 2. Return the existing instance (applies to standard usage)
        return SeededRandom.instance;
    }

    // Public method to expose the generator's result
    next() {
        if (!this.randomFunction) {
            // This case should theoretically not happen if getInstance is used correctly,
            // but it's a safe guard.
            throw new Error("Cannot call next() before the generator has been initialized with a seed.");
        }
        return this.randomFunction();
    }

    // Convenience methods
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    static getCurrentSeed() {
        return SeededRandom.currentSeed;
    }
}

export function valueToRedToGreen(value) {
    // 1. Clamp the value between 0 and 1
    const clampedValue = Math.min(1, Math.max(0, value));

    let red;
    let green;
    const blue = 0; // Blue is always 0 for pure Red-Yellow-Green

    if (clampedValue < 0.5) {
        // Stage 1: Red (0) to Yellow (0.5)
        // Red is fixed at 255 (FF)
        red = 255;

        // Green goes from 0 to 255. We scale the value from [0, 0.5] to [0, 1]
        // by multiplying by 2.
        green = Math.round(clampedValue * 2 * 255);
    } else {
        // Stage 2: Yellow (0.5) to Green (1)
        // Green is fixed at 255 (FF)
        green = 255;

        // Red goes from 255 to 0. We scale the value from [0.5, 1] to [0, 1]
        // by subtracting 0.5, then multiplying by 2.
        const scaledValue = (clampedValue - 0.5) * 2;
        red = Math.round((1 - scaledValue) * 255);
    }

    // Helper to convert number to two-digit hex string
    const toHex = (c) => {
        const hex = Math.max(0, Math.min(255, c)).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };

    // Combine the hex components
    return "#" + toHex(red) + toHex(green) + toHex(blue);
}

export function createPerpendicularLine(x1, y1, x2, y2, length, t = 0.5) {
    // 1. Calculate the vector of the input line (V)
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Calculate the magnitude (length) of the input line
    const magnitudeV = Math.sqrt(dx * dx + dy * dy);

    // Handle the case where the input line is just a point
    if (magnitudeV === 0) {
        console.error("Input line is a point (magnitude is zero). Cannot determine a unique perpendicular direction.");
        return null;
    }

    // 2. Find the normalized perpendicular vector (U)
    // The perpendicular vector (P) is (-dy, dx).
    // The normalized unit vector (U) is P divided by the magnitude of V.
    const Ux = -dy / magnitudeV;
    const Uy = dx / magnitudeV;

    // 3. Find the Center Point (C) on the input line using LERP
    // Cx = x1 + t * dx
    // Cy = y1 + t * dy
    const Cx = x1 + t * dx;
    const Cy = y1 + t * dy;

    // 4. Calculate the Endpoints of the New Line (P'1, P'2)
    // The new line extends half its desired length (hL) in both directions along U.
    const hL = length / 2;

    const x1_prime = Cx - hL * Ux;
    const y1_prime = Cy - hL * Uy;

    const x2_prime = Cx + hL * Ux;
    const y2_prime = Cy + hL * Uy;

    // Return the new line segment's coordinates
    return {
        x1: x1_prime,
        y1: y1_prime,
        x2: x2_prime,
        y2: y2_prime
    };
}